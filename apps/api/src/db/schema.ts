/**
 * PostgreSQL schema. Change it here, then run `npm run db:generate` to write a
 * new SQL migration into `apps/api/drizzle/` and `npm run db:migrate` to apply it.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { DIFFICULTIES, RECIPE_SOURCES } from "@cookai/shared";

export const difficultyEnum = pgEnum("difficulty", DIFFICULTIES);
export const recipeSourceEnum = pgEnum("recipe_source", RECIPE_SOURCES);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Groups for the ingredient picker (vegetables, spices, ...). */
export const ingredientCategories = pgTable("ingredient_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
});

/**
 * Every ingredient the app knows. `name` is the normalized key (lower case);
 * `label` is how it's shown. Ingredients first seen in AI or user recipes are
 * added automatically with no category.
 */
export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    label: text("label").notNull(),
    categoryId: integer("category_id").references(() => ingredientCategories.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("ingredients_name_key").on(t.name), index("ingredients_category_idx").on(t.categoryId)],
);

/** Diet filters (vegetarian, vegan, ...). Add rows to add filters; the UI reads them. */
export const dietaryTags = pgTable("dietary_tags", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    summary: text("summary"),
    cuisine: text("cuisine"),
    instructions: text("instructions").array().notNull(),
    caloriesPerServing: integer("calories_per_serving"),
    difficulty: difficultyEnum("difficulty").notNull(),
    prepMinutes: integer("prep_minutes").notNull(),
    servings: integer("servings").notNull(),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    sourceUrl: text("source_url"),
    source: recipeSourceEnum("source").notNull(),
    authorEmail: text("author_email"),
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("recipes_created_at_idx").on(t.createdAt),
    index("recipes_source_idx").on(t.source),
    check("recipes_prep_minutes_positive", sql`${t.prepMinutes} > 0`),
    check("recipes_servings_positive", sql`${t.servings} > 0`),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    position: smallint("position").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2, mode: "number" }),
    unit: text("unit"),
  },
  (t) => [
    primaryKey({ columns: [t.recipeId, t.ingredientId] }),
    index("recipe_ingredients_ingredient_idx").on(t.ingredientId),
  ],
);

export const recipeDietaryTags = pgTable(
  "recipe_dietary_tags",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => dietaryTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.tagId] }), index("recipe_dietary_tags_tag_idx").on(t.tagId)],
);

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: createdAt(),
});
