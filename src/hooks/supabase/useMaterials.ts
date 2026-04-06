import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, materialToRow, rowToMaterial, subscribeTable } from '../../lib/supabase';
import type { MaterialRow } from '../../lib/supabase';
import type { Material } from '../../types';

export function useMaterials(userId: string | null) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const suppressRef = useRef(false);

  const fetchMaterials = useCallback(async () => {
    if (!userId) return;
    const { data } = await sb.from('materials').select('*').eq('user_id', userId).order('name');
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
      await sb.from('materials').upsert(items.map((m) => materialToRow(m, userId)));
    }
    const newIds = new Set(items.map((m) => m.id));
    const orphans = materials.filter((m) => !newIds.has(m.id)).map((m) => m.id);
    if (orphans.length > 0) {
      await sb.from('materials').delete().in('id', orphans).eq('user_id', userId);
    }
    setMaterials(items);
  }, [userId, materials, suppressSync]);

  const addMaterial = useCallback(async (mat: Omit<Material, 'id'>) => {
    if (!userId) throw new Error('not authenticated');
    const id = `mu${Date.now()}`;
    const newMat: Material = { ...mat, id };
    suppressSync();
    await sb.from('materials').insert(materialToRow(newMat, userId));
    setMaterials((prev) => [...prev, newMat]);
    return newMat;
  }, [userId, suppressSync]);

  const updateMaterial = useCallback(async (id: string, updates: Partial<Material>) => {
    if (!userId) return;
    const mat = materials.find((m) => m.id === id);
    if (!mat) return;
    const updated = { ...mat, ...updates };
    suppressSync();
    await sb.from('materials').update(materialToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, [userId, materials, suppressSync]);

  const deleteMaterial = useCallback(async (id: string) => {
    if (!userId) return;
    suppressSync();
    await sb.from('materials').delete().eq('id', id).eq('user_id', userId);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, [userId, suppressSync]);

  return {
    materials,
    materialNames: materials.map((m) => m.name),
    loading,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    saveMaterials,
    suppressSync,
  };
}
