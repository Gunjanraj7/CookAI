/** TanStack Query hooks: one place for cache keys and fetch functions. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SearchParams } from "./api";

export const keys = {
  meta: ["meta"] as const,
  health: ["health"] as const,
  ingredients: ["ingredients"] as const,
  recipes: ["recipes"] as const,
  search: (p: SearchParams) => ["recipes", "search", p] as const,
  recipe: (id: string) => ["recipes", "detail", id] as const,
};

export const useMeta = () => useQuery({ queryKey: keys.meta, queryFn: api.meta, staleTime: 5 * 60_000 });

export const useHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: api.health, refetchInterval: 30_000, retry: false });

export const useIngredientCatalog = () =>
  useQuery({ queryKey: keys.ingredients, queryFn: api.ingredients, staleTime: 5 * 60_000 });

export const useRecipeSearch = (params: SearchParams) =>
  useQuery({ queryKey: keys.search(params), queryFn: () => api.searchRecipes(params), placeholderData: keepPreviousData });

export const useRecipe = (id: string) => useQuery({ queryKey: keys.recipe(id), queryFn: () => api.getRecipe(id) });

/** After any write, recipe lists and the ingredient catalogue may have changed. */
function useInvalidateRecipes() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.recipes });
    void qc.invalidateQueries({ queryKey: keys.ingredients });
  };
}

export function useGenerateRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({ mutationFn: api.generateRecipe, onSuccess: invalidate });
}

export function useCreateRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({ mutationFn: api.createRecipe, onSuccess: invalidate });
}

export function useDeleteRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({ mutationFn: api.deleteRecipe, onSuccess: invalidate });
}

export const useRandomRecipe = () => useMutation({ mutationFn: api.randomRecipe });

export const useSendContact = () => useMutation({ mutationFn: api.sendContact });
