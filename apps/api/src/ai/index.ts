/** Picks the recipe generator named by AI_PROVIDER. */
import { config } from "../config/env.js";
import { AnthropicGenerator } from "./providers/anthropic.js";
import { GeminiGenerator } from "./providers/gemini.js";
import { MockGenerator } from "./providers/mock.js";
import { OpenAiGenerator } from "./providers/openai.js";
import type { RecipeGenerator } from "./types.js";

export function createGenerator(ai = config.ai): RecipeGenerator {
  switch (ai.provider) {
    case "gemini":
      return new GeminiGenerator(ai.model, ai.keys.gemini, ai.timeoutMs);
    case "openai":
      return new OpenAiGenerator(ai.model, ai.keys.openai, ai.timeoutMs);
    case "anthropic":
      return new AnthropicGenerator(ai.model, ai.keys.anthropic, ai.timeoutMs, ai.effort);
    case "mock":
      return new MockGenerator(ai.model);
  }
}

export { AiGenerationError, type GenerationRequest, type RecipeGenerator } from "./types.js";
