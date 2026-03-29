import type { IngredientCat } from './recipe';

export interface Material {
  id: string;
  cat: IngredientCat;
  name: string;
  origin: string;
  supplier: string;
  note: string;
  stock: {
    qty: number;
    unit: string;
    note: string;
  };
}
