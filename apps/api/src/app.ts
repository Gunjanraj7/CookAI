import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import type { ApiErrorBody } from "@cookai/shared";
import type { RecipeGenerator } from "./ai/index.js";
import type { Db } from "./db/client.js";
import { HttpError } from "./lib/http-error.js";
import { metaRouter } from "./routes/meta.js";
import { recipesRouter } from "./routes/recipes.js";

export interface AppDeps {
  db: Db;
  generator: RecipeGenerator;
  corsOrigins: readonly string[];
  /** Log each request line (off in tests). */
  logRequests?: boolean;
}

export function createApp({ db, generator, corsOrigins, logRequests = true }: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: [...corsOrigins] }));
  app.use(express.json({ limit: "200kb" }));

  if (logRequests) {
    app.use((req, res, next) => {
      const started = performance.now();
      res.on("finish", () => {
        const ms = (performance.now() - started).toFixed(0);
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms} ms)`);
      });
      next();
    });
  }

  app.use("/api", metaRouter(db, generator));
  app.use("/api/recipes", recipesRouter(db, generator));

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "not_found", "No such API route")));

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      const body: ApiErrorBody = { error: { code: err.code, message: err.message, fields: err.fields } };
      res.status(err.status).json(body);
      return;
    }
    // Malformed JSON body from express.json()
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "invalid_json", message: "Request body isn't valid JSON" } });
      return;
    }
    console.error(err);
    const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong on the server" } };
    res.status(500).json(body);
  };
  app.use(errorHandler);

  return app;
}
