import { GoogleGenAI } from "@google/genai";
import type { GeneratedRecipe } from "@cookai/shared";
import { buildUserPrompt, parseRecipeJson, SYSTEM_PROMPT } from "../prompt.js";
import { AiGenerationError, type GenerationRequest, type RecipeGenerator } from "../types.js";

export class GeminiGenerator implements RecipeGenerator {
  readonly provider = "gemini" as const;
  readonly ready: boolean;
  private readonly client: GoogleGenAI | null;

  constructor(
    readonly model: string,
    apiKey: string | undefined,
    timeoutMs: number,
  ) {
    this.ready = Boolean(apiKey);
    this.client = apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } }) : null;
  }

  async generate(req: GenerationRequest): Promise<GeneratedRecipe> {
    if (!this.client) throw new AiGenerationError("GEMINI_API_KEY is not set");

    const response = await this.client.models
      .generateContent({
        model: this.model,
        contents: buildUserPrompt(req, { includeShape: true }),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      })
      .catch((cause: unknown) => {
        throw new AiGenerationError(`Gemini request failed: ${errorMessage(cause)}`, { cause });
      });

    const text = response.text;
    if (!text) {
      const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? "no text";
      throw new AiGenerationError(`Gemini returned no recipe (${reason})`);
    }
    return parseRecipeJson(text, req.allowedTags);
  }
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
