import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** 75 → "1 hr 15 min" */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** 0.5 → "½", 1.25 → "1¼"; anything else keeps up to two decimals. */
export function formatQuantity(q: number | null): string {
  if (q === null) return "";
  const whole = Math.floor(q);
  const frac = Math.round((q - whole) * 100) / 100;
  const glyph: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
  if (frac === 0) return String(whole);
  if (glyph[frac]) return `${whole || ""}${glyph[frac]}`;
  return String(Number(q.toFixed(2)));
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Colour for an ingredient's tin, from its category (falls back to steel). */
export const CATEGORY_TINT: Record<string, string> = {
  spices: "var(--c-haldi)",
  vegetables: "var(--c-kadi)",
  fruits: "var(--c-kadi)",
  protein: "var(--c-mirch)",
  dairy: "var(--c-malai)",
  pulses: "var(--c-dalchini)",
  "nuts-seeds": "var(--c-dalchini)",
  grains: "var(--c-dalchini)",
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}
