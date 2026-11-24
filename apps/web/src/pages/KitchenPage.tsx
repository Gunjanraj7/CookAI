import { normalizeIngredientName, type SortOption } from "@cookai/shared";
import { Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Dabba, type DabbaItem } from "@/components/Dabba";
import { flattenCatalog, IngredientPicker } from "@/components/IngredientPicker";
import { RecipeList } from "@/components/RecipeList";
import { Button, Input, Notice, Select, Spinner } from "@/components/ui";
import { useGenerateRecipe, useIngredientCatalog, useMeta, useRandomRecipe, useRecipeSearch } from "@/lib/queries";
import { cn, errorMessage } from "@/lib/utils";

const SORT_LABELS: Record<SortOption, string> = {
  "best-match": "Best match",
  newest: "Newest",
  quickest: "Quickest",
  lightest: "Fewest calories",
};

const PAGE_SIZE = 12;

const titleCase = (s: string) => s.replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());

export function KitchenPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const meta = useMeta().data;
  const catalog = useIngredientCatalog().data;

  // Everything the search depends on lives in the URL, so it survives reloads and can be shared.
  const selected = useMemo(() => (params.get("i") ?? "").split(",").map(normalizeIngredientName).filter(Boolean), [params]);
  const diet = params.get("diet") ?? "";
  const sort = (params.get("sort") as SortOption | null) ?? "best-match";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const update = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (!("page" in changes)) next.delete("page");
        return next;
      },
      { replace: true },
    );

  const setSelected = (names: string[]) => update({ i: names.join(",") || null });

  const search = useRecipeSearch({ ingredients: selected, diet: diet || undefined, sort, page, pageSize: PAGE_SIZE });
  const generate = useGenerateRecipe();
  const random = useRandomRecipe();
  const [cuisine, setCuisine] = useState("");
  const [notes, setNotes] = useState("");

  const flat = useMemo(() => flattenCatalog(catalog), [catalog]);
  const dabbaItems: DabbaItem[] = selected.map((name) => {
    const hit = flat.find((c) => c.name === name);
    return { name, label: hit?.label ?? titleCase(name), category: hit?.category };
  });

  async function onGenerate() {
    try {
      const recipe = await generate.mutateAsync({
        ingredients: selected,
        diet: diet || undefined,
        cuisine: cuisine.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`Saved “${recipe.name}” to your cookbook`);
      navigate(`/recipes/${recipe.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onSurprise() {
    try {
      const recipe = await random.mutateAsync({ diet: diet || undefined });
      navigate(`/recipes/${recipe.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const aiReady = meta?.ai.ready ?? true;
  const results = search.data;
  const totalPages = results ? Math.max(1, Math.ceil(results.total / results.pageSize)) : 1;

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="space-y-7">
          <div>
            <h1 className="text-5xl font-display sm:text-7xl">What's in your kitchen?</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              Add what you have. CookAI finds recipes that use it, or writes a new one around it.
            </p>
          </div>

          <div className="lg:hidden">
            <Dabba items={dabbaItems} onRemove={(n) => setSelected(selected.filter((s) => s !== n))} />
          </div>

          <IngredientPicker categories={catalog} selected={selected} onAdd={(n) => setSelected([...selected, n])} />

          {dabbaItems.length > 7 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span>Also in the dabba:</span>
              {dabbaItems.slice(7).map((d) => (
                <button
                  key={d.name}
                  type="button"
                  className="underline decoration-line underline-offset-2 hover:decoration-mirch"
                  aria-label={`Remove ${d.label}`}
                  onClick={() => setSelected(selected.filter((s) => s !== d.name))}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Diet</legend>
            <div className="flex flex-wrap gap-2">
              {[{ slug: "", label: "Any" }, ...(meta?.dietaryTags ?? [])].map((t) => (
                <label
                  key={t.slug || "any"}
                  className={cn(
                    "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-haldi",
                    diet === t.slug ? "border-ink bg-ink text-bg" : "border-line hover:border-ink-soft",
                  )}
                >
                  <input
                    type="radio"
                    name="diet"
                    value={t.slug}
                    checked={diet === t.slug}
                    onChange={() => update({ diet: t.slug || null })}
                    className="sr-only"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={onGenerate}
                loading={generate.isPending}
                disabled={!selected.length || !aiReady}
              >
                {!generate.isPending && <Sparkles aria-hidden />}
                {generate.isPending ? "Writing your recipe…" : "Write a recipe with AI"}
              </Button>
              <Button size="lg" onClick={onSurprise} loading={random.isPending}>
                {!random.isPending && <Shuffle aria-hidden />}
                Surprise me
              </Button>
              {selected.length > 0 && (
                <Button variant="ghost" onClick={() => setSelected([])}>
                  Empty the dabba
                </Button>
              )}
            </div>

            {generate.isPending && (
              <p className="text-sm text-ink-soft" role="status">
                This can take up to a minute with a real AI model.
              </p>
            )}
            {!aiReady && meta && (
              <p className="text-sm text-mirch">
                AI writing is off: the {meta.ai.provider} API key isn't set. Add it to <code>.env</code> and restart the
                API.
              </p>
            )}
            {aiReady && meta?.ai.provider === "mock" && (
              <p className="text-sm text-ink-soft">
                AI is in template mode. Set <code>AI_PROVIDER</code> and a key in <code>.env</code> for real recipes.
              </p>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-ink-soft hover:text-ink">AI recipe options</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="font-semibold">Cuisine</span>
                  <Input
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder={meta?.ai.defaultCuisine ?? "Any"}
                    maxLength={60}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="font-semibold">Anything else?</span>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Less oil, ready in 20 minutes…"
                    maxLength={300}
                  />
                </label>
              </div>
            </details>
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:block">
          <Dabba items={dabbaItems} onRemove={(n) => setSelected(selected.filter((s) => s !== n))} />
        </aside>
      </section>

      <section aria-labelledby="results-heading" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="results-heading" className="text-3xl font-display">
              {selected.length ? "Recipes that use your ingredients" : "From the cookbook"}
            </h2>
            {results && (
              <p className="mt-1 text-ink-soft">
                {results.total} {results.total === 1 ? "recipe" : "recipes"}
                {search.isFetching && <span className="ml-2 text-sm">(updating)</span>}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Sort</span>
            <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-9 w-auto rounded-full text-sm">
              {(meta?.sortOptions ?? (Object.keys(SORT_LABELS) as SortOption[])).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {search.isPending ? (
          <Spinner label="Looking through the cookbook…" />
        ) : search.isError ? (
          <Notice title="Couldn't load recipes">{errorMessage(search.error)}</Notice>
        ) : results && results.items.length === 0 ? (
          <Notice
            title={selected.length ? "No recipe uses these ingredients yet" : "The cookbook is empty"}
            action={
              selected.length ? (
                <Button variant="primary" onClick={onGenerate} disabled={!aiReady} loading={generate.isPending}>
                  Write one with AI
                </Button>
              ) : undefined
            }
          >
            {selected.length
              ? "Try removing an ingredient or choosing a different diet, or let AI write one."
              : "Run npm run db:seed to load the starter recipes."}
          </Notice>
        ) : results ? (
          <>
            <RecipeList recipes={results.items} searchedCount={selected.length} />
            {totalPages > 1 && (
              <nav aria-label="Pages" className="flex items-center justify-between border-t border-line pt-5">
                <Button size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  Previous
                </Button>
                <span className="text-sm text-ink-soft">
                  Page {page} of {totalPages}
                </span>
                <Button size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
                  Next
                </Button>
              </nav>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
