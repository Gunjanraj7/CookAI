import { ArrowLeft, ExternalLink, PlayCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { RecipeMeta, SOURCE_LABEL } from "@/components/RecipeList";
import { Button, Notice, Spinner, Tag } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useDeleteRecipe, useRecipe } from "@/lib/queries";
import { capitalize, cn, errorMessage, formatQuantity } from "@/lib/utils";

/** YouTube embed URL for a watch/short link, or null if it isn't YouTube. */
function youTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v");
    return u.hostname.includes("youtu") && id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch {
    return null;
  }
}

export function RecipePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: recipe, isPending, error } = useRecipe(id);
  const remove = useDeleteRecipe();
  const [haveIngredients, setHaveIngredients] = useState<Set<string>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  if (isPending) return <Spinner label="Opening the recipe…" />;
  if (error || !recipe) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Notice
        title={notFound ? "This recipe isn't in the cookbook" : "Couldn't load this recipe"}
        action={
          <Link to="/" className="font-semibold underline">
            Back to the kitchen
          </Link>
        }
      >
        {notFound ? "It may have been deleted." : errorMessage(error)}
      </Notice>
    );
  }

  const source = SOURCE_LABEL[recipe.source];
  const embed = recipe.videoUrl ? youTubeEmbed(recipe.videoUrl) : null;
  const videoSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${recipe.name} recipe`)}`;

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  async function onDelete() {
    if (!recipe || !window.confirm(`Delete “${recipe.name}” from the cookbook? This can't be undone.`)) return;
    try {
      await remove.mutateAsync(recipe.id);
      toast.success(`Deleted “${recipe.name}”`);
      navigate("/");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <article className="space-y-12">
      <div>
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </button>

        <header className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-1.5">
              {source && <Tag tone={source.tone}>{source.text}</Tag>}
              {recipe.cuisine && <Tag>{recipe.cuisine}</Tag>}
              <Tag>{capitalize(recipe.difficulty)}</Tag>
              {recipe.dietaryTags.map((t) => (
                <Tag key={t.slug} tone="kadi">
                  {t.label}
                </Tag>
              ))}
            </div>
            <h1 className="mt-4 text-5xl font-display sm:text-6xl">{recipe.name}</h1>
            {recipe.summary && <p className="mt-4 max-w-2xl text-lg text-ink-soft">{recipe.summary}</p>}
            <RecipeMeta {...recipe} className="mt-5 text-base" />
          </div>
          {recipe.imageUrl && (
            <img
              src={recipe.imageUrl}
              alt=""
              className="aspect-square w-full max-w-xs rounded-full border-8 border-tray object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
        </header>
      </div>

      <div className="grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="text-2xl font-display">
            Ingredients
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Tick off what you've got ready.</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {recipe.ingredients.map((ing) => {
              const have = haveIngredients.has(ing.name);
              return (
                <li key={ing.name}>
                  <label className="flex cursor-pointer items-baseline gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={have}
                      onChange={() => setHaveIngredients((s) => toggle(s, ing.name))}
                      className="size-4 translate-y-0.5 accent-[var(--c-kadi)]"
                    />
                    <span className={cn("flex-1", have && "text-ink-soft line-through decoration-ink-soft/50")}>
                      <span className="font-semibold">{ing.label}</span>
                    </span>
                    <span className="text-right text-sm text-ink-soft">
                      {[formatQuantity(ing.quantity), ing.unit].filter(Boolean).join(" ")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="text-2xl font-display">
            Method
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Tap a step when it's done.</p>
          <ol className="mt-4 space-y-2">
            {recipe.instructions.map((step, i) => {
              const done = doneSteps.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={done}
                    onClick={() => setDoneSteps((s) => toggle(s, i))}
                    className={cn(
                      "flex w-full gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors",
                      done ? "bg-sunken text-ink-soft" : "bg-surface hover:bg-sunken/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        done ? "bg-kadi text-white" : "bg-haldi text-haldi-ink",
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className={cn("max-w-prose pt-1 text-[1.05rem] leading-relaxed", done && "line-through decoration-ink-soft/40")}>
                      {step}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-10 space-y-4">
            {embed ? (
              <iframe
                src={embed}
                title={`Video: ${recipe.name}`}
                className="aspect-video w-full rounded-2xl border border-line"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a
                href={recipe.videoUrl ?? videoSearch}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold underline decoration-haldi decoration-2 underline-offset-4"
              >
                <PlayCircle className="size-5" aria-hidden />
                {recipe.videoUrl ? "Watch the video" : "Find a video of this dish on YouTube"}
              </a>
            )}
            {recipe.sourceUrl && (
              <p>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
                >
                  <ExternalLink className="size-4" aria-hidden /> Original recipe
                </a>
              </p>
            )}
          </div>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-ink-soft">
        <p>
          {recipe.source === "ai" && recipe.aiProvider
            ? `Written by ${recipe.aiProvider}${recipe.aiModel ? ` (${recipe.aiModel})` : ""} on ${new Date(recipe.createdAt).toLocaleDateString()}. Check timings and seasoning as you cook.`
            : recipe.authorEmail
              ? `Shared by ${recipe.authorEmail} on ${new Date(recipe.createdAt).toLocaleDateString()}.`
              : `Added ${new Date(recipe.createdAt).toLocaleDateString()}.`}
        </p>
        <Button variant="danger" size="sm" onClick={onDelete} loading={remove.isPending}>
          {!remove.isPending && <Trash2 aria-hidden />}
          Delete recipe
        </Button>
      </footer>
    </article>
  );
}
