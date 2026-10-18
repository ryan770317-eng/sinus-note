import type { Ingredient, Material } from '../types';

/** 取材料顯示名稱：優先材料庫的 displayShort，回落配方內的快照名稱 */
export function ingredientDisplay(ing: Ingredient, mat: Material | null): string {
  if (mat?.displayShort) return mat.displayShort;
  return ing.name;
}
