import { useCallback } from 'react';
import { useFirestoreDoc } from './useFirestore';
import type { Recipe, FragCat } from '../types';
import { parseRecipes } from '../schemas';

interface ConfigDoc {
  recipes: Recipe[];
  nextId: number;
  catOrder: FragCat[] | null;
  updatedAt: unknown;
}

interface CatImagesDoc {
  items: Record<string, string>;
  updatedAt: unknown;
}

export function useRecipes(userId: string | null) {
  const config = useFirestoreDoc<ConfigDoc>(userId, 'config');
  const catImages = useFirestoreDoc<CatImagesDoc>(userId, 'catImages');

  const recipes: Recipe[] = parseRecipes(config.data?.recipes);
  const nextId: number = config.data?.nextId ?? 200;
  const catOrder: FragCat[] | null = config.data?.catOrder ?? null;
  const catImagesMap: Record<string, string> = catImages.data?.items ?? {};

  const saveRecipes = useCallback(
    async (newRecipes: Recipe[], newNextId?: number, newCatOrder?: FragCat[] | null) => {
      await config.save({
        recipes: newRecipes,
        ...(newNextId !== undefined ? { nextId: newNextId } : {}),
        ...(newCatOrder !== undefined ? { catOrder: newCatOrder } : {}),
      });
    },
    [config],
  );

  const addRecipe = useCallback(
    async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = nextId;
      const now = new Date().toISOString();
      const newRecipe: Recipe = {
        ...recipe,
        id,
        burnLog: recipe.burnLog ?? [],
        createdAt: now,
        updatedAt: now,
      };
      await saveRecipes([...recipes, newRecipe], id + 1);
      return newRecipe;
    },
    [recipes, nextId, saveRecipes],
  );

  const updateRecipe = useCallback(
    async (id: number, updates: Partial<Recipe>) => {
      const newRecipes = recipes.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r,
      );
      await saveRecipes(newRecipes);
    },
    [recipes, saveRecipes],
  );

  const deleteRecipe = useCallback(
    async (id: number) => {
      await saveRecipes(recipes.filter((r) => r.id !== id));
    },
    [recipes, saveRecipes],
  );

  const saveCatImages = useCallback(
    async (items: Record<string, string>) => {
      await catImages.save({ items });
    },
    [catImages],
  );

  return {
    recipes,
    nextId,
    catOrder,
    catImagesMap,
    loading: config.loading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    saveRecipes,
    saveCatImages,
    suppressSync: config.suppressSync,
  };
}
