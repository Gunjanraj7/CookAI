/**
 * Offline stand-in used when AI_PROVIDER=mock. Builds a simple, plausible
 * one-pan recipe from the chosen ingredients so the whole app works without a key.
 */
import type { GeneratedRecipe } from "@cookai/shared";
import type { GenerationRequest, RecipeGenerator } from "../types.js";

const titleCase = (s: string) => s.replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());

export class MockGenerator implements RecipeGenerator {
  readonly provider = "mock" as const;
  readonly ready = true;
  constructor(readonly model: string) {}

  async generate(req: GenerationRequest): Promise<GeneratedRecipe> {
    const main = req.ingredients.slice(0, 2).map(titleCase);
    const name = `${req.cuisine}-style ${main.join(" & ")} Skillet`;

    const ingredients: GeneratedRecipe["ingredients"] = [
      ...req.ingredients.map((n) => ({ name: n, quantity: 1, unit: "cup, chopped" })),
      { name: "Onion", quantity: 1, unit: "medium" },
      { name: "Garlic", quantity: 2, unit: "cloves" },
      { name: "Cumin", quantity: 1, unit: "tsp" },
      { name: "Turmeric", quantity: 0.5, unit: "tsp" },
      { name: "Vegetable Oil", quantity: 2, unit: "tbsp" },
      { name: "Salt", quantity: null, unit: "to taste" },
    ];

    return {
      name,
      summary: `A quick one-pan dish built around ${req.ingredients.join(", ")}. (Template recipe: set AI_PROVIDER in .env for real AI recipes.)`,
      cuisine: req.cuisine,
      difficulty: "easy",
      prepMinutes: 15 + req.ingredients.length * 5,
      servings: 2,
      caloriesPerServing: 250 + req.ingredients.length * 40,
      dietaryTags: req.diet && req.allowedTags.includes(req.diet) ? [req.diet] : [],
      ingredients,
      instructions: [
        `Wash and chop ${req.ingredients.join(", ")} into even, bite-sized pieces.`,
        "Heat the oil in a wide pan over medium heat and add the cumin.",
        "When the cumin sizzles, add the sliced onion and cook until soft and golden, about 6 minutes.",
        "Add the garlic and turmeric and stir for 30 seconds.",
        "Add the firmest ingredients first, then the softer ones, stirring every minute or so.",
        "Season with salt, cover, and cook on low heat until everything is tender.",
        "Taste, adjust the seasoning, and serve hot.",
      ],
    };
  }
}
