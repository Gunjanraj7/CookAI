/**
 * The masala dabba: a round steel tray of seven tins. Each picked ingredient
 * drops into a tin, tinted by its category; click a tin to take it out.
 * A tray holds seven, so extra picks are counted in the centre tin.
 */
import { X } from "lucide-react";
import { CATEGORY_TINT, cn } from "@/lib/utils";

export interface DabbaItem {
  name: string;
  label: string;
  category?: string;
}

const RING = 6; // tins around the centre
const RADIUS = 33; // % of the tray, centre to tin

export function Dabba({ items, onRemove }: { items: DabbaItem[]; onRemove: (name: string) => void }) {
  const ring = items.slice(0, RING);
  const centre = items[RING];
  const extra = items.length - (RING + 1);

  return (
    <figure className="mx-auto w-full max-w-[22rem]" aria-label={`Your dabba: ${items.length} ingredients`}>
      <div
        className="relative aspect-square rounded-full bg-tray shadow-[inset_0_0_0_10px_var(--c-tray-rim),inset_0_14px_30px_rgb(0_0_0/0.12)]"
      >
        {Array.from({ length: RING }, (_, i) => {
          const angle = (i / RING) * 2 * Math.PI - Math.PI / 2;
          const left = 50 + RADIUS * Math.cos(angle);
          const top = 50 + RADIUS * Math.sin(angle);
          // Keyed by ingredient so a newly filled tin replays its drop.
          return <Tin key={ring[i]?.name ?? `empty-${i}`} item={ring[i]} left={left} top={top} onRemove={onRemove} />;
        })}
        <Tin key={centre?.name ?? "empty-centre"} item={centre} left={50} top={50} onRemove={onRemove} centre extra={extra > 0 ? extra : 0} />
      </div>
      <figcaption className="mt-4 text-center text-sm text-ink-soft">
        {items.length === 0
          ? "Your dabba is empty. Add what you have."
          : `${items.length} in the dabba. Tap a tin to take it out.`}
      </figcaption>
    </figure>
  );
}

function Tin({
  item,
  left,
  top,
  centre,
  extra = 0,
  onRemove,
}: {
  item?: DabbaItem;
  left: number;
  top: number;
  centre?: boolean;
  extra?: number;
  onRemove: (name: string) => void;
}) {
  const style = { left: `${left}%`, top: `${top}%` };
  const size = "w-[29%] aspect-square";

  if (!item) {
    return (
      <div
        aria-hidden
        style={style}
        className={cn(size, "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-tray-rim bg-bg/25")}
      />
    );
  }

  const tint = (item.category && CATEGORY_TINT[item.category]) || "var(--c-ink-soft)";
  return (
    <button
      type="button"
      onClick={() => onRemove(item.name)}
      aria-label={`Remove ${item.label}${extra ? ` (and ${extra} more listed below)` : ""}`}
      style={{ ...style, animation: "tin-drop 320ms cubic-bezier(.2,.9,.3,1.2) both" }}
      className={cn(
        size,
        "group absolute flex items-center justify-center rounded-full bg-surface p-1.5 text-center",
        "shadow-[0_3px_0_var(--c-tray-rim),0_6px_14px_rgb(0_0_0/0.18)] hover:brightness-105",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-[9%] rounded-full opacity-90"
        style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${tint} 75%, white), ${tint})` }}
      />
      <span className="relative line-clamp-2 px-1 text-[clamp(0.6rem,2.6vw,0.8rem)] leading-tight font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">
        {item.label}
        {centre && extra > 0 && <span className="block text-[0.9em] font-semibold">+{extra} more</span>}
      </span>
      <X
        aria-hidden
        className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-ink p-0.5 text-bg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  );
}
