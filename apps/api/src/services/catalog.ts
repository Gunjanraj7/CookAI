/** Read-only lookups for the ingredient picker and diet filters. */
import { asc, eq, isNull } from "drizzle-orm";
import type { DietaryTag, IngredientCategory } from "@cookai/shared";
import type { Db } from "../db/client.js";
import { dietaryTags, ingredientCategories, ingredients } from "../db/schema.js";

export async function listDietaryTags(db: Db): Promise<DietaryTag[]> {
  return db
    .select({ slug: dietaryTags.slug, label: dietaryTags.label, description: dietaryTags.description })
    .from(dietaryTags)
    .orderBy(asc(dietaryTags.sortOrder), asc(dietaryTags.label));
}

/**
 * Ingredients grouped by category. Ingredients learned from AI or user recipes
 * (no category) are returned last under "Other".
 */
export async function listIngredientCategories(db: Db): Promise<IngredientCategory[]> {
  const rows = await db
    .select({
      categorySlug: ingredientCategories.slug,
      categoryLabel: ingredientCategories.label,
      name: ingredients.name,
      label: ingredients.label,
    })
    .from(ingredientCategories)
    .innerJoin(ingredients, eq(ingredients.categoryId, ingredientCategories.id))
    .orderBy(asc(ingredientCategories.sortOrder), asc(ingredients.label));

  const groups = new Map<string, IngredientCategory>();
  for (const row of rows) {
    let group = groups.get(row.categorySlug);
    if (!group) {
      group = { slug: row.categorySlug, label: row.categoryLabel, ingredients: [] };
      groups.set(row.categorySlug, group);
    }
    group.ingredients.push({ name: row.name, label: row.label });
  }

  const uncategorized = await db
    .select({ name: ingredients.name, label: ingredients.label })
    .from(ingredients)
    .where(isNull(ingredients.categoryId))
    .orderBy(asc(ingredients.label));

  const result = [...groups.values()];
  if (uncategorized.length) result.push({ slug: "other", label: "Other", ingredients: uncategorized });
  return result;
}
