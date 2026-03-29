export type FragCat =
  | 'shrine' | 'improve' | 'green' | 'wood' | 'floral'
  | 'resin' | 'western' | 'special' | 'tincture' | 'test';

export type RecipeStatus = 'success' | 'fail' | 'pending' | 'progress' | 'order';

export type IngredientCat =
  | 'base' | 'herb' | 'resin' | 'tincture' | 'ferment' | 'wine' | 'binder';

export interface Ingredient {
  cat: IngredientCat;
  name: string;
  amount: number;
  unit: string;
}

export interface Version {
  label: string;
  totalWeight: number;
  ingredients: Ingredient[];
  notes: string;
  comments: string[];
}

export interface BurnEntry {
  date: string;
  front: string;
  mid: string;
  tail: string;
  smoke: 'good' | 'ok' | 'bad';
  rating: number;
  notes: string;
}

export interface Recipe {
  id: number;
  num: string;
  name: string;
  fragCat: FragCat;
  status: RecipeStatus;
  rating: number;
  tags: string[];
  process: {
    tincture: boolean;
    ferment: boolean;
    wine: boolean;
    notes: string;
  };
  timeline: {
    makeDate: string;
    dryDays: number;
    agingStart: string;
    agingNotes: string;
  };
  versions: Version[];
  burnLog: BurnEntry[];
  createdAt: string;
  updatedAt: string;
}
