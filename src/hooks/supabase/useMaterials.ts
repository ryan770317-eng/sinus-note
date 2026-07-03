import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, materialToRow, rowToMaterial, subscribeTable } from '../../lib/supabase';
import type { MaterialRow } from '../../lib/supabase';
import type { Material } from '../../types';
import { uid } from '../../utils/id';

/**
 * 錯誤契約（四個 store hook 一致）：
 *  - 讀取失敗 → setError（App 層統一 toast）
 *  - 寫入失敗 → throw（呼叫端 catch + toast），樂觀更新會先回滾
 */
export function useMaterials(userId: string | null) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  // 最新值 ref：與 setState 同步在「寫入當下」更新（不等 re-render），
  // 連續操作（如批次寫入迴圈）之間讀到的才是最新狀態
  const materialsRef = useRef<Material[]>([]);
  const commitMaterials = useCallback((next: Material[]) => {
    materialsRef.current = next;
    setMaterials(next);
  }, []);

  const fetchMaterials = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('materials').select('*').eq('user_id', userId).order('name');
    if (err) { setError(`讀取材料失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    const rows = (data ?? []) as MaterialRow[];
    commitMaterials(rows.map(rowToMaterial).filter((m): m is Material => m !== null));
  }, [userId, commitMaterials]);

  useEffect(() => {
    if (!userId) { commitMaterials([]); setLoading(false); return; }
    fetchMaterials().then(() => setLoading(false));
    const unsub = subscribeTable('materials', userId, fetchMaterials);
    return unsub;
  }, [userId, fetchMaterials, commitMaterials]);

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  /** 批次覆蓋（匯入用）：upsert 新清單，刪除不在清單內的舊 row */
  const saveMaterials = useCallback(async (items: Material[]) => {
    if (!userId) return;
    suppressSync();
    if (items.length > 0) {
      const { error: err } = await sb.from('materials').upsert(items.map((m) => materialToRow(m, userId)));
      if (err) throw new Error(`批次儲存材料失敗: ${err.message}`);
    }
    const newIds = new Set(items.map((m) => m.id));
    const orphans = materialsRef.current.filter((m) => !newIds.has(m.id)).map((m) => m.id);
    commitMaterials(items);
    if (orphans.length > 0) {
      const { error: err } = await sb.from('materials').delete().in('id', orphans).eq('user_id', userId);
      if (err) throw new Error(`刪除舊材料失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitMaterials]);

  const addMaterial = useCallback(async (mat: Omit<Material, 'id'>) => {
    if (!userId) throw new Error('尚未登入');
    const id = uid('mu');
    const newMat: Material = { ...mat, id };
    suppressSync();
    const { error: err } = await sb.from('materials').insert(materialToRow(newMat, userId));
    if (err) throw new Error(`新增材料失敗: ${err.message}`);
    commitMaterials([...materialsRef.current, newMat]);
    return newMat;
  }, [userId, suppressSync, commitMaterials]);

  const updateMaterial = useCallback(async (id: string, updates: Partial<Material>) => {
    if (!userId) throw new Error('尚未登入');
    const current = materialsRef.current.find((m) => m.id === id);
    if (!current) return;
    const updated = { ...current, ...updates };
    suppressSync();
    commitMaterials(materialsRef.current.map((m) => (m.id === id ? updated : m)));
    const { error: err } = await sb.from('materials').update(materialToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    if (err) {
      // 寫入失敗 → 回滾樂觀更新，畫面回到真實狀態
      commitMaterials(materialsRef.current.map((m) => (m.id === id ? current : m)));
      throw new Error(`更新材料失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitMaterials]);

  const deleteMaterial = useCallback(async (id: string) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('materials').delete().eq('id', id).eq('user_id', userId);
    if (err) throw new Error(`刪除材料失敗: ${err.message}`);
    commitMaterials(materialsRef.current.filter((m) => m.id !== id));
  }, [userId, suppressSync, commitMaterials]);

  /** 重新插入剛刪除的材料（Undo 用） */
  const restoreMaterial = useCallback(async (mat: Material) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('materials').insert(materialToRow(mat, userId));
    if (err) throw new Error(`還原材料失敗: ${err.message}`);
    commitMaterials([...materialsRef.current.filter((m) => m.id !== mat.id), mat]);
  }, [userId, suppressSync, commitMaterials]);

  return {
    materials,
    materialNames: materials.map((m) => m.name),
    loading,
    error,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    restoreMaterial,
    saveMaterials,
    suppressSync,
  };
}
