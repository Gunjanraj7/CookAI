/** Recipe reads and writes. Every SQL query for recipes lives here. */
import { and, asc, desc, eq, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import {
  normalizeIngredientName,
  type DietaryTag,
  type Paginated,
  type RecipeDetail,
  type RecipeSearchParams,
  type RecipeSource,
  type RecipeSummary,
} from "@cookai/shared";
import type { Db } from "../db/client.js";
import { dietaryTags, ingredients, recipeDietaryTags, recipeIngredients, recipes } from "../db/schema.js";
import { HttpError } from "../lib/http-error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fields every write path (seed, AI, user form) provides. */
export interface NewRecipe {
  name: string;
  summary?: string | null;
  cuisine?: string | null;
  instructions: string[];
  caloriesPerServing?: number | null;
  difficulty: RecipeDetail["difficulty"];
  prepMinutes: number;
  servings: number;
  dietaryTags: string[];
  ingredients: { name: string; quantity?: number | null; unit?: string | null }[];
  imageUrl?: string | null;
  videoUrl?: string | null;
  sourceUrl?: string | null;
  authorEmail?: string | null;
}

export interface RecipeOrigin {
  source: RecipeSource;
  aiProvider?: string;
  aiModel?: string;
}

/** "bell  PEPPER" → "Bell Pepper", used as the display label for new ingredients. */
const toLabel = (raw: string) =>
  raw
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Slugs from `requested` that don't exist in dietary_tags. */
export async function findUnknownDietaryTags(db: Db, requested: string[]): Promise<string[]> {
  if (!requested.length) return [];
  const rows = await db.select({ slug: dietaryTags.slug }).from(dietaryTags).where(inArray(dietaryTags.slug, requested));
  const known = new Set(rows.map((r) => r.slug));
  return requested.filter((s) => !known.has(s));
}

/**
 * Saves a recipe with its ingredients and tags in one transaction.
 * Ingredients the app hasn't seen before are added to the catalogue.
 * Unknown dietary tag slugs are ignored.
 */
export async function createRecipe(db: Db, input: NewRecipe, origin: RecipeOrigin): Promise<RecipeDetail> {
  // Merge duplicate ingredient lines ("Onion" twice) keeping the first.
  const lines = new Map<string, NewRecipe["ingredients"][number] & { label: string }>();
  for (const line of input.ingredients) {
    const key = normalizeIngredientName(line.name);
    if (key && !lines.has(key)) lines.set(key, { ...line, label: toLabel(line.name) });
  }
  if (!lines.size) throw new HttpError(400, "invalid_recipe", "A recipe needs at least one ingredient");

  const id = await db.transaction(async (tx) => {
    await tx
      .insert(ingredients)
      .values([...lines].map(([name, l]) => ({ name, label: l.label })))
      .onConflictDoNothing({ target: ingredients.name });

    const ingredientRows = await tx
      .select({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .where(inArray(ingredients.name, [...lines.keys()]));
    const idByName = new Map(ingredientRows.map((r) => [r.name, r.id]));

    const [recipe] = await tx
      .insert(recipes)
      .values({
        name: input.name.trim(),
        summary: input.summary || null,
        cuisine: input.cuisine || null,
        instructions: input.instructions.map((s) => s.trim()).filter(Boolean),
        caloriesPerServing: input.caloriesPerServing ?? null,
        difficulty: input.difficulty,
        prepMinutes: input.prepMinutes,
        servings: input.servings,
        imageUrl: input.imageUrl || null,
        videoUrl: input.videoUrl || null,
        sourceUrl: input.sourceUrl || null,
        authorEmail: input.authorEmail?.toLowerCase() || null,
        source: origin.source,
        aiProvider: origin.aiProvider ?? null,
        aiModel: origin.aiModel ?? null,
      })
      .returning({ id: recipes.id });
    if (!recipe) throw new Error("Insert into recipes returned no row");

    await tx.insert(recipeIngredients).values(
      [...lines].map(([name, l], position) => ({
        recipeId: recipe.id,
        ingredientId: idByName.get(name)!,
        position,
        quantity: l.quantity ?? null,
        unit: l.unit?.trim() || null,
      })),
    );

    const slugs = [...new Set(input.dietaryTags.map((t) => t.trim().toLowerCase()))];
    if (slugs.length) {
      const tagRows = await tx.select({ id: dietaryTags.id }).from(dietaryTags).where(inArray(dietaryTags.slug, slugs));
      if (tagRows.length) {
        await tx.insert(recipeDietaryTags).values(tagRows.map((t) => ({ recipeId: recipe.id, tagId: t.id })));
      }
    }
    return recipe.id;
  });

  return getRecipe(db, id);
}

/** Tags for many recipes at once, keyed by recipe id. */
async function tagsFor(db: Db, ids: string[]): Promise<Map<string, DietaryTag[]>> {
  const map = new Map<string, DietaryTag[]>();
  if (!ids.length) return map;
  const rows = await db
    .select({
      recipeId: recipeDietaryTags.recipeId,
      slug: dietaryTags.slug,
      label: dietaryTags.label,
      description: dietaryTags.description,
    })
    .from(recipeDietaryTags)
    .innerJoin(dietaryTags, eq(dietaryTags.id, recipeDietaryTags.tagId))
    .where(inArray(recipeDietaryTags.recipeId, ids))
    .orderBy(asc(dietaryTags.sortOrder));
  for (const { recipeId, ...tag } of rows) {
    map.set(recipeId, [...(map.get(recipeId) ?? []), tag]);
  }
  return map;
}

export async function getRecipe(db: Db, id: string): Promise<RecipeDetail> {
  if (!UUID_RE.test(id)) throw HttpError.notFound("Recipe");

  const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
  if (!row) throw HttpError.notFound("Recipe");

  const ingredientRows = await db
    .select({
      name: ingredients.name,
      label: ingredients.label,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.position));

  const tags = await tagsFor(db, [id]);

  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    cuisine: row.cuisine,
    difficulty: row.difficulty,
    prepMinutes: row.prepMinutes,
    servings: row.servings,
    caloriesPerServing: row.caloriesPerServing,
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    sourceUrl: row.sourceUrl,
    source: row.source,
    authorEmail: row.authorEmail,
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    instructions: row.instructions,
    ingredients: ingredientRows,
    dietaryTags: tags.get(id) ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * The outer recipe id, always table-qualified. Inside correlated subqueries a
 * bare "id" would bind to the subquery's own tables instead.
 */
const OUTER_RECIPE_ID = sql.raw(`"recipes"."id"`);

/** Filters shared by search and "surprise me". */
function filterConditions(p: Partial<RecipeSearchParams>): SQL[] {
  const where: SQL[] = [];
  if (p.diet) {
    where.push(sql`exists (
      select 1 from recipe_dietary_tags rdt
      join dietary_tags dt on dt.id = rdt.tag_id
      where rdt.recipe_id = ${OUTER_RECIPE_ID} and dt.slug = ${p.diet}
    )`);
  }
  if (p.q) {
    const pattern = `%${escapeLike(p.q)}%`;
    where.push(or(ilike(recipes.name, pattern), ilike(recipes.cuisine, pattern), ilike(recipes.summary, pattern))!);
  }
  if (p.difficulty) where.push(eq(recipes.difficulty, p.difficulty));
  if (p.source) where.push(eq(recipes.source, p.source));
  if (p.maxMinutes) where.push(lte(recipes.prepMinutes, p.maxMinutes));
  if (p.maxCalories) where.push(lte(recipes.caloriesPerServing, p.maxCalories));
  return where;
}

/**
 * Searches recipes. With ingredients, only recipes using at least one of them
 * are returned, ranked (by default) by how many they use.
 */
export async function searchRecipes(db: Db, p: RecipeSearchParams): Promise<Paginated<RecipeSummary>> {
  const matched = p.ingredients.length
    ? sql<number>`(
        select count(*)::int from recipe_ingredients ri
        join ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = ${OUTER_RECIPE_ID} and ${inArray(sql`i.name`, p.ingredients)}
      )`
    : sql<number>`0`;

  const where = filterConditions(p);
  if (p.ingredients.length) where.push(sql`${matched} > 0`);
  const whereClause = where.length ? and(...where) : undefined;

  const orderBy: SQL[] = {
    // A bare constant in ORDER BY is read as a column position, so only rank by match when searching ingredients.
    "best-match": p.ingredients.length ? [desc(matched), desc(recipes.createdAt)] : [desc(recipes.createdAt)],
    newest: [desc(recipes.createdAt)],
    quickest: [asc(recipes.prepMinutes), desc(recipes.createdAt)],
    lightest: [sql`${recipes.caloriesPerServing} asc nulls last`, desc(recipes.createdAt)],
  }[p.sort];

  const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(recipes).where(whereClause);

  const rows = await db
    .select({
      id: recipes.id,
      name: recipes.name,
      summary: recipes.summary,
      cuisine: recipes.cuisine,
      difficulty: recipes.difficulty,
      prepMinutes: recipes.prepMinutes,
      servings: recipes.servings,
      caloriesPerServing: recipes.caloriesPerServing,
      imageUrl: recipes.imageUrl,
      source: recipes.source,
      createdAt: recipes.createdAt,
      matchedCount: matched.mapWith(Number),
    })
    .from(recipes)
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(p.pageSize)
    .offset((p.page - 1) * p.pageSize);

  const ids = rows.map((r) => r.id);
  const tags = await tagsFor(db, ids);
  const names = new Map<string, string[]>();
  if (ids.length) {
    const ingredientRows = await db
      .select({ recipeId: recipeIngredients.recipeId, label: ingredients.label })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
      .where(inArray(recipeIngredients.recipeId, ids))
      .orderBy(asc(recipeIngredients.position));
    for (const r of ingredientRows) names.set(r.recipeId, [...(names.get(r.recipeId) ?? []), r.label]);
  }

  return {
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      dietaryTags: tags.get(r.id) ?? [],
      ingredientNames: names.get(r.id) ?? [],
    })),
    total: countRow?.total ?? 0,
    page: p.page,
    pageSize: p.pageSize,
  };
}

export async function randomRecipe(db: Db, filters: Partial<RecipeSearchParams>): Promise<RecipeDetail> {
  const where = filterConditions(filters);
  const [row] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`random()`)
    .limit(1);
  if (!row) throw new HttpError(404, "not_found", "No recipe matches those filters yet");
  return getRecipe(db, row.id);
}

export async function deleteRecipe(db: Db, id: string): Promise<void> {
  if (!UUID_RE.test(id)) throw HttpError.notFound("Recipe");
  const deleted = await db.delete(recipes).where(eq(recipes.id, id)).returning({ id: recipes.id });
  if (!deleted.length) throw HttpError.notFound("Recipe");
}
