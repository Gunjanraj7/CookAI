/**
 * Contracts shared by the API and the web app: request/response shapes and
 * the Zod schemas that validate them on both sides.
 */
import { z } from "zod";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const RECIPE_SOURCES = ["seed", "ai", "user"] as const;
export type RecipeSource = (typeof RECIPE_SOURCES)[number];

export const AI_PROVIDERS = ["mock", "gemini", "openai", "anthropic"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

export const SORT_OPTIONS = ["best-match", "newest", "quickest", "lightest"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Lower-cases and collapses whitespace so "  Bell  Pepper" and "bell pepper" match. */
export const normalizeIngredientName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optionalUrl = z
  .union([z.url({ protocol: /^https?$/ }), z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

// ── Building blocks ─────────────────────────────────────────────────────────

export const ingredientLineSchema = z.object({
  name: trimmed(80),
  quantity: z.number().positive().max(100_000).nullish(),
  unit: z.string().trim().max(30).nullish(),
});
export type IngredientLineInput = z.infer<typeof ingredientLineSchema>;

// ── Requests ────────────────────────────────────────────────────────────────

/** Body of POST /api/recipes (a recipe a person writes). */
export const recipeInputSchema = z.object({
  name: trimmed(120),
  summary: z.string().trim().max(400).optional(),
  cuisine: z.string().trim().max(60).optional(),
  ingredients: z.array(ingredientLineSchema).min(1, "Add at least one ingredient").max(60),
  instructions: z.array(trimmed(1000)).min(1, "Add at least one step").max(60),
  caloriesPerServing: z.number().int().min(0).max(10_000).nullish(),
  difficulty: z.enum(DIFFICULTIES),
  prepMinutes: z.number().int().min(1).max(24 * 60),
  servings: z.number().int().min(1).max(100),
  dietaryTags: z.array(z.string().trim().min(1)).max(20).default([]),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
  sourceUrl: optionalUrl,
  authorEmail: z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined),
});
export type RecipeInput = z.input<typeof recipeInputSchema>;
export type RecipeInputParsed = z.output<typeof recipeInputSchema>;

/** Body of POST /api/recipes/generate. */
export const generateRequestSchema = z.object({
  ingredients: z.array(trimmed(80)).min(1, "Pick at least one ingredient").max(30),
  diet: z.string().trim().max(40).optional(),
  cuisine: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** Query string of GET /api/recipes. Lists arrive comma-separated. */
const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map(normalizeIngredientName)
      .filter(Boolean),
  );

export const recipeSearchSchema = z.object({
  ingredients: csv,
  diet: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  source: z.enum(RECIPE_SOURCES).optional(),
  maxMinutes: z.coerce.number().int().positive().optional(),
  maxCalories: z.coerce.number().int().positive().optional(),
  sort: z.enum(SORT_OPTIONS).default("best-match"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type RecipeSearchQuery = z.input<typeof recipeSearchSchema>;
export type RecipeSearchParams = z.output<typeof recipeSearchSchema>;

export const contactInputSchema = z.object({
  name: trimmed(100),
  email: z.email(),
  message: trimmed(4000),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

// ── AI output ───────────────────────────────────────────────────────────────

/** What an AI provider must return. Validated before anything is saved. */
export const generatedRecipeSchema = z.object({
  name: trimmed(120),
  summary: z.string().trim().max(400),
  cuisine: z.string().trim().max(60),
  difficulty: z.enum(DIFFICULTIES),
  prepMinutes: z.number().int().min(1).max(24 * 60),
  servings: z.number().int().min(1).max(100),
  caloriesPerServing: z.number().int().min(0).max(10_000),
  dietaryTags: z.array(z.string()),
  ingredients: z
    .array(
      z.object({
        name: trimmed(80),
        quantity: z.number().positive().nullable(),
        unit: z.string().trim().max(30).nullable(),
      }),
    )
    .min(1),
  instructions: z.array(trimmed(1000)).min(1),
});
export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;

// ── Responses ───────────────────────────────────────────────────────────────

export interface DietaryTag {
  slug: string;
  label: string;
  description: string | null;
}

export interface IngredientCategory {
  slug: string;
  label: string;
  ingredients: { name: string; label: string }[];
}

export interface RecipeIngredient {
  name: string;
  label: string;
  quantity: number | null;
  unit: string | null;
}

export interface RecipeSummary {
  id: string;
  name: string;
  summary: string | null;
  cuisine: string | null;
  difficulty: Difficulty;
  prepMinutes: number;
  servings: number;
  caloriesPerServing: number | null;
  imageUrl: string | null;
  source: RecipeSource;
  dietaryTags: DietaryTag[];
  ingredientNames: string[];
  /** How many of the searched ingredients this recipe uses (0 when none were searched). */
  matchedCount: number;
  createdAt: string;
}

export interface RecipeDetail extends Omit<RecipeSummary, "ingredientNames" | "matchedCount"> {
  ingredients: RecipeIngredient[];
  instructions: string[];
  videoUrl: string | null;
  sourceUrl: string | null;
  authorEmail: string | null;
  aiProvider: string | null;
  aiModel: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AppMeta {
  appName: string;
  dietaryTags: DietaryTag[];
  difficulties: readonly Difficulty[];
  sortOptions: readonly SortOption[];
  ai: {
    provider: AiProviderName;
    model: string;
    /** False when the chosen provider is missing its API key. */
    ready: boolean;
    defaultCuisine: string;
  };
}

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "up" | "down";
  ai: { provider: AiProviderName; ready: boolean };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level problems from validation, keyed by dotted path. */
    fields?: Record<string, string>;
  };
}
