import type { Recipe, Material, Note } from '../types';

/** 配方全域搜尋：比對 name、num、tags[]（全部 toLowerCase().includes） */
export function searchRecipes(recipes: Recipe[], q: string, limit = 5): Recipe[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return recipes
    .filter((r) =>
      r.name.toLowerCase().includes(term) ||
      r.num.toLowerCase().includes(term) ||
      (r.tags ?? []).some((t) => t.toLowerCase().includes(term)),
    )
    .slice(0, limit);
}

/** 材料全域搜尋：比對 name、displayShort、species、origin、supplier、aliases[] */
export function searchMaterials(materials: Material[], q: string, limit = 5): Material[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return materials
    .filter((m) =>
      m.name.toLowerCase().includes(term) ||
      (m.displayShort ?? '').toLowerCase().includes(term) ||
      (m.species ?? '').toLowerCase().includes(term) ||
      (m.origin ?? '').toLowerCase().includes(term) ||
      (m.supplier ?? '').toLowerCase().includes(term) ||
      (m.aliases ?? []).some((a) => a.toLowerCase().includes(term)),
    )
    .slice(0, limit);
}

/** 隨手記全域搜尋：比對 text */
export function searchNotes(notes: Note[], q: string, limit = 3): Note[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return notes.filter((n) => n.text.toLowerCase().includes(term)).slice(0, limit);
}
