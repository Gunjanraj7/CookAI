/** `npm run db:seed`: loads the starter data (safe to repeat). */
import { db, pool } from "../client.js";
import { seedDatabase } from "../seed.js";

try {
  await seedDatabase(db, console.log);
  console.log("Seed complete.");
} catch (err) {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
