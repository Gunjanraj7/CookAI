import type { AiProviderName, GeneratedRecipe } from "@cookai/shared";

/** Everything a provider needs to write one recipe. */
export interface GenerationRequest {
  ingredients: string[];
  diet?: string;
  cuisine: string;
  notes?: string;
  /** Diet tag slugs the recipe may be labelled with (read from the database). */
  allowedTags: string[];
}

export interface RecipeGenerator {
  readonly provider: AiProviderName;
  readonly model: string;
  /** False when the provider can't run, e.g. its API key isn't set. */
  readonly ready: boolean;
  generate(request: GenerationRequest): Promise<GeneratedRecipe>;
}

/** The provider ran but its answer was unusable (bad JSON, refusal, timeout...). */
export class AiGenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiGenerationError";
  }
}
