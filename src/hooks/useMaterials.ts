import { useCallback } from 'react';
import { useFirestoreDoc } from './useFirestore';
import type { Material } from '../types';
import { parseMaterials } from '../schemas';

interface MaterialsDoc {
  items: Material[];
  updatedAt: unknown;
}

export function useMaterials(userId: string | null) {
  const { data, loading, save, suppressSync } = useFirestoreDoc<MaterialsDoc>(userId, 'materials');

  const materials: Material[] = parseMaterials(data?.items);

  const saveMaterials = useCallback(
    async (items: Material[]) => {
      await save({ items });
    },
    [save],
  );

  const addMaterial = useCallback(
    async (mat: Omit<Material, 'id'>) => {
      const id = `mu${Date.now()}`;
      const newMat: Material = { ...mat, id };
      await saveMaterials([...materials, newMat]);
      return newMat;
    },
    [materials, saveMaterials],
  );

  const updateMaterial = useCallback(
    async (id: string, updates: Partial<Material>) => {
      await saveMaterials(materials.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    },
    [materials, saveMaterials],
  );

  const deleteMaterial = useCallback(
    async (id: string) => {
      await saveMaterials(materials.filter((m) => m.id !== id));
    },
    [materials, saveMaterials],
  );

  const materialNames = materials.map((m) => m.name);

  return {
    materials,
    materialNames,
    loading,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    saveMaterials,
    suppressSync,
  };
}
