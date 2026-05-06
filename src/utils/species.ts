/**
 * SINUS NOTE v2.1 — Species Group 預設清單
 *
 * 這份對照供：
 *   1. 材料庫新增/編輯時的下拉選項
 *   2. 「按物種分組」視圖的 grouping key
 *   3. 配方詳情頁「同物種替代查詢」的索引
 *
 * UI 允許自填新標籤（speciesGroup 在 Material 型別是 string 不是 union），
 * 此清單僅是預設項。新增分類時請順手補回此檔。
 *
 * 來源：SINUS_NOTE_DATA_MODEL_v2.1_SPEC.md 附錄 C
 */

export const SPECIES_GROUPS = {
  // ── 木質類 ──────────────────────────────────────
  agarwood:        '沉香類',
  sandalwood:      '檀香類',
  rosewood:        '玫瑰木類',
  dalbergia:       '降真/紫檀類',
  guaiacwood:      '綠檀類',
  thuja:           '側柏類',
  cypress:         '柏木類',
  hinoki:          '檜木/紅檜類',
  cryptomeria:     '杉木類',
  palo_santo:      '聖木類',

  // ── 樹脂類 ──────────────────────────────────────
  frankincense:    '乳香類',
  myrrh:           '沒藥類',
  mastic:          '乳香膠類',
  storax:          '蘇合香類',
  benzoin:         '安息香類',
  copal_or_dammar: '柯巴/達瑪類',
  dammar:          '達瑪類',
  pine_resin:      '松脂類',
  patchouli_resin: '廣藿香樹脂',
  dragons_blood:   '龍血類',

  // ── 花類 ────────────────────────────────────────
  rose:            '玫瑰類',
  jasmine:         '茉莉類',
  osmanthus:       '桂花類',
  magnolia:        '玉蘭類',
  lotus:           '蓮花類',
  saffron:         '番紅花類',
  lavender:        '薰衣草類',

  // ── 草藥類 ──────────────────────────────────────
  vetiver:         '岩蘭草類',
  mugwort:         '艾草類',
  mint:            '薄荷類',
  patchouli:       '廣藿香類',
  cumin:           '茴香類',
  dictamnus:       '白鮮類',

  // ── 其他 ────────────────────────────────────────
  sweet_grass:     '茅香類',
  juniper:         '杜松類',
  borneol:         '龍腦類',
  spikenard:       '甘松類',
  tonka:           '東加豆類',
  citrus:          '柑橘類',
  pine_needle:     '松針類',
  cedar:           '雪松葉類',
  mixed:           '混合品',
} as const;

export type KnownSpeciesGroup = keyof typeof SPECIES_GROUPS;

/** 取顯示名稱；若是自填的未知標籤就直接回傳 key 作為 fallback */
export function speciesGroupLabel(key: string | undefined): string {
  if (!key) return '';
  if (key in SPECIES_GROUPS) {
    return SPECIES_GROUPS[key as KnownSpeciesGroup];
  }
  return key;
}

/** 下拉選項用 — [{ value, label }] 排序：類別 → 字母 */
export const SPECIES_GROUP_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  Object.entries(SPECIES_GROUPS).map(([value, label]) => ({ value, label }));
