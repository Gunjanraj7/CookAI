/** The prompt every provider sends, and the parser every JSON answer goes through. */
import { DIFFICULTIES, generatedRecipeSchema, type GeneratedRecipe } from "@cookai/shared";
import { AiGenerationError, type GenerationRequest } from "./types.js";

export const SYSTEM_PROMPT = `You are a home-cooking recipe developer. You write practical recipes that a home cook can follow on a weeknight with ordinary kitchen equipment.

Rules:
- Build the dish around the ingredients the cook has. You may add common pantry staples (salt, oil, water, basic spices) and at most three other ingredients.
- Quantities are decimal numbers (0.5, not 1/2). Use null for "to taste" amounts and put the description in "unit".
- Write 6 to 15 clear steps, one action per step, with heat levels and times where they matter.
- prepMinutes is the total time from start to serving. caloriesPerServing is your best estimate.
- Only use dietaryTags from the allowed list, and only when the recipe truly qualifies.
- Do not invent links, image URLs or video URLs.`;

/** Plain-language description of the JSON shape, for providers without schema enforcement. */
const JSON_SHAPE = `{
  "name": string,
  "summary": string (one sentence),
  "cuisine": string,
  "difficulty": ${DIFFICULTIES.map((d) => `"${d}"`).join(" | ")},
  "prepMinutes": integer,
  "servings": integer,
  "caloriesPerServing": integer,
  "dietaryTags": string[],
  "ingredients": [{ "name": string, "quantity": number | null, "unit": string | null }],
  "instructions": string[]
}`;

export function buildUserPrompt(req: GenerationRequest, { includeShape }: { includeShape: boolean }): string {
  const lines = [
    `Ingredients I have: ${req.ingredients.join(", ")}.`,
    `Cuisine: ${req.cuisine}.`,
    req.diet ? `The recipe must be suitable for this diet: ${req.diet}.` : null,
    req.notes ? `Extra wishes from the cook: ${req.notes}` : null,
    `Allowed dietaryTags: ${req.allowedTags.length ? req.allowedTags.join(", ") : "(none)"}.`,
    includeShape ? `\nReply with only a JSON object in exactly this shape, no prose and no code fences:\n${JSON_SHAPE}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Parses a provider's text answer into a validated recipe. */
export function parseRecipeJson(text: string, allowedTags: string[]): GeneratedRecipe {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch (cause) {
    throw new AiGenerationError("The AI answer wasn't valid JSON", { cause });
  }
  return validateRecipe(data, allowedTags);
}

/** Validates already-parsed data and drops tags outside the allowed list. */
export function validateRecipe(data: unknown, allowedTags: string[]): GeneratedRecipe {
  const result = generatedRecipeSchema.safeParse(normalizeLoose(data));
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new AiGenerationError(`The AI answer didn't match the recipe format (${issues})`);
  }
  const allowed = new Set(allowedTags);
  const recipe = result.data;
  return { ...recipe, dietaryTags: recipe.dietaryTags.map((t) => t.toLowerCase()).filter((t) => allowed.has(t)) };
}

/** Smooths over common harmless deviations (e.g. "Easy" instead of "easy", 12.0 for an int). */
function normalizeLoose(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const d = { ...(data as Record<string, unknown>) };
  if (typeof d.difficulty === "string") d.difficulty = d.difficulty.toLowerCase();
  for (const key of ["prepMinutes", "servings", "caloriesPerServing"]) {
    if (typeof d[key] === "number") d[key] = Math.round(d[key] as number);
  }
  return d;
}
