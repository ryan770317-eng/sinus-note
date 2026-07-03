import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, recipeToRow, rowToRecipe, subscribeTable, subscribeUserConfig } from '../../lib/supabase';
import type { RecipeRow, UserConfigRow } from '../../lib/supabase';
import type { Recipe, FragCat } from '../../types';

/**
 * 錯誤契約（四個 store hook 一致）：
 *  - 讀取失敗 → setError（App 層統一 toast）
 *  - 寫入失敗 → throw（呼叫端 catch + toast），樂觀更新會先回滾
 *  - 例外：addRecipe 的 ID 計數器更新屬於「配方已建立後的部分失敗」，
 *    不 throw（避免誤報建立失敗），改走 setError 讓 App 提示。
 */
export function useRecipes(userId: string | null) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [nextId, setNextId] = useState(200);
  const [catOrder, setCatOrder] = useState<FragCat[] | null>(null);
  const [catImagesMap, setCatImagesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  // 最新值 refs：與 setState 同步在「寫入當下」更新（不等 re-render），
  // 連續操作（如批次寫入迴圈）之間讀到的才是最新狀態
  const recipesRef = useRef<Recipe[]>([]);
  const commitRecipes = useCallback((next: Recipe[]) => {
    recipesRef.current = next;
    setRecipes(next);
  }, []);
  const nextIdRef = useRef(200);
  const commitNextId = useCallback((n: number) => {
    nextIdRef.current = n;
    setNextId(n);
  }, []);
  const catOrderRef = useRef<FragCat[] | null>(null);
  const commitCatOrder = useCallback((o: FragCat[] | null) => {
    catOrderRef.current = o;
    setCatOrder(o);
  }, []);
  const catImagesRef = useRef<Record<string, string>>({});
  const commitCatImages = useCallback((m: Record<string, string>) => {
    catImagesRef.current = m;
    setCatImagesMap(m);
  }, []);

  // ── Fetch helpers ────────────────────────────────────────────────

  const fetchRecipes = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('recipes').select('*').eq('user_id', userId).order('id');
    if (err) { setError(`讀取配方失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    const rows = (data ?? []) as RecipeRow[];
    commitRecipes(rows.map(rowToRecipe).filter((r): r is Recipe => r !== null));
  }, [userId, commitRecipes]);

  const fetchConfig = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('user_config').select('*').eq('user_id', userId).maybeSingle();
    if (err) { setError(`讀取設定失敗: ${err.message}`); return; }
    if (suppressRef.current || !data) return;
    const row = data as UserConfigRow;
    commitNextId(row.next_id ?? 200);
    commitCatOrder((row.cat_order as FragCat[] | null) ?? null);
    commitCatImages(row.cat_images ?? {});
  }, [userId, commitNextId, commitCatOrder, commitCatImages]);

  // ── Initial load + realtime subscriptions ────────────────────────

  useEffect(() => {
    if (!userId) {
      commitRecipes([]);
      setLoading(false);
      return;
    }

    Promise.all([fetchRecipes(), fetchConfig()]).then(() => setLoading(false));

    const unsubRecipes = subscribeTable('recipes', userId, fetchRecipes);
    const unsubConfig  = subscribeUserConfig(userId, fetchConfig);

    return () => { unsubRecipes(); unsubConfig(); };
  }, [userId, fetchRecipes, fetchConfig, commitRecipes]);

  // ── suppressSync: prevents listener flicker after local writes ───

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  // ── Upsert helper for user_config (patch-only, no stale closure) ─

  const saveConfig = useCallback(async (patch: Partial<Omit<UserConfigRow, 'user_id'>>) => {
    if (!userId) return;
    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
      next_id:    'next_id'    in patch ? patch.next_id    : nextIdRef.current,
      cat_order:  'cat_order'  in patch ? patch.cat_order  : catOrderRef.current,
      cat_images: 'cat_images' in patch ? patch.cat_images : catImagesRef.current,
    };
    const { error: err } = await sb.from('user_config').upsert(payload);
    if (err) throw new Error(`儲存設定失敗: ${err.message}`);
  }, [userId]);

  // ── CRUD ──────────────────────────────────────────────────────────

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('尚未登入');
    const id = nextIdRef.current;
    const now = new Date().toISOString();
    const newRecipe: Recipe = { ...recipe, id, burnLog: recipe.burnLog ?? [], createdAt: now, updatedAt: now };
    suppressSync();
    const { error: err } = await sb.from('recipes').insert(recipeToRow(newRecipe, userId));
    if (err) throw new Error(`新增配方失敗: ${err.message}`);
    commitNextId(id + 1);
    commitRecipes([...recipesRef.current, newRecipe]);
    // 配方已建立成功；計數器更新失敗只警告，不讓整個操作報錯
    try {
      await saveConfig({ next_id: id + 1 });
    } catch (cfgErr) {
      setError(cfgErr instanceof Error ? cfgErr.message : String(cfgErr));
    }
    return newRecipe;
  }, [userId, suppressSync, saveConfig, commitNextId, commitRecipes]);

  const updateRecipe = useCallback(async (id: number, updates: Partial<Recipe>) => {
    if (!userId) throw new Error('尚未登入');
    const current = recipesRef.current.find((r) => r.id === id);
    if (!current) return;
    const updated: Recipe = { ...current, ...updates, updatedAt: new Date().toISOString() };
    suppressSync();
    commitRecipes(recipesRef.current.map((r) => (r.id === id ? updated : r)));
    const { error: err } = await sb.from('recipes').update(recipeToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    if (err) {
      commitRecipes(recipesRef.current.map((r) => (r.id === id ? current : r)));
      throw new Error(`更新配方失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitRecipes]);

  const deleteRecipe = useCallback(async (id: number) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('recipes').delete().eq('id', id).eq('user_id', userId);
    if (err) throw new Error(`刪除配方失敗: ${err.message}`);
    commitRecipes(recipesRef.current.filter((r) => r.id !== id));
  }, [userId, suppressSync, commitRecipes]);

  /** 重新插入剛刪除的配方（Undo 用） */
  const restoreRecipe = useCallback(async (recipe: Recipe) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('recipes').insert(recipeToRow(recipe, userId));
    if (err) throw new Error(`還原配方失敗: ${err.message}`);
    commitRecipes([...recipesRef.current.filter((r) => r.id !== recipe.id), recipe]);
  }, [userId, suppressSync, commitRecipes]);

  /** 批次覆蓋（匯入用）：upsert 新清單，刪除不在清單內的舊 row */
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
      if (err) throw new Error(`批次儲存配方失敗: ${err.message}`);
    }
    const newIds = new Set(newRecipes.map((r) => r.id));
    const orphans = recipesRef.current.filter((r) => !newIds.has(r.id)).map((r) => r.id);
    commitRecipes(newRecipes);
    if (orphans.length > 0) {
      const { error: err } = await sb.from('recipes').delete().in('id', orphans).eq('user_id', userId);
      if (err) throw new Error(`刪除舊配方失敗: ${err.message}`);
    }
    const configPatch: Partial<Omit<UserConfigRow, 'user_id'>> = {};
    if (newNextId !== undefined) { configPatch.next_id = newNextId; commitNextId(newNextId); }
    if (newCatOrder !== undefined) { configPatch.cat_order = newCatOrder; commitCatOrder(newCatOrder); }
    if (Object.keys(configPatch).length > 0) await saveConfig(configPatch);
  }, [userId, suppressSync, saveConfig, commitRecipes, commitNextId, commitCatOrder]);

  const saveCatImages = useCallback(async (items: Record<string, string>) => {
    suppressSync();
    await saveConfig({ cat_images: items });
    commitCatImages(items);
  }, [suppressSync, saveConfig, commitCatImages]);

  /** 只存分類排序 — 不再為了排序把整批配方 upsert 一輪 */
  const saveCatOrder = useCallback(async (order: FragCat[]) => {
    suppressSync();
    await saveConfig({ cat_order: order });
    commitCatOrder(order);
  }, [suppressSync, saveConfig, commitCatOrder]);

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
    restoreRecipe,
    saveRecipes,
    saveCatImages,
    saveCatOrder,
    suppressSync,
  };
}
