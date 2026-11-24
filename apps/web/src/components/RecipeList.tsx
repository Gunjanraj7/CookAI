import type { RecipeSource, RecipeSummary } from "@cookai/shared";
import { Clock, Flame, Users } from "lucide-react";
import { Link } from "react-router";
import { cn, formatMinutes } from "@/lib/utils";
import { Tag } from "./ui";

export const SOURCE_LABEL: Record<RecipeSource, { text: string; tone: "haldi" | "kadi" | "plain" } | null> = {
  ai: { text: "Written by AI", tone: "haldi" },
  user: { text: "From a cook", tone: "kadi" },
  seed: null,
};

export function RecipeMeta({
  prepMinutes,
  caloriesPerServing,
  servings,
  className,
}: Pick<RecipeSummary, "prepMinutes" | "caloriesPerServing" | "servings"> & { className?: string }) {
  return (
    <dl className={cn("flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft", className)}>
      <div className="flex items-center gap-1.5">
        <dt>
          <Clock className="size-4" aria-label="Time" />
        </dt>
        <dd>{formatMinutes(prepMinutes)}</dd>
      </div>
      {caloriesPerServing !== null && (
        <div className="flex items-center gap-1.5">
          <dt>
            <Flame className="size-4" aria-label="Calories per serving" />
          </dt>
          <dd>{caloriesPerServing} kcal</dd>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <dt>
          <Users className="size-4" aria-label="Servings" />
        </dt>
        <dd>Serves {servings}</dd>
      </div>
    </dl>
  );
}

/** "Uses 3 of your 4" with one dot per searched ingredient. */
function MatchMeter({ matched, of }: { matched: number; of: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={cn("size-2.5 rounded-full", i < matched ? "bg-haldi" : "bg-line")} />
        ))}
      </span>
      <span className="font-medium">
        Uses {matched} of your {of}
      </span>
    </div>
  );
}

export function RecipeList({ recipes, searchedCount }: { recipes: RecipeSummary[]; searchedCount: number }) {
  return (
    <ul className="grid gap-x-8 md:grid-cols-2">
      {recipes.map((r) => {
        const source = SOURCE_LABEL[r.source];
        return (
          <li key={r.id} className="border-t border-line">
            <Link to={`/recipes/${r.id}`} className="group block rounded-lg py-5 focus-visible:outline-offset-4">
              {searchedCount > 0 && <MatchMeter matched={r.matchedCount} of={searchedCount} />}
              <h3 className="mt-2 text-2xl font-display group-hover:underline group-hover:decoration-haldi group-hover:decoration-3 group-hover:underline-offset-4">
                {r.name}
              </h3>
              {r.summary && <p className="mt-1 line-clamp-2 max-w-prose text-ink-soft">{r.summary}</p>}
              <RecipeMeta {...r} className="mt-3" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {source && <Tag tone={source.tone}>{source.text}</Tag>}
                {r.cuisine && <Tag>{r.cuisine}</Tag>}
                {r.dietaryTags.map((t) => (
                  <Tag key={t.slug}>{t.label}</Tag>
                ))}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
