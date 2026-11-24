/** Applies any SQL migrations in apps/api/drizzle/ that haven't run yet. */
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../client.js";

const migrationsFolder = fileURLToPath(new URL("../../../drizzle", import.meta.url));

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
