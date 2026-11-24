/** Typed client for the CookAI API. */
import type {
  ApiErrorBody,
  AppMeta,
  ContactInput,
  GenerateRequest,
  HealthStatus,
  IngredientCategory,
  Paginated,
  RecipeDetail,
  RecipeInput,
  RecipeSearchQuery,
  RecipeSummary,
} from "@cookai/shared";

/** Defaults to the same-origin /api path that the Vite dev server proxies. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the CookAI API. Is it running? (npm run dev)");
  }

  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? "http_error", err?.message ?? `Request failed (${res.status})`, err?.fields);
  }
  return body as T;
}

function toQuery(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) continue;
    qs.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export type SearchParams = Omit<RecipeSearchQuery, "ingredients"> & { ingredients?: string[] };

export const api = {
  health: () => request<HealthStatus>("/health"),
  meta: () => request<AppMeta>("/meta"),
  ingredients: () => request<IngredientCategory[]>("/ingredients"),

  searchRecipes: (params: SearchParams) => request<Paginated<RecipeSummary>>(`/recipes${toQuery(params)}`),
  randomRecipe: (params: { diet?: string }) => request<RecipeDetail>(`/recipes/random${toQuery(params)}`),
  getRecipe: (id: string) => request<RecipeDetail>(`/recipes/${encodeURIComponent(id)}`),
  createRecipe: (input: RecipeInput) => request<RecipeDetail>("/recipes", { method: "POST", body: JSON.stringify(input) }),
  generateRecipe: (input: GenerateRequest) =>
    request<RecipeDetail>("/recipes/generate", { method: "POST", body: JSON.stringify(input) }),
  deleteRecipe: (id: string) => request<void>(`/recipes/${encodeURIComponent(id)}`, { method: "DELETE" }),

  sendContact: (input: ContactInput) => request<{ ok: true }>("/contact", { method: "POST", body: JSON.stringify(input) }),
};
