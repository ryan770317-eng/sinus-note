import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, recipeToRow, rowToRecipe, subscribeTable, subscribeUserConfig } from '../../lib/supabase';
import type { RecipeRow, UserConfigRow } from '../../lib/supabase';
import type { Recipe, FragCat } from '../../types';

// Mirrors the return shape of the Firebase useRecipes hook.
export function useRecipes(userId: string | null) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [nextId, setNextId] = useState(200);
  const [catOrder, setCatOrder] = useState<FragCat[] | null>(null);
  const [catImagesMap, setCatImagesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const suppressRef = useRef(false);

  // ── Fetch helpers ────────────────────────────────────────────────

  const fetchRecipes = useCallback(async () => {
    if (!userId) return;
    const { data } = await sb.from('recipes').select('*').eq('user_id', userId).order('id');
    if (suppressRef.current) return;
    const rows = (data ?? []) as RecipeRow[];
    setRecipes(rows.map(rowToRecipe).filter((r): r is Recipe => r !== null));
  }, [userId]);

  const fetchConfig = useCallback(async () => {
    if (!userId) return;
    const { data } = await sb.from('user_config').select('*').eq('user_id', userId).maybeSingle();
    if (suppressRef.current || !data) return;
    const row = data as UserConfigRow;
    setNextId(row.next_id ?? 200);
    setCatOrder((row.cat_order as FragCat[] | null) ?? null);
    setCatImagesMap(row.cat_images ?? {});
  }, [userId]);

  // ── Initial load + realtime subscriptions ────────────────────────

  useEffect(() => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    Promise.all([fetchRecipes(), fetchConfig()]).then(() => setLoading(false));

    const unsubRecipes = subscribeTable('recipes', userId, fetchRecipes);
    const unsubConfig  = subscribeUserConfig(userId, fetchConfig);

    return () => { unsubRecipes(); unsubConfig(); };
  }, [userId, fetchRecipes, fetchConfig]);

  // ── suppressSync: prevents listener flicker after local writes ───

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  // ── Upsert helper for user_config ────────────────────────────────

  const saveConfig = useCallback(async (patch: Partial<Omit<UserConfigRow, 'user_id'>>) => {
    if (!userId) return;
    await sb.from('user_config').upsert({
      user_id: userId,
      next_id: nextId,
      cat_order: catOrder,
      cat_images: catImagesMap,
      ...patch,
      updated_at: new Date().toISOString(),
    });
  }, [userId, nextId, catOrder, catImagesMap]);

  // ── CRUD ──────────────────────────────────────────────────────────

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('not authenticated');
    const id = nextId;
    const now = new Date().toISOString();
    const newRecipe: Recipe = { ...recipe, id, burnLog: recipe.burnLog ?? [], createdAt: now, updatedAt: now };
    suppressSync();
    await sb.from('recipes').insert(recipeToRow(newRecipe, userId));
    await saveConfig({ next_id: id + 1 });
    setNextId(id + 1);
    setRecipes((prev) => [...prev, newRecipe]);
    return newRecipe;
  }, [userId, nextId, suppressSync, saveConfig]);

  const updateRecipe = useCallback(async (id: number, updates: Partial<Recipe>) => {
    if (!userId) return;
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    const updated: Recipe = { ...recipe, ...updates, updatedAt: new Date().toISOString() };
    suppressSync();
    await sb.from('recipes').update(recipeToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    setRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, [userId, recipes, suppressSync]);

  const deleteRecipe = useCallback(async (id: number) => {
    if (!userId) return;
    suppressSync();
    await sb.from('recipes').delete().eq('id', id).eq('user_id', userId);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, [userId, suppressSync]);

  // saveRecipes: bulk replace (used for import / merge-import).
  // Upserts all given recipes and removes any rows not in the new list.
  const saveRecipes = useCallback(async (
    newRecipes: Recipe[],
    newNextId?: number,
    newCatOrder?: FragCat[] | null,
  ) => {
    if (!userId) return;
    suppressSync();
    const rows = newRecipes.map((r) => recipeToRow(r, userId));
    if (rows.length > 0) {
      await sb.from('recipes').upsert(rows);
    }
    // Delete orphaned rows (IDs no longer in the new list)
    const newIds = new Set(newRecipes.map((r) => r.id));
    const orphans = recipes.filter((r) => !newIds.has(r.id)).map((r) => r.id);
    if (orphans.length > 0) {
      await sb.from('recipes').delete().in('id', orphans).eq('user_id', userId);
    }
    const configPatch: Partial<Omit<UserConfigRow, 'user_id'>> = {};
    if (newNextId !== undefined) configPatch.next_id = newNextId;
    if (newCatOrder !== undefined) configPatch.cat_order = newCatOrder;
    if (Object.keys(configPatch).length > 0) await saveConfig(configPatch);
    setRecipes(newRecipes);
    if (newNextId !== undefined) setNextId(newNextId);
    if (newCatOrder !== undefined) setCatOrder(newCatOrder);
  }, [userId, recipes, suppressSync, saveConfig]);

  const saveCatImages = useCallback(async (items: Record<string, string>) => {
    suppressSync();
    await saveConfig({ cat_images: items });
    setCatImagesMap(items);
  }, [suppressSync, saveConfig]);

  return {
    recipes,
    nextId,
    catOrder,
    catImagesMap,
    loading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    saveRecipes,
    saveCatImages,
    suppressSync,
  };
}
