import { describe, expect, it } from "vitest";
import { recipeSearchSchema } from "@cookai/shared";
import { buildUserPrompt, parseRecipeJson } from "../src/ai/prompt.js";
import { MockGenerator } from "../src/ai/providers/mock.js";
import { AiGenerationError } from "../src/ai/types.js";

const validRecipe = {
  name: "Bhindi Masala",
  summary: "Okra with onions and spices.",
  cuisine: "Indian",
  difficulty: "Easy",
  prepMinutes: 30.4,
  servings: 2,
  caloriesPerServing: 180,
  dietaryTags: ["Vegan", "keto"],
  ingredients: [{ name: "Okra", quantity: 250, unit: "g" }, { name: "Salt", quantity: null, unit: "to taste" }],
  instructions: ["Wash and dry the okra.", "Fry with onions."],
};

describe("parseRecipeJson", () => {
  it("accepts JSON wrapped in a code fence and normalizes loose values", () => {
    const text = "```json\n" + JSON.stringify(validRecipe) + "\n```";
    const recipe = parseRecipeJson(text, ["vegan", "vegetarian"]);
    expect(recipe.difficulty).toBe("easy");
    expect(recipe.prepMinutes).toBe(30);
    // Unknown tags are dropped, known ones lower-cased.
    expect(recipe.dietaryTags).toEqual(["vegan"]);
  });

  it("rejects text that isn't JSON", () => {
    expect(() => parseRecipeJson("Here's a lovely recipe!", [])).toThrow(AiGenerationError);
  });

  it("rejects JSON missing required fields, naming the field", () => {
    const { instructions: _omit, ...missing } = validRecipe;
    expect(() => parseRecipeJson(JSON.stringify(missing), [])).toThrow(/instructions/);
  });
});

describe("buildUserPrompt", () => {
  it("includes the ingredients, diet and allowed tags", () => {
    const prompt = buildUserPrompt(
      { ingredients: ["okra", "onion"], diet: "vegan", cuisine: "Indian", allowedTags: ["vegan"] },
      { includeShape: true },
    );
    expect(prompt).toContain("okra, onion");
    expect(prompt).toContain("vegan");
    expect(prompt).toContain('"instructions": string[]');
  });
});

describe("MockGenerator", () => {
  it("produces a recipe that passes the shared schema", async () => {
    const recipe = await new MockGenerator("template-v1").generate({
      ingredients: ["paneer", "spinach"],
      diet: "vegetarian",
      cuisine: "Indian",
      allowedTags: ["vegetarian"],
    });
    expect(() => parseRecipeJson(JSON.stringify(recipe), ["vegetarian"])).not.toThrow();
    expect(recipe.dietaryTags).toEqual(["vegetarian"]);
  });
});

describe("recipeSearchSchema", () => {
  it("splits and normalizes the ingredient list", () => {
    const parsed = recipeSearchSchema.parse({ ingredients: " Onion, BELL  pepper,, " });
    expect(parsed.ingredients).toEqual(["onion", "bell pepper"]);
    expect(parsed.sort).toBe("best-match");
    expect(parsed.page).toBe(1);
  });
});
