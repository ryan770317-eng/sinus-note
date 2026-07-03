import type { Recipe, Material, Task, FragCat } from '../types';
import { uid } from './id';

export interface BackupData {
  exportedAt: string;
  recipes: Recipe[];
  nextId: number;
  catImages: Record<string, string>;
  catOrder: FragCat[] | null;
  materials: Material[];
  tasks: Task[];
}

export function exportBackup(data: BackupData): void {
  const json = JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sinus-note-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result as string));
      } catch {
        reject(new Error('無效的 JSON 檔案'));
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}

/**
 * Merge patch data into existing data (no overwrite, append only).
 *
 * ID 安全規則：patch 檔來自另一份匯出，其 id 很可能與現有資料撞號。
 * 追加的配方一律重新編號（從 max(nextId, 現有最大 id + 1) 起跳），
 * 材料/工序若 id 已存在則重生 uid —— 否則後續 upsert 會靜默蓋掉現有資料，
 * 違反「只追加不覆蓋」的承諾。
 */
export function mergePatch(
  existing: { recipes: Recipe[]; materials: Material[]; tasks: Task[] },
  patch: Partial<{ recipes: Recipe[]; materials: Material[]; tasks: Task[] }>,
  nextId: number,
): {
  recipes: Recipe[];
  materials: Material[];
  tasks: Task[];
  nextId: number;
  added: { recipes: number; materials: number; tasks: number };
} {
  const existingNames = new Set(existing.recipes.map((r) => r.name));
  const maxExistingId = existing.recipes.reduce((mx, r) => Math.max(mx, r.id), 0);
  let idCursor = Math.max(nextId, maxExistingId + 1);
  const newRecipes = (patch.recipes ?? [])
    .filter((r) => !existingNames.has(r.name))
    .map((r) => ({ ...r, id: idCursor++ }));

  const existingMatKeys = new Set(existing.materials.map((m) => `${m.cat}:${m.name}`));
  const existingMatIds = new Set(existing.materials.map((m) => m.id));
  const newMats = (patch.materials ?? [])
    .filter((m) => !existingMatKeys.has(`${m.cat}:${m.name}`))
    .map((m) => (existingMatIds.has(m.id) ? { ...m, id: uid('mu') } : m));

  const existingTaskKeys = new Set(existing.tasks.map((t) => `${t.title}:${t.startDate}`));
  const existingTaskIds = new Set(existing.tasks.map((t) => t.id));
  const newTasks = (patch.tasks ?? [])
    .filter((t) => !existingTaskKeys.has(`${t.title}:${t.startDate}`))
    .map((t) => (existingTaskIds.has(t.id) ? { ...t, id: uid('tk') } : t));

  return {
    recipes: [...existing.recipes, ...newRecipes],
    materials: [...existing.materials, ...newMats],
    tasks: [...existing.tasks, ...newTasks],
    nextId: idCursor,
    added: { recipes: newRecipes.length, materials: newMats.length, tasks: newTasks.length },
  };
}
