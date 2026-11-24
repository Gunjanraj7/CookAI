import { Link } from "react-router";
import { useMeta } from "@/lib/queries";

export function AboutPage() {
  const meta = useMeta().data;
  const name = meta?.appName ?? "CookAI";

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-lg leading-relaxed">
      <h1 className="text-5xl font-display">About {name}</h1>
      <p>
        {name} starts from the other end of a recipe: instead of choosing a dish and shopping for it, you tell it what's
        already in your kitchen. It looks through the cookbook for dishes that use those ingredients and ranks them by how
        many you have.
      </p>
      <p>
        When nothing fits, it can write a new recipe around your ingredients with an AI model. Every recipe it writes is
        saved to the cookbook, so the next search can find it too. Recipes you add yourself go in the same place.
      </p>
      <h2 className="pt-4 text-2xl font-display">How it's set up</h2>
      <ul className="list-disc space-y-2 pl-6 text-ink-soft">
        <li>Recipes, ingredients and diet labels live in a PostgreSQL database on this computer.</li>
        <li>
          AI writing currently uses <strong className="text-ink">{meta?.ai.provider ?? "…"}</strong>
          {meta?.ai.model ? ` (${meta.ai.model})` : ""}. Change <code>AI_PROVIDER</code> in <code>.env</code> to use another.
        </li>
        <li>The diet filters and ingredient list come from the database, so adding a row there adds it here.</li>
      </ul>
      <p>
        <Link to="/" className="font-semibold underline decoration-haldi decoration-2 underline-offset-4">
          Go to the kitchen
        </Link>
      </p>
    </div>
  );
}
