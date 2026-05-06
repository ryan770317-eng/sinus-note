export type FragCat =
  | 'shrine' | 'improve' | 'green' | 'wood' | 'floral'
  | 'resin' | 'western' | 'special' | 'tincture' | 'test';

export type RecipeStatus = 'success' | 'fail' | 'pending' | 'progress' | 'order';

export type IngredientCat =
  | 'base' | 'herb' | 'resin' | 'tincture' | 'ferment' | 'wine' | 'binder';

export interface Ingredient {
  cat: IngredientCat;
  /**
   * v2.1：強制使用 materialId 引用材料庫條目（"m60" 等）。
   * 但為了向後相容（舊資料尚未遷移），此欄位暫時設為選填。
   * Phase 2 Step 5 遷移完成後，可考慮在 schema 層改為必填。
   */
  materialId?: string;
  /**
   * 寫入時的快照名稱。即使材料改名，配方仍可顯示原始紀錄。
   * 新建配方時應由 materialId 對應 Material.name 自動帶入。
   */
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
