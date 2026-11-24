import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { generatedRecipeSchema, type GeneratedRecipe } from "@cookai/shared";
import { buildUserPrompt, SYSTEM_PROMPT, validateRecipe } from "../prompt.js";
import { AiGenerationError, type GenerationRequest, type RecipeGenerator } from "../types.js";

/**
 * Models that accept server-side refusal fallbacks (`fallbacks: "default"`).
 * When the main model declines, the API retries on a suitable model in the same call.
 */
const FALLBACK_CAPABLE = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"]);

export class AnthropicGenerator implements RecipeGenerator {
  readonly provider = "anthropic" as const;
  readonly ready: boolean;
  private readonly client: Anthropic | null;

  constructor(
    readonly model: string,
    apiKey: string | undefined,
    timeoutMs: number,
    private readonly effort?: "low" | "medium" | "high",
  ) {
    this.ready = Boolean(apiKey);
    this.client = apiKey ? new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 }) : null;
  }

  async generate(req: GenerationRequest): Promise<GeneratedRecipe> {
    if (!this.client) throw new AiGenerationError("ANTHROPIC_API_KEY is not set");
    const useFallbacks = FALLBACK_CAPABLE.has(this.model);

    let response;
    try {
      response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(req, { includeShape: false }) }],
        output_config: {
          format: betaZodOutputFormat(generatedRecipeSchema),
          ...(this.effort ? { effort: this.effort } : {}),
        },
        ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
    } catch (cause) {
      if (cause instanceof Anthropic.AuthenticationError) {
        throw new AiGenerationError("Anthropic rejected the API key (check ANTHROPIC_API_KEY)", { cause });
      }
      if (cause instanceof Anthropic.RateLimitError) {
        throw new AiGenerationError("Anthropic rate limit reached; try again shortly", { cause });
      }
      if (cause instanceof Anthropic.APIError) {
        throw new AiGenerationError(`Anthropic request failed: ${cause.status ?? ""} ${cause.message}`.trim(), { cause });
      }
      throw new AiGenerationError(`Anthropic request failed: ${String(cause)}`, { cause });
    }

    if (response.stop_reason === "refusal") {
      throw new AiGenerationError("Claude declined to write this recipe; try different ingredients or notes");
    }
    if (response.stop_reason === "max_tokens") {
      throw new AiGenerationError("Claude's answer was cut off before the recipe was complete");
    }
    if (!response.parsed_output) {
      throw new AiGenerationError("Claude's answer didn't match the recipe format");
    }
    // Re-run our own validation to filter tags to the allowed list.
    return validateRecipe(response.parsed_output, req.allowedTags);
  }
}
