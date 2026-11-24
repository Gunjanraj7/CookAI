/**
 * Loads the repo-root `.env` and validates every setting the API uses.
 * Anything missing or malformed fails fast at startup with a readable message.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AI_PROVIDERS, type AiProviderName } from "@cookai/shared";

export const ROOT_ENV_PATH = fileURLToPath(new URL("../../../../.env", import.meta.url));

if (existsSync(ROOT_ENV_PATH)) {
  // Values already set in the real environment win over the file.
  process.loadEnvFile(ROOT_ENV_PATH);
}

/** Treats blank strings and untouched "your-...-here" placeholders as unset. */
const secret = z
  .string()
  .optional()
  .transform((v) => {
    const value = v?.trim();
    if (!value || /^your-.*-here$/i.test(value)) return undefined;
    return value;
  });

const blankAsUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("CookAI"),
  API_PORT: z.coerce.number().int().positive().default(5000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z
    .string({ error: "DATABASE_URL is missing. Copy .env.example to .env and set it." })
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL must start with postgres://"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  AI_PROVIDER: z.enum(AI_PROVIDERS).default("mock"),
  AI_MODEL: z.preprocess(blankAsUndefined, z.string().optional()),
  AI_DEFAULT_CUISINE: z.preprocess(blankAsUndefined, z.string().default("Indian")),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  AI_EFFORT: z.preprocess(blankAsUndefined, z.enum(["low", "medium", "high"]).optional()),
  GEMINI_API_KEY: secret,
  OPENAI_API_KEY: secret,
  ANTHROPIC_API_KEY: secret,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`\nInvalid configuration in ${ROOT_ENV_PATH}:\n${problems}\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

/** Default model per provider, used when AI_MODEL is left empty. */
export const DEFAULT_MODELS: Record<AiProviderName, string> = {
  mock: "template-v1",
  gemini: "gemini-flash-latest",
  openai: "gpt-5.5",
  anthropic: "claude-opus-5-5",
};

export const config = {
  appName: env.APP_NAME,
  port: env.API_PORT,
  corsOrigins: env.WEB_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
  isTest: env.NODE_ENV === "test",
  db: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX },
  ai: {
    provider: env.AI_PROVIDER,
    model: env.AI_MODEL ?? DEFAULT_MODELS[env.AI_PROVIDER],
    defaultCuisine: env.AI_DEFAULT_CUISINE,
    timeoutMs: env.AI_TIMEOUT_MS,
    effort: env.AI_EFFORT,
    keys: {
      gemini: env.GEMINI_API_KEY,
      openai: env.OPENAI_API_KEY,
      anthropic: env.ANTHROPIC_API_KEY,
    },
  },
} as const;
