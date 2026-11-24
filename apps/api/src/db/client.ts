import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({
  connectionString: config.db.url,
  max: config.db.poolMax,
});

pool.on("error", (err) => {
  // An idle client lost its connection (e.g. Postgres restarted). The pool replaces it.
  console.error("[db] idle client error:", err.message);
});

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;

/** Cheap round-trip used by the health check. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}
