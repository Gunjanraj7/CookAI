import OpenAI from "openai";
import type { GeneratedRecipe } from "@cookai/shared";
import { buildUserPrompt, parseRecipeJson, SYSTEM_PROMPT } from "../prompt.js";
import { AiGenerationError, type GenerationRequest, type RecipeGenerator } from "../types.js";

export class OpenAiGenerator implements RecipeGenerator {
  readonly provider = "openai" as const;
  readonly ready: boolean;
  private readonly client: OpenAI | null;

  constructor(
    readonly model: string,
    apiKey: string | undefined,
    timeoutMs: number,
  ) {
    this.ready = Boolean(apiKey);
    this.client = apiKey ? new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 1 }) : null;
  }

  async generate(req: GenerationRequest): Promise<GeneratedRecipe> {
    if (!this.client) throw new AiGenerationError("OPENAI_API_KEY is not set");

    const completion = await this.client.chat.completions
      .create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(req, { includeShape: true }) },
        ],
      })
      .catch((cause: unknown) => {
        const message = cause instanceof OpenAI.APIError ? `${cause.status ?? ""} ${cause.message}` : String(cause);
        throw new AiGenerationError(`OpenAI request failed: ${message.trim()}`, { cause });
      });

    const choice = completion.choices[0];
    if (choice?.message.refusal) throw new AiGenerationError(`OpenAI declined: ${choice.message.refusal}`);
    if (!choice?.message.content) throw new AiGenerationError(`OpenAI returned no recipe (${choice?.finish_reason ?? "empty"})`);
    return parseRecipeJson(choice.message.content, req.allowedTags);
  }
}
