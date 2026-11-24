/**
 * End-to-end API tests against a real PostgreSQL database.
 * Run with: TEST_DATABASE_URL=postgres://user:pass@localhost:5432/cookai_test npm test
 * The database is migrated and seeded automatically; use a throwaway one.
 */
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Paginated, RecipeDetail, RecipeSummary } from "@cookai/shared";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API (PostgreSQL)", async () => {
  // Imported lazily so the pool is only created when the suite runs.
  const { createApp } = await import("../src/app.js");
  const { db, pool } = await import("../src/db/client.js");
  const { seedDatabase } = await import("../src/db/seed.js");
  const { MockGenerator } = await import("../src/ai/providers/mock.js");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");

  const app = createApp({
    db,
    generator: new MockGenerator("test"),
    corsOrigins: ["http://localhost"],
    logRequests: false,
  });
  const created: string[] = [];

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
    await seedDatabase(db);
  });

  afterAll(async () => {
    for (const id of created) await request(app).delete(`/api/recipes/${id}`);
    await pool.end();
  });

  it("reports health and metadata", async () => {
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body).toMatchObject({ status: "ok", database: "up" });

    const meta = await request(app).get("/api/meta").expect(200);
    expect(meta.body.dietaryTags.map((t: { slug: string }) => t.slug)).toContain("vegan");
    expect(meta.body.ai).toMatchObject({ provider: "mock", ready: true });
  });

  it("ranks recipes by how many searched ingredients they use, case-insensitively", async () => {
    const res = await request(app).get("/api/recipes").query({ ingredients: "Paneer, ONION,tomato" }).expect(200);
    const body = res.body as Paginated<RecipeSummary>;
    expect(body.total).toBeGreaterThan(0);
    expect(body.items[0]!.name).toBe("Paneer Bhurji");
    expect(body.items[0]!.matchedCount).toBe(3);
    const counts = body.items.map((r) => r.matchedCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("filters by diet and text", async () => {
    const vegan = (await request(app).get("/api/recipes").query({ diet: "vegan" }).expect(200)).body as Paginated<RecipeSummary>;
    expect(vegan.items.every((r) => r.dietaryTags.some((t) => t.slug === "vegan"))).toBe(true);

    const dal = (await request(app).get("/api/recipes").query({ q: "dal" }).expect(200)).body as Paginated<RecipeSummary>;
    expect(dal.items.map((r) => r.name)).toContain("Masoor Dal Tadka");
  });

  it("rejects bad query parameters with field messages", async () => {
    const res = await request(app).get("/api/recipes").query({ sort: "random" }).expect(400);
    expect(res.body.error.fields).toHaveProperty("sort");
  });

  it("generates, saves and returns an AI recipe", async () => {
    const res = await request(app)
      .post("/api/recipes/generate")
      .send({ ingredients: ["okra", "onion"], diet: "vegan" })
      .expect(201);
    const recipe = res.body as RecipeDetail;
    created.push(recipe.id);
    expect(recipe.source).toBe("ai");
    expect(recipe.aiProvider).toBe("mock");
    expect(recipe.dietaryTags.map((t) => t.slug)).toEqual(["vegan"]);

    // It's now findable through normal search.
    const search = await request(app).get("/api/recipes").query({ ingredients: "okra" }).expect(200);
    expect(search.body.items.map((r: RecipeSummary) => r.id)).toContain(recipe.id);
  });

  it("saves a user recipe, adding unknown ingredients to the catalogue", async () => {
    const res = await request(app)
      .post("/api/recipes")
      .send({
        name: "Test Kosambari",
        ingredients: [{ name: "Moong Dal", quantity: 0.5, unit: "cup" }, { name: "Test Sprouts" }],
        instructions: ["Soak the dal.", "Mix everything."],
        difficulty: "easy",
        prepMinutes: 15,
        servings: 2,
        dietaryTags: ["vegan"],
        authorEmail: "Cook@Example.com",
      })
      .expect(201);
    created.push(res.body.id);
    expect(res.body.authorEmail).toBe("cook@example.com");

    const catalogue = await request(app).get("/api/ingredients").expect(200);
    const other = catalogue.body.find((c: { slug: string }) => c.slug === "other");
    expect(other.ingredients.map((i: { name: string }) => i.name)).toContain("test sprouts");
  });

  it("refuses unknown diet tags", async () => {
    const res = await request(app)
      .post("/api/recipes")
      .send({ name: "X", ingredients: [{ name: "salt" }], instructions: ["x"], difficulty: "easy", prepMinutes: 1, servings: 1, dietaryTags: ["keto"] })
      .expect(400);
    expect(res.body.error.message).toMatch(/keto/);
  });

  it("returns 404 for unknown or malformed ids", async () => {
    await request(app).get("/api/recipes/not-a-uuid").expect(404);
    await request(app).get("/api/recipes/00000000-0000-4000-8000-000000000000").expect(404);
  });

  it("stores contact messages", async () => {
    await request(app).post("/api/contact").send({ name: "A", email: "a@b.co", message: "Hello" }).expect(201);
    await request(app).post("/api/contact").send({ name: "A", email: "nope", message: "Hello" }).expect(400);
  });
});
