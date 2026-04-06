import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, recipeToRow, rowToRecipe, subscribeTable, subscribeUserConfig } from '../../lib/supabase';
import type { RecipeRow, UserConfigRow } from '../../lib/supabase';
import type { Recipe, FragCat } from '../../types';

export function useRecipes(userId: string | null) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [nextId, setNextId] = useState(200);
  const [catOrder, setCatOrder] = useState<FragCat[] | null>(null);
  const [catImagesMap, setCatImagesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  // Ref for nextId so addRecipe always reads the latest value (race-condition fix)
  const nextIdRef = useRef(nextId);
  nextIdRef.current = nextId;

  // Refs for saveConfig to avoid stale closure writes
  const catOrderRef = useRef(catOrder);
  catOrderRef.current = catOrder;
  const catImagesRef = useRef(catImagesMap);
  catImagesRef.current = catImagesMap;

  // ── Fetch helpers ────────────────────────────────────────────────

  const fetchRecipes = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('recipes').select('*').eq('user_id', userId).order('id');
    if (err) { setError(`讀取配方失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    const rows = (data ?? []) as RecipeRow[];
    setRecipes(rows.map(rowToRecipe).filter((r): r is Recipe => r !== null));
  }, [userId]);

  const fetchConfig = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('user_config').select('*').eq('user_id', userId).maybeSingle();
    if (err) { setError(`讀取設定失敗: ${err.message}`); return; }
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

  // ── Upsert helper for user_config (patch-only, no stale closure) ─

  const saveConfig = useCallback(async (patch: Partial<Omit<UserConfigRow, 'user_id'>>) => {
    if (!userId) return;
    // Read current values from refs, then overlay only the patch fields
    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    // Only include fields that are in the patch — don't overwrite others
    if ('next_id' in patch) payload.next_id = patch.next_id;
    else payload.next_id = nextIdRef.current;
    if ('cat_order' in patch) payload.cat_order = patch.cat_order;
    else payload.cat_order = catOrderRef.current;
    if ('cat_images' in patch) payload.cat_images = patch.cat_images;
    else payload.cat_images = catImagesRef.current;

    const { error: err } = await sb.from('user_config').upsert(payload);
    if (err) { setError(`儲存設定失敗: ${err.message}`); }
  }, [userId]);

  // ── CRUD ──────────────────────────────────────────────────────────

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('not authenticated');
    const id = nextIdRef.current;
    const now = new Date().toISOString();
    const newRecipe: Recipe = { ...recipe, id, burnLog: recipe.burnLog ?? [], createdAt: now, updatedAt: now };
    suppressSync();
    const { error: err } = await sb.from('recipes').insert(recipeToRow(newRecipe, userId));
    if (err) { setError(`新增配方失敗: ${err.message}`); throw err; }
    const { error: cfgErr } = await sb.from('user_config').upsert({
      user_id: userId,
      next_id: id + 1,
      cat_order: catOrderRef.current,
      cat_images: catImagesRef.current,
      updated_at: new Date().toISOString(),
    });
    if (cfgErr) { setError(`更新 ID 計數器失敗: ${cfgErr.message}`); }
    setNextId(id + 1);
    setRecipes((prev) => [...prev, newRecipe]);
    return newRecipe;
  }, [userId, suppressSync]);

  const updateRecipe = useCallback(async (id: number, updates: Partial<Recipe>) => {
    if (!userId) return;
    setRecipes((prev) => {
      const recipe = prev.find((r) => r.id === id);
      if (!recipe) return prev;
      const updated: Recipe = { ...recipe, ...updates, updatedAt: new Date().toISOString() };
      // Fire DB write (no need to await for optimistic update)
      sb.from('recipes').update(recipeToRow(updated, userId)).eq('id', id).eq('user_id', userId)
        .then(({ error: err }) => { if (err) setError(`更新配方失敗: ${err.message}`); });
      return prev.map((r) => (r.id === id ? updated : r));
    });
    suppressSync();
  }, [userId, suppressSync]);

  const deleteRecipe = useCallback(async (id: number) => {
    if (!userId) return;
    suppressSync();
    const { error: err } = await sb.from('recipes').delete().eq('id', id).eq('user_id', userId);
    if (err) { setError(`刪除配方失敗: ${err.message}`); return; }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, [userId, suppressSync]);

  // saveRecipes: bulk replace (used for import / merge-import).
  const saveRecipes = useCallback(async (
    newRecipes: Recipe[],
    newNextId?: number,
    newCatOrder?: FragCat[] | null,
  ) => {
    if (!userId) return;
    suppressSync();
    const rows = newRecipes.map((r) => recipeToRow(r, userId));
    if (rows.length > 0) {
      const { error: err } = await sb.from('recipes').upsert(rows);
      if (err) { setError(`批次儲存配方失敗: ${err.message}`); return; }
    }
    // Delete orphaned rows — read latest state from setter to avoid stale closure
    let orphans: number[] = [];
    setRecipes((prev) => {
      const newIds = new Set(newRecipes.map((r) => r.id));
      orphans = prev.filter((r) => !newIds.has(r.id)).map((r) => r.id);
      return newRecipes;
    });
    if (orphans.length > 0) {
      const { error: err } = await sb.from('recipes').delete().in('id', orphans).eq('user_id', userId);
      if (err) { setError(`刪除舊配方失敗: ${err.message}`); }
    }
    const configPatch: Partial<Omit<UserConfigRow, 'user_id'>> = {};
    if (newNextId !== undefined) { configPatch.next_id = newNextId; setNextId(newNextId); }
    if (newCatOrder !== undefined) { configPatch.cat_order = newCatOrder; setCatOrder(newCatOrder); }
    if (Object.keys(configPatch).length > 0) await saveConfig(configPatch);
  }, [userId, suppressSync, saveConfig]);

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
    error,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    saveRecipes,
    saveCatImages,
    suppressSync,
  };
}
