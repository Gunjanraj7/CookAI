/**
 * Loads the starter data in src/db/seed-data/. Safe to run repeatedly:
 * categories, ingredients and tags are upserted, and seed recipes that
 * already exist (same name) are skipped.
 */
import { and, eq, sql } from "drizzle-orm";
import { normalizeIngredientName, recipeInputSchema } from "@cookai/shared";
import type { Db } from "./client.js";
import { dietaryTags, ingredientCategories, ingredients, recipes } from "./schema.js";
import { createRecipe } from "../services/recipes.js";
import categoriesData from "./seed-data/ingredients.json" with { type: "json" };
import tagsData from "./seed-data/dietary-tags.json" with { type: "json" };
import recipesData from "./seed-data/recipes.json" with { type: "json" };

export async function seedDatabase(db: Db, log: (line: string) => void = () => {}) {
  // Diet tags, ordered as listed in the file.
  for (const [sortOrder, tag] of tagsData.entries()) {
    await db
      .insert(dietaryTags)
      .values({ ...tag, sortOrder })
      .onConflictDoUpdate({
        target: dietaryTags.slug,
        set: { label: tag.label, description: tag.description, sortOrder },
      });
  }
  log(`✓ ${tagsData.length} dietary tags`);

  // Ingredient categories and their ingredients.
  let ingredientCount = 0;
  for (const [sortOrder, category] of categoriesData.entries()) {
    const [row] = await db
      .insert(ingredientCategories)
      .values({ slug: category.slug, label: category.label, sortOrder })
      .onConflictDoUpdate({
        target: ingredientCategories.slug,
        set: { label: category.label, sortOrder },
      })
      .returning({ id: ingredientCategories.id });

    const values = category.items.map((label) => ({ name: normalizeIngredientName(label), label, categoryId: row!.id }));
    await db
      .insert(ingredients)
      .values(values)
      .onConflictDoUpdate({
        target: ingredients.name,
        set: { label: sql`excluded.label`, categoryId: sql`excluded.category_id` },
      });
    ingredientCount += values.length;
  }
  log(`✓ ${categoriesData.length} ingredient categories, ${ingredientCount} ingredients`);

  // Starter recipes.
  let added = 0;
  for (const raw of recipesData) {
    const recipe = recipeInputSchema.parse(raw);
    const [existing] = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.name, recipe.name), eq(recipes.source, "seed")));
    if (existing) continue;
    await createRecipe(db, recipe, { source: "seed" });
    added++;
  }
  log(`✓ ${added} recipes added (${recipesData.length - added} already present)`);
}
