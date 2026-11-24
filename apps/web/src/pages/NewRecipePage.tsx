import { zodResolver } from "@hookform/resolvers/zod";
import { DIFFICULTIES, type RecipeInput } from "@cookai/shared";
import { Plus, X } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { flattenCatalog } from "@/components/IngredientPicker";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useCreateRecipe, useIngredientCatalog, useMeta } from "@/lib/queries";
import { capitalize, errorMessage } from "@/lib/utils";

const wholeNumber = (label: string, { min, max, optional }: { min: number; max: number; optional?: boolean }) =>
  z
    .string()
    .trim()
    .refine((v) => (optional && v === "") || (/^\d+$/.test(v) && +v >= min && +v <= max), {
      message: `${label} must be a whole number from ${min} to ${max}`,
    });

/** Form values are all strings (as typed); they're converted on submit. */
const formSchema = z.object({
  name: z.string().trim().min(1, "Give the recipe a name").max(120),
  summary: z.string().trim().max(400),
  cuisine: z.string().trim().max(60),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Name the ingredient, or remove this row").max(80),
        quantity: z
          .string()
          .trim()
          .refine((v) => v === "" || (Number(v) > 0 && Number.isFinite(Number(v))), "Use a number like 2 or 0.5"),
        unit: z.string().trim().max(30),
      }),
    )
    .min(1, "Add at least one ingredient"),
  steps: z.array(z.object({ text: z.string().trim().min(1, "Describe this step, or remove it").max(1000) })).min(1),
  prepMinutes: wholeNumber("Time", { min: 1, max: 1440 }),
  servings: wholeNumber("Servings", { min: 1, max: 100 }),
  caloriesPerServing: wholeNumber("Calories", { min: 0, max: 10000, optional: true }),
  difficulty: z.enum(DIFFICULTIES),
  dietaryTags: z.array(z.string()),
  imageUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Use a full https:// link" })]),
  authorEmail: z.union([z.literal(""), z.email("That email doesn't look right")]),
});
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  name: "",
  summary: "",
  cuisine: "",
  ingredients: [{ name: "", quantity: "", unit: "" }],
  steps: [{ text: "" }],
  prepMinutes: "",
  servings: "2",
  caloriesPerServing: "",
  difficulty: "easy",
  dietaryTags: [],
  imageUrl: "",
  authorEmail: "",
};

function toRecipeInput(v: FormValues): RecipeInput {
  return {
    name: v.name,
    summary: v.summary || undefined,
    cuisine: v.cuisine || undefined,
    ingredients: v.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity ? Number(i.quantity) : null,
      unit: i.unit || null,
    })),
    instructions: v.steps.map((s) => s.text),
    prepMinutes: Number(v.prepMinutes),
    servings: Number(v.servings),
    caloriesPerServing: v.caloriesPerServing ? Number(v.caloriesPerServing) : null,
    difficulty: v.difficulty,
    dietaryTags: v.dietaryTags,
    imageUrl: v.imageUrl,
    authorEmail: v.authorEmail,
  };
}

/** Server field paths ("instructions.2") → form paths ("steps.2.text"). */
function toFormPath(path: string): FieldPath<FormValues> | null {
  if (path.startsWith("instructions")) {
    const [, index] = path.split(".");
    return index !== undefined ? (`steps.${index}.text` as FieldPath<FormValues>) : "steps";
  }
  return path in EMPTY || path.startsWith("ingredients") ? (path as FieldPath<FormValues>) : null;
}

export function NewRecipePage() {
  const navigate = useNavigate();
  const meta = useMeta().data;
  const catalog = useIngredientCatalog().data;
  const create = useCreateRecipe();
  const datalistId = useId();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY, mode: "onTouched" });

  const ingredientRows = useFieldArray({ control, name: "ingredients" });
  const stepRows = useFieldArray({ control, name: "steps" });

  async function onSubmit(values: FormValues) {
    try {
      const recipe = await create.mutateAsync(toRecipeInput(values));
      toast.success(`Added “${recipe.name}” to the cookbook`);
      navigate(`/recipes/${recipe.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [path, message] of Object.entries(err.fields)) {
          const formPath = toFormPath(path);
          if (formPath) setError(formPath, { message });
        }
      }
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-5xl font-display">Add a recipe</h1>
      <p className="mt-3 text-lg text-ink-soft">Share something you cook. It goes straight into the cookbook and shows up in searches.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 space-y-10">
        <section className="space-y-5">
          <Field label="Recipe name" error={errors.name?.message}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} {...register("name")} placeholder="Baingan bharta" />
            )}
          </Field>
          <Field label="One-line description" hint="Optional" error={errors.summary?.message}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} {...register("summary")} placeholder="Smoky mashed aubergine with onion and tomato" />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Cuisine" hint="Optional" error={errors.cuisine?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} {...register("cuisine")} placeholder={meta?.ai.defaultCuisine ?? ""} />
              )}
            </Field>
            <Field label="Difficulty" error={errors.difficulty?.message}>
              {({ id, describedBy }) => (
                <Select id={id} aria-describedby={describedBy} {...register("difficulty")}>
                  {(meta?.difficulties ?? DIFFICULTIES).map((d) => (
                    <option key={d} value={d}>
                      {capitalize(d)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Total time (minutes)" error={errors.prepMinutes?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} inputMode="numeric" aria-describedby={describedBy} aria-invalid={invalid} {...register("prepMinutes")} placeholder="40" />
              )}
            </Field>
            <Field label="Servings" error={errors.servings?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} inputMode="numeric" aria-describedby={describedBy} aria-invalid={invalid} {...register("servings")} />
              )}
            </Field>
            <Field label="Calories per serving" hint="Optional" error={errors.caloriesPerServing?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} inputMode="numeric" aria-describedby={describedBy} aria-invalid={invalid} {...register("caloriesPerServing")} />
              )}
            </Field>
          </div>
        </section>

        <fieldset className="space-y-3">
          <legend className="text-2xl font-display">Ingredients</legend>
          <p className="text-sm text-ink-soft">Pick from the list or type anything new. Leave the amount empty for “to taste”.</p>
          <datalist id={datalistId}>
            {flattenCatalog(catalog).map((i) => (
              <option key={i.name} value={i.label} />
            ))}
          </datalist>
          <div className="space-y-2">
            {ingredientRows.fields.map((row, i) => {
              const err = errors.ingredients?.[i];
              return (
                <div key={row.id}>
                  <div className="grid grid-cols-[minmax(0,1fr)_3.75rem_5rem_auto] gap-1.5 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_auto] sm:gap-2">
                    <Input list={datalistId} aria-label={`Ingredient ${i + 1}`} aria-invalid={Boolean(err?.name)} placeholder="Ingredient" {...register(`ingredients.${i}.name`)} />
                    <Input aria-label={`Amount for ingredient ${i + 1}`} aria-invalid={Boolean(err?.quantity)} inputMode="decimal" placeholder="1" {...register(`ingredients.${i}.quantity`)} />
                    <Input aria-label={`Unit for ingredient ${i + 1}`} placeholder="cup" {...register(`ingredients.${i}.unit`)} />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ingredient ${i + 1}`}
                      disabled={ingredientRows.fields.length === 1}
                      onClick={() => ingredientRows.remove(i)}
                    >
                      <X />
                    </Button>
                  </div>
                  {(err?.name || err?.quantity) && <p className="mt-1 text-sm text-mirch">{err.name?.message ?? err.quantity?.message}</p>}
                </div>
              );
            })}
          </div>
          {errors.ingredients?.root && <p className="text-sm text-mirch">{errors.ingredients.root.message}</p>}
          <Button size="sm" onClick={() => ingredientRows.append({ name: "", quantity: "", unit: "" })}>
            <Plus aria-hidden /> Add ingredient
          </Button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-2xl font-display">Method</legend>
          <ol className="space-y-2">
            {stepRows.fields.map((row, i) => (
              <li key={row.id} className="flex gap-3">
                <span className="mt-2.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-haldi text-sm font-bold text-haldi-ink" aria-hidden>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <Textarea
                    aria-label={`Step ${i + 1}`}
                    aria-invalid={Boolean(errors.steps?.[i]?.text)}
                    className="min-h-20"
                    {...register(`steps.${i}.text`)}
                  />
                  {errors.steps?.[i]?.text && <p className="mt-1 text-sm text-mirch">{errors.steps[i]?.text?.message}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1"
                  aria-label={`Remove step ${i + 1}`}
                  disabled={stepRows.fields.length === 1}
                  onClick={() => stepRows.remove(i)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ol>
          <Button size="sm" onClick={() => stepRows.append({ text: "" })}>
            <Plus aria-hidden /> Add step
          </Button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-2xl font-display">Diet</legend>
          <p className="text-sm text-ink-soft">Tick every one that applies.</p>
          <div className="flex flex-wrap gap-2">
            {(meta?.dietaryTags ?? []).map((t) => (
              <label
                key={t.slug}
                title={t.description ?? undefined}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm has-checked:border-kadi has-checked:bg-kadi/10"
              >
                <input type="checkbox" value={t.slug} {...register("dietaryTags")} className="accent-[var(--c-kadi)]" />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="Photo link" hint="Optional. A direct https:// image URL" error={errors.imageUrl?.message}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="url" aria-describedby={describedBy} aria-invalid={invalid} {...register("imageUrl")} />
            )}
          </Field>
          <Field label="Your email" hint="Optional. Shown on the recipe as its author" error={errors.authorEmail?.message}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="email" aria-describedby={describedBy} aria-invalid={invalid} {...register("authorEmail")} />
            )}
          </Field>
        </section>

        <div className="flex gap-3 border-t border-line pt-6">
          <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
            Add to cookbook
          </Button>
          <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
