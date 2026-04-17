import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, materialToRow, rowToMaterial, subscribeTable } from '../../lib/supabase';
import type { MaterialRow } from '../../lib/supabase';
import type { Material } from '../../types';
import { uid } from '../../utils/id';

export function useMaterials(userId: string | null) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  const fetchMaterials = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('materials').select('*').eq('user_id', userId).order('name');
    if (err) { setError(`讀取材料失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    const rows = (data ?? []) as MaterialRow[];
    setMaterials(rows.map(rowToMaterial).filter((m): m is Material => m !== null));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setMaterials([]); setLoading(false); return; }
    fetchMaterials().then(() => setLoading(false));
    const unsub = subscribeTable('materials', userId, fetchMaterials);
    return unsub;
  }, [userId, fetchMaterials]);

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  const saveMaterials = useCallback(async (items: Material[]) => {
    if (!userId) return;
    suppressSync();
    if (items.length > 0) {
      const { error: err } = await sb.from('materials').upsert(items.map((m) => materialToRow(m, userId)));
      if (err) { setError(`批次儲存材料失敗: ${err.message}`); return; }
    }
    let orphans: string[] = [];
    setMaterials((prev) => {
      const newIds = new Set(items.map((m) => m.id));
      orphans = prev.filter((m) => !newIds.has(m.id)).map((m) => m.id);
      return items;
    });
    if (orphans.length > 0) {
      const { error: err } = await sb.from('materials').delete().in('id', orphans).eq('user_id', userId);
      if (err) { setError(`刪除舊材料失敗: ${err.message}`); }
    }
  }, [userId, suppressSync]);

  const addMaterial = useCallback(async (mat: Omit<Material, 'id'>) => {
    if (!userId) throw new Error('not authenticated');
    const id = uid('mu');
    const newMat: Material = { ...mat, id };
    suppressSync();
    const { error: err } = await sb.from('materials').insert(materialToRow(newMat, userId));
    if (err) { setError(`新增材料失敗: ${err.message}`); throw err; }
    setMaterials((prev) => [...prev, newMat]);
    return newMat;
  }, [userId, suppressSync]);

  const updateMaterial = useCallback(async (id: string, updates: Partial<Material>) => {
    if (!userId) return;
    setMaterials((prev) => {
      const mat = prev.find((m) => m.id === id);
      if (!mat) return prev;
      const updated = { ...mat, ...updates };
      sb.from('materials').update(materialToRow(updated, userId)).eq('id', id).eq('user_id', userId)
        .then(({ error: err }) => { if (err) setError(`更新材料失敗: ${err.message}`); });
      return prev.map((m) => (m.id === id ? updated : m));
    });
    suppressSync();
  }, [userId, suppressSync]);

  const deleteMaterial = useCallback(async (id: string) => {
    if (!userId) return;
    suppressSync();
    const { error: err } = await sb.from('materials').delete().eq('id', id).eq('user_id', userId);
    if (err) { setError(`刪除材料失敗: ${err.message}`); return; }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, [userId, suppressSync]);

  return {
    materials,
    materialNames: materials.map((m) => m.name),
    loading,
    error,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    saveMaterials,
    suppressSync,
  };
}
