import type { RecipeStatus } from '../types';
import { RECIPE_STATUS } from './constants';

/** 配方狀態 → StatusDot 參數。待製用空心方塊，其餘實心狀態色。 */
export function recipeStatusDot(status: RecipeStatus): { color: string; label: string; outlined: boolean } {
  const s = RECIPE_STATUS[status] ?? RECIPE_STATUS.pending;
  return { color: s.color, label: s.label, outlined: status === 'pending' || !(status in RECIPE_STATUS) };
}
