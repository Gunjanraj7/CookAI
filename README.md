# CookAI

Pick the ingredients you have, and CookAI finds recipes that use them, ranked by how many you have. If nothing fits, it can write a new recipe with an AI model. Generated recipes are saved, so later searches find them too.

This is a local project: everything runs on your machine against your own PostgreSQL database.

## Stack

| Part | Tech |
| --- | --- |
| Web app (`apps/web`) | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Router, React Hook Form + Zod |
| API (`apps/api`) | Node.js, Express 5, TypeScript (run with `tsx`), Drizzle ORM |
| Database | PostgreSQL (tested on 18) |
| AI | Pluggable: `mock` (no key), Google Gemini, OpenAI, or Anthropic Claude |
| Shared (`packages/shared`) | Zod schemas and types used by both the API and the web app |

## Project layout

```
.env.example            all settings (copy to .env)
apps/
  api/
    drizzle/            SQL migrations (generated from schema.ts)
    src/
      ai/               provider adapters + the shared prompt
      config/env.ts     loads and validates .env
      db/               schema, client, seed data and scripts
      routes/           Express routes
      services/         all SQL lives here
    test/               Vitest unit + API tests
  web/
    src/
      components/       Dabba (ingredient tray), picker, layout, UI primitives
      lib/              API client, query hooks, helpers
      pages/            Kitchen, Recipe, Add recipe, About, Contact
packages/shared/        request/response schemas and types
legacy/                 the original v1 app, kept for reference only
```

## First-time setup

You need Node.js 22 or newer and a running PostgreSQL server.

1. **Install dependencies** (from this folder):

   ```bash
   npm install
   ```

2. **Create your `.env`:**

   ```bash
   cp .env.example .env
   ```

   The defaults work as-is: a private, password-free PostgreSQL instance on port 5433 and the `mock` AI provider.

3. **Start the database.** Either:

   - **Option A (default): CookAI's own instance.** Uses your installed PostgreSQL binaries, keeps its data in `./.pgdata`, and only accepts connections from this computer:

     ```bash
     npm run db:local:start     # also: db:local:stop, db:local:status
     ```

     Run this again after a reboot.

   - **Option B: your existing PostgreSQL server.** Set `DATABASE_URL` in `.env` to your user and password, e.g. `postgres://postgres:my-password@localhost:5432/cookai`.

4. **Create, migrate and seed the database** in one step:

   ```bash
   npm run db:setup
   ```

   This creates the `cookai` database if it doesn't exist, creates the tables, and loads the ingredient catalogue, diet labels and 10 starter recipes. It's safe to run again.

5. **Start the app:**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173. The API runs on port 5000. The web dev server forwards `/api` calls to it, so the browser only ever talks to one address.

## Turning on real AI recipes

Out of the box `AI_PROVIDER=mock` returns a simple template recipe so everything works without a key. To use a real model, edit `.env`:

```
AI_PROVIDER=gemini            # or openai, anthropic
GEMINI_API_KEY=your-real-key  # the key for the provider you picked
AI_MODEL=                     # empty = provider default (see below)
```

Then restart `npm run dev`.

| Provider | Key variable | Default model | Get a key |
| --- | --- | --- | --- |
| `gemini` | `GEMINI_API_KEY` | `gemini-flash-latest` | https://aistudio.google.com/apikey |
| `openai` | `OPENAI_API_KEY` | `gpt-5.5` | https://platform.openai.com/api-keys |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-opus-5-5` | https://platform.claude.com/settings/keys |

Model names change often. If a request fails with "model not found", put a current model name in `AI_MODEL`.

Every provider's answer is validated against the same schema before it's saved, so a malformed answer shows a clear error instead of a broken recipe. With Anthropic models that support it, refusal fallbacks are on: if the model declines, the API retries on a suitable model in the same request.

## Settings (`.env`)

| Variable | Default | What it does |
| --- | --- | --- |
| `APP_NAME` | `CookAI` | Name shown in the header and pages |
| `API_PORT` | `5000` | Port the API listens on |
| `WEB_PORT` | `5173` | Port the web dev server listens on |
| `WEB_ORIGIN` | `http://localhost:5173` | Origins allowed to call the API (comma-separated) |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `DATABASE_POOL_MAX` | `10` | Maximum database connections |
| `PG_BIN` | auto-detected | PostgreSQL bin folder for `db:local:*` |
| `PG_LOCAL_DATA` | `.pgdata` | Data folder for `db:local:*` |
| `AI_PROVIDER` | `mock` | `mock`, `gemini`, `openai` or `anthropic` |
| `AI_MODEL` | provider default | Model to use |
| `AI_DEFAULT_CUISINE` | `Indian` | Cuisine the AI leans towards when none is chosen |
| `AI_TIMEOUT_MS` | `60000` | Give up on a generation after this long |
| `AI_EFFORT` | model default | Anthropic only: `low`, `medium` or `high` |
| `VITE_API_BASE_URL` | `/api` | Only if the web app should call the API somewhere else |

The API checks all of these at startup and stops with a clear message if one is wrong.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and web app together, with reload on save |
| `npm run build` | Type-check and build the web app into `apps/web/dist` |
| `npm start` | Run the API without file watching |
| `npm run typecheck` | Type-check every package |
| `npm test` | Unit tests (database tests are skipped unless `TEST_DATABASE_URL` is set) |
| `npm run db:local:start` / `db:local:stop` / `db:local:status` | Start, stop or check CookAI's private PostgreSQL instance |
| `npm run db:setup` | `db:create` + `db:migrate` + `db:seed` |
| `npm run db:create` | Create the database named in `DATABASE_URL` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Load the starter data (safe to repeat) |
| `npm run db:generate` | Write a new migration after editing `apps/api/src/db/schema.ts` |
| `npm run db:studio` | Browse the database in Drizzle Studio |

### Running the database tests

The API tests run against a real database that they migrate, seed and write to. Point them at a **separate** database, never your real one:

```bash
TEST_DATABASE_URL=postgres://postgres:my-password@localhost:5432/cookai_test npm test
```

(On Windows PowerShell: `$env:TEST_DATABASE_URL="..."; npm test`.) Create that database first with `DATABASE_URL=<same url> npm run db:create`.

## Changing things without touching code

- **Diet filters:** add a row to `dietary_tags` (or to `apps/api/src/db/seed-data/dietary-tags.json` and re-run `npm run db:seed`). The filter buttons and the AI's allowed labels both come from this table.
- **Ingredient catalogue:** edit `seed-data/ingredients.json` and re-seed. Ingredients that appear in new recipes are added automatically under "Other".
- **Starter recipes:** edit `seed-data/recipes.json` and re-seed.

## API

All endpoints are under `/api` and return JSON. Errors look like `{ "error": { "code", "message", "fields"? } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Database and AI status |
| GET | `/meta` | Diet tags, difficulties, sort options, AI provider info |
| GET | `/ingredients` | Ingredient catalogue grouped by category |
| GET | `/recipes` | Search. Query: `ingredients` (comma-separated), `diet`, `q`, `difficulty`, `source`, `maxMinutes`, `maxCalories`, `sort` (`best-match`, `newest`, `quickest`, `lightest`), `page`, `pageSize` |
| GET | `/recipes/random` | One random recipe (optional `diet`) |
| GET | `/recipes/:id` | Full recipe |
| POST | `/recipes` | Add a recipe |
| POST | `/recipes/generate` | Write and save a recipe with AI. Body: `{ ingredients, diet?, cuisine?, notes? }` |
| DELETE | `/recipes/:id` | Delete a recipe |
| POST | `/contact` | Save a contact message |
