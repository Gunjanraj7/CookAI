/**
 * Creates the database named in DATABASE_URL if it doesn't exist yet.
 * Connects to the server's built-in `postgres` database to do it.
 */
import pg from "pg";
import { config } from "../../config/env.js";

const target = new URL(config.db.url);
const dbName = decodeURIComponent(target.pathname.replace(/^\//, ""));

if (!dbName) {
  console.error("DATABASE_URL has no database name (the part after the last /).");
  process.exit(1);
}

const admin = new URL(config.db.url);
admin.pathname = "/postgres";

const client = new pg.Client({ connectionString: admin.toString() });

try {
  await client.connect();
  const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [dbName]);
  if (rowCount) {
    console.log(`Database "${dbName}" already exists.`);
  } else {
    // Identifiers can't be bound as parameters; escapeIdentifier quotes safely.
    await client.query(`create database ${client.escapeIdentifier(dbName)}`);
    console.log(`Created database "${dbName}".`);
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Could not create database "${dbName}" on ${target.host}: ${message}`);
  console.error("Check DATABASE_URL in .env (user, password, host, port) and that PostgreSQL is running.");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
