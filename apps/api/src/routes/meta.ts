import { Router } from "express";
import { contactInputSchema, DIFFICULTIES, SORT_OPTIONS, type AppMeta, type HealthStatus } from "@cookai/shared";
import type { RecipeGenerator } from "../ai/index.js";
import { config } from "../config/env.js";
import { pingDatabase, type Db } from "../db/client.js";
import { contactMessages } from "../db/schema.js";
import { parseOr400 } from "../lib/validate.js";
import { listDietaryTags, listIngredientCategories } from "../services/catalog.js";

/** Health, app metadata, the ingredient catalogue and the contact form. */
export function metaRouter(db: Db, generator: RecipeGenerator): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    const dbUp = await pingDatabase();
    const body: HealthStatus = {
      status: dbUp ? "ok" : "degraded",
      database: dbUp ? "up" : "down",
      ai: { provider: generator.provider, ready: generator.ready },
    };
    res.status(dbUp ? 200 : 503).json(body);
  });

  // Everything the UI needs to render filters and forms; nothing is hard-coded client-side.
  router.get("/meta", async (_req, res) => {
    const body: AppMeta = {
      appName: config.appName,
      dietaryTags: await listDietaryTags(db),
      difficulties: DIFFICULTIES,
      sortOptions: SORT_OPTIONS,
      ai: {
        provider: generator.provider,
        model: generator.model,
        ready: generator.ready,
        defaultCuisine: config.ai.defaultCuisine,
      },
    };
    res.json(body);
  });

  router.get("/ingredients", async (_req, res) => {
    res.json(await listIngredientCategories(db));
  });

  router.post("/contact", async (req, res) => {
    const input = parseOr400(contactInputSchema, req.body);
    await db.insert(contactMessages).values({ ...input, email: input.email.toLowerCase() });
    res.status(201).json({ ok: true });
  });

  return router;
}
