import { defineConfig } from "drizzle-kit";
import { config } from "./src/config/env.js";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: config.db.url },
  strict: true,
  verbose: true,
});
