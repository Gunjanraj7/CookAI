import { createGenerator } from "./ai/index.js";
import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { db, pingDatabase, pool } from "./db/client.js";

const generator = createGenerator();
const app = createApp({ db, generator, corsOrigins: config.corsOrigins });

const server = app.listen(config.port, async () => {
  const dbUp = await pingDatabase();
  console.log(`\n${config.appName} API listening on http://localhost:${config.port}`);
  console.log(`  database: ${dbUp ? "connected" : "NOT reachable (check DATABASE_URL in .env)"}`);
  console.log(
    `  ai:       ${generator.provider} / ${generator.model}${generator.ready ? "" : " (API key missing, generation disabled)"}\n`,
  );
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
