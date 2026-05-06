import type { IngredientCat } from './recipe';

/**
 * v2.1 SpeciesGroup — 物種分組標籤
 * 詳細列表見 src/utils/species.ts SPECIES_GROUPS
 * 用 string 而非 union 是因為 v2.1 規格允許 UI 自填
 */
export type SpeciesGroup = string;

/**
 * v2.1 testStatus — 入庫測試狀態
 * pending  尚未測試
 * tested   已熱板測試
 * verified 已通過完整 SOP
 */
export type MaterialTestStatus = 'pending' | 'tested' | 'verified';

export interface Material {
  // ===== 既有欄位（保留，不可刪）=====
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

  // ===== v2.1 新增欄位（全部選填，向後相容）=====
  /** 配方表顯示用簡稱，建議 6 字內 */
  displayShort?: string;
  /** 學名，例如 "Boswellia sacra" */
  species?: string;
  /** 物種分組標籤，例如 "frankincense"，見 SPECIES_GROUPS */
  speciesGroup?: SpeciesGroup;
  /** 品級，例如 "皇家綠"、"一般"、"原脂"、"膏狀" */
  grade?: string;
  /** 主觀品質筆記與評分（1-10） */
  qualityNote?: string;
  /** 別名清單，支援舊配方匯入比對 */
  aliases?: string[];
  /** v3.0 規則警告，例如 ["甘松 ≤ 0.5%"] */
  v3Warnings?: string[];
  /** 線香配方硬上限（百分比），例如 7（乳香） */
  hardCeiling?: number;
  /** 入庫測試狀態 */
  testStatus?: MaterialTestStatus;
  /** ISO datetime，新增時間 */
  addedAt?: string;
  /** ISO datetime，最後更新時間 */
  updatedAt?: string;
}
