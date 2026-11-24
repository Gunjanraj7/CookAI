import { Router } from "express";
import {
  generateRequestSchema,
  recipeInputSchema,
  recipeSearchSchema,
  type GeneratedRecipe,
} from "@cookai/shared";
import { AiGenerationError, type RecipeGenerator } from "../ai/index.js";
import { config } from "../config/env.js";
import type { Db } from "../db/client.js";
import { HttpError } from "../lib/http-error.js";
import { parseOr400 } from "../lib/validate.js";
import { listDietaryTags } from "../services/catalog.js";
import {
  createRecipe,
  deleteRecipe,
  findUnknownDietaryTags,
  getRecipe,
  randomRecipe,
  searchRecipes,
} from "../services/recipes.js";

export function recipesRouter(db: Db, generator: RecipeGenerator): Router {
  const router = Router();

  // GET /api/recipes?ingredients=onion,tomato&diet=vegan&sort=best-match&page=1
  router.get("/", async (req, res) => {
    const params = parseOr400(recipeSearchSchema, req.query);
    res.json(await searchRecipes(db, params));
  });

  // GET /api/recipes/random?diet=vegan
  router.get("/random", async (req, res) => {
    const { diet, difficulty, maxMinutes } = parseOr400(recipeSearchSchema, req.query);
    res.json(await randomRecipe(db, { diet, difficulty, maxMinutes }));
  });

  // POST /api/recipes/generate  { ingredients, diet?, cuisine?, notes? }
  router.post("/generate", async (req, res) => {
    const body = parseOr400(generateRequestSchema, req.body);
    if (!generator.ready) {
      throw new HttpError(
        503,
        "ai_not_configured",
        `AI provider "${generator.provider}" has no API key. Add it to .env and restart the API, or set AI_PROVIDER=mock.`,
      );
    }

    const allowedTags = (await listDietaryTags(db)).map((t) => t.slug);
    let recipe: GeneratedRecipe;
    try {
      recipe = await generator.generate({
        ingredients: body.ingredients,
        diet: body.diet,
        cuisine: body.cuisine || config.ai.defaultCuisine,
        notes: body.notes,
        allowedTags,
      });
    } catch (err) {
      if (err instanceof AiGenerationError) throw new HttpError(502, "ai_failed", err.message);
      throw err;
    }

    const saved = await createRecipe(db, recipe, {
      source: "ai",
      aiProvider: generator.provider,
      aiModel: generator.model,
    });
    res.status(201).json(saved);
  });

  // GET /api/recipes/:id
  router.get("/:id", async (req, res) => {
    res.json(await getRecipe(db, req.params.id));
  });

  // POST /api/recipes  (a recipe written by a person)
  router.post("/", async (req, res) => {
    const input = parseOr400(recipeInputSchema, req.body);
    const unknown = await findUnknownDietaryTags(db, input.dietaryTags);
    if (unknown.length) {
      throw new HttpError(400, "validation_failed", `Unknown dietary tag: ${unknown.join(", ")}`, {
        dietaryTags: `Unknown: ${unknown.join(", ")}`,
      });
    }
    res.status(201).json(await createRecipe(db, input, { source: "user" }));
  });

  // DELETE /api/recipes/:id
  router.delete("/:id", async (req, res) => {
    await deleteRecipe(db, req.params.id);
    res.status(204).end();
  });

  return router;
}
