/**
 * Type-ahead ingredient search over the catalogue from the API, with a
 * browse-by-category panel. Unknown ingredients can be added as typed.
 */
import { normalizeIngredientName, type IngredientCategory } from "@cookai/shared";
import { Plus, Search } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface CatalogEntry {
  name: string;
  label: string;
  category: string;
}

export function flattenCatalog(categories: IngredientCategory[] | undefined): CatalogEntry[] {
  return (categories ?? []).flatMap((c) => c.ingredients.map((i) => ({ ...i, category: c.slug })));
}

const MAX_SUGGESTIONS = 8;

export function IngredientPicker({
  categories,
  selected,
  onAdd,
}: {
  categories: IngredientCategory[] | undefined;
  selected: string[];
  onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const catalog = useMemo(() => flattenCatalog(categories), [categories]);
  const chosen = useMemo(() => new Set(selected), [selected]);
  const q = normalizeIngredientName(query);

  const suggestions = useMemo(() => {
    if (!q) return [];
    const available = catalog.filter((i) => !chosen.has(i.name) && i.name.includes(q));
    // Names that start with the query first.
    available.sort((a, b) => Number(!a.name.startsWith(q)) - Number(!b.name.startsWith(q)) || a.label.localeCompare(b.label));
    return available.slice(0, MAX_SUGGESTIONS);
  }, [catalog, chosen, q]);

  const exact = catalog.some((i) => i.name === q);
  const options: { name: string; label: string; custom?: boolean }[] =
    q && !exact && !chosen.has(q) ? [...suggestions, { name: q, label: query.trim(), custom: true }] : suggestions;

  function add(name: string) {
    onAdd(name);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[active];
      if (option) add(option.name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && options.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Add an ingredient"
          placeholder="Add an ingredient: paneer, okra, toor dal…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-14 w-full rounded-2xl border border-line bg-surface pr-4 pl-12 text-lg placeholder:text-ink-soft/70 hover:border-ink-soft/60 focus:border-ink focus:outline-none"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10"
          >
            {options.map((o, i) => (
              <li
                key={o.name + (o.custom ? "-custom" : "")}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(o.name)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2",
                  i === active && "bg-sunken",
                )}
              >
                {o.custom ? (
                  <>
                    <Plus className="size-4 text-ink-soft" aria-hidden /> Add “{o.label}”
                  </>
                ) : (
                  o.label
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {categories && categories.length > 0 && (
        <details className="group rounded-2xl border border-line bg-surface/60 px-4 py-2 open:pb-4">
          <summary className="cursor-pointer py-1 text-sm font-semibold text-ink-soft marker:text-ink-soft hover:text-ink">
            Browse the pantry
          </summary>
          <div className="mt-3 space-y-4">
            {categories.map((c) => (
              <div key={c.slug}>
                <p className="mb-1.5 text-sm font-semibold">{c.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.ingredients.map((i) => {
                    const isIn = chosen.has(i.name);
                    return (
                      <button
                        key={i.name}
                        type="button"
                        disabled={isIn}
                        onClick={() => onAdd(i.name)}
                        className="rounded-full border border-line px-2.5 py-1 text-sm hover:border-ink disabled:border-transparent disabled:bg-sunken disabled:text-ink-soft"
                      >
                        {i.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
