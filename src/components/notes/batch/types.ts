import type { IngredientCat, FragCat, TaskType, TaskStatus } from '../../../types';

export type BatchAction =
  | { type: 'material_add'; cat: IngredientCat; name: string; origin: string; supplier: string; note: string; qty: number; unit: string }
  | { type: 'stock_update'; name: string; qty: number; unit: string }
  | { type: 'recipe_add'; name: string; fragCat: FragCat; totalWeight: number; ingredients: Array<{ cat: IngredientCat; name: string; amount: number; unit: string }>; notes: string }
  | { type: 'recipe_note'; recipeId?: number; recipeName: string; note: string }
  | { type: 'task_add'; title: string; material?: string; taskType: TaskType; notes: string; status?: TaskStatus; dueDate?: string }
  | { type: 'journal' };

export interface ActionState {
  action: BatchAction;
  id: string;
  status: 'pending' | 'writing' | 'done' | 'skipped';
}

export const ACTION_LABELS: Record<string, string> = {
  material_add: '新增材料',
  stock_update: '更新庫存',
  recipe_add:   '新增配方',
  recipe_note:  '追加配方備注',
  task_add:     '新增工序',
  journal:      '日誌（不寫入）',
};
