import type { Recipe, Material, Task, FragCat } from '../types';

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
 * Merge patch data into existing data (no overwrite, append only)
 */
export function mergePatch(
  existing: { recipes: Recipe[]; materials: Material[]; tasks: Task[] },
  patch: Partial<{ recipes: Recipe[]; materials: Material[]; tasks: Task[] }>,
): { recipes: Recipe[]; materials: Material[]; tasks: Task[]; added: { recipes: number; materials: number; tasks: number } } {
  const existingNames = new Set(existing.recipes.map((r) => r.name));
  const newRecipes = (patch.recipes ?? []).filter((r) => !existingNames.has(r.name));

  const existingMatKeys = new Set(existing.materials.map((m) => `${m.cat}:${m.name}`));
  const newMats = (patch.materials ?? []).filter((m) => !existingMatKeys.has(`${m.cat}:${m.name}`));

  const existingTaskKeys = new Set(existing.tasks.map((t) => `${t.title}:${t.startDate}`));
  const newTasks = (patch.tasks ?? []).filter(
    (t) => !existingTaskKeys.has(`${t.title}:${t.startDate}`),
  );

  return {
    recipes: [...existing.recipes, ...newRecipes],
    materials: [...existing.materials, ...newMats],
    tasks: [...existing.tasks, ...newTasks],
    added: { recipes: newRecipes.length, materials: newMats.length, tasks: newTasks.length },
  };
}
