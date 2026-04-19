import type { FragCat, RecipeStatus, IngredientCat, TaskType, TaskStatus } from '../types';

/* ============================================================
 * § Ⅲ 色碼系統 · V2 四象限 + IngredientCat 獨立分色
 *
 * 色碼 single source of truth 位於 src/styles/global.css 的 CSS variables。
 * 此檔引用對應 token 以保持 runtime 一致性：
 *   --earth / --earth-soft   暖棕家族
 *   --moss  / --moss-soft    草綠家族
 *   --mist  / --mist-soft    藍灰家族
 *   --iris  / --iris-soft    深紫家族
 *   --ing-*                  材料獨立分色（比例條並列）
 * ============================================================ */

// 工具：把 hex 轉 rgba（constants 仍需輸出實體 hex 供 inline style 用；
// token 做為語意參照，hex 是落地值）
const rgba = (hex: string, a: number): string => {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// Palette 常數（與 global.css 同步；如需調整請兩處一起改）
const PALETTE = {
  earth:      '#8B6F52',
  earthSoft:  '#B08A65',
  moss:       '#5f7a5f',
  mossSoft:   '#7B9579',
  mist:       '#5a7a8c',
  mistSoft:   '#7795A4',
  iris:       '#7a6b8a',
  irisSoft:   '#968AA2',
  // Ingredient-specific（比例條並列需獨立色相）
  ingResin:    '#c49a40',
  ingFerment:  '#9a6b4a',
  ingWine:     '#7a4a4a',
  ingBinder:   '#a8a090',
  // status
  error:   '#a06050',
  amber:   '#9a8040',
  // neutral
  ink2:    '#6B6459',
  border:  '#D6CFC4',
} as const;

// 對外暴露（debug / 測試用）
export const COLOR_PALETTE = PALETTE;

// ── Recipe: fragrance categories ──────────────────────────────────
export const FRAG_CATS: Record<FragCat, { label: string }> = {
  shrine:   { label: '供香' },
  improve:  { label: '改良' },
  green:    { label: '草本' },
  wood:     { label: '木質' },
  floral:   { label: '花香' },
  resin:    { label: '樹脂' },
  western:  { label: '西方' },
  special:  { label: '特殊' },
  tincture: { label: '酊劑' },
  test:     { label: '測試' },
};

// FragCat 對應 4 家族，10 類 → 8 色位（每色位 1–2 類共用）
export const FRAG_CAT_COLORS: Record<FragCat, { border: string; bg: string; text: string }> = {
  // Earth 家族（木/改良/測試 base；樹脂走 soft）
  wood:     { border: PALETTE.earth,     bg: rgba(PALETTE.earth, 0.10),    text: PALETTE.earth },
  improve:  { border: PALETTE.earth,     bg: rgba(PALETTE.earth, 0.10),    text: PALETTE.earth },
  test:     { border: PALETTE.earth,     bg: rgba(PALETTE.earth, 0.08),    text: PALETTE.earth },
  resin:    { border: PALETTE.earthSoft, bg: rgba(PALETTE.earthSoft, 0.10), text: PALETTE.earthSoft },

  // Moss 家族（草本）
  green:    { border: PALETTE.moss,      bg: rgba(PALETTE.moss, 0.10),     text: PALETTE.moss },

  // Mist 家族(西方)
  western:  { border: PALETTE.mist,      bg: rgba(PALETTE.mist, 0.10),     text: PALETTE.mist },

  // Iris 家族（供香/特殊 base；花香/酊劑 soft）
  shrine:   { border: PALETTE.iris,      bg: rgba(PALETTE.iris, 0.12),     text: PALETTE.iris },
  special:  { border: PALETTE.iris,      bg: rgba(PALETTE.iris, 0.12),     text: PALETTE.iris },
  floral:   { border: PALETTE.irisSoft,  bg: rgba(PALETTE.irisSoft, 0.10), text: PALETTE.irisSoft },
  tincture: { border: PALETTE.irisSoft,  bg: rgba(PALETTE.irisSoft, 0.10), text: PALETTE.irisSoft },
};

// ── Recipe: ingredient categories ─────────────────────────────────
export const ING_CATS: Record<IngredientCat, { label: string }> = {
  base:      { label: '基底木' },
  herb:      { label: '花果藥草' },
  resin:     { label: '樹脂' },
  tincture:  { label: '酊劑' },
  ferment:   { label: '發酵' },
  wine:      { label: '酒媒' },
  binder:    { label: '黏粉' },
};

// IngredientCat 獨立分色 — 比例條並列需 7 色分得開
export const ING_CAT_COLORS: Record<IngredientCat, string> = {
  base:      PALETTE.earth,       // #8B6F52 暖棕 — 基底木
  herb:      PALETTE.moss,        // #5f7a5f 草綠 — 花果藥草
  resin:     PALETTE.ingResin,    // #c49a40 琥珀 — 樹脂（提亮以便比例條辨識）
  tincture:  PALETTE.iris,        // #7a6b8a 深紫 — 酊劑
  ferment:   PALETTE.ingFerment,  // #9a6b4a 橙褐 — 發酵（避開 earth）
  wine:      PALETTE.ingWine,     // #7a4a4a 深紅 — 酒媒
  binder:    PALETTE.ingBinder,   // #a8a090 石灰 — 黏粉
};

// ── Recipe status ─────────────────────────────────────────────────
export const RECIPE_STATUS: Record<RecipeStatus, { label: string; color: string }> = {
  success:  { label: '成功',   color: PALETTE.earth }, // 暖棕
  fail:     { label: '失敗',   color: PALETTE.error }, // 鏽紅
  pending:  { label: '待製',   color: PALETTE.ink2 },  // 灰
  progress: { label: '進行中', color: PALETTE.moss },  // 草綠
  order:    { label: '訂單',   color: PALETTE.mist },  // 藍灰
};

// ── Task types ────────────────────────────────────────────────────
export const TASK_TYPES: Record<TaskType, { label: string; icon: string; defaultDays: number; phase: 'pre' | 'make' | 'post' | 'other' }> = {
  harvest:  { label: '採收',      icon: '⌇', defaultDays: 0,  phase: 'pre' },
  dry:      { label: '原料乾燥',  icon: '△', defaultDays: 7,  phase: 'pre' },
  grind:    { label: '研磨打粉',  icon: '○', defaultDays: 0,  phase: 'pre' },
  tincture: { label: '酊劑浸泡',  icon: '◇', defaultDays: 28, phase: 'pre' },
  ferment:  { label: '發酵/酒酵', icon: '◈', defaultDays: 90, phase: 'pre' },
  enzyme:   { label: '酶處理',    icon: '⬡', defaultDays: 1,  phase: 'pre' },
  paoZhi:   { label: '炮製',      icon: '☲', defaultDays: 1,  phase: 'pre' },
  honey:    { label: '蜜炙/蜜泡', icon: '⊙', defaultDays: 1,  phase: 'pre' },
  aging:    { label: '原料陳化',  icon: '▣', defaultDays: 30, phase: 'pre' },
  weigh:    { label: '稱量配粉',  icon: '⊞', defaultDays: 0,  phase: 'make' },
  shape:    { label: '和泥成型',  icon: '▬', defaultDays: 0,  phase: 'make' },
  stickDry: { label: '線香乾燥',  icon: '⊿', defaultDays: 5,  phase: 'post' },
  cellar:   { label: '窖藏醇化',  icon: '▩', defaultDays: 30, phase: 'post' },
  burn:     { label: '試燒',      icon: '◉', defaultDays: 0,  phase: 'post' },
  other:    { label: '其他',      icon: '·', defaultDays: 0,  phase: 'other' },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; order: number }> = {
  prep:       { label: '備料中', order: 2 },
  processing: { label: '處理中', order: 1 },
  waiting:    { label: '等待中', order: 0 },
  ready:      { label: '待處理', order: 3 },
  done:       { label: '已完成', order: 4 },
};

// Phase colours for tasks — § Ⅲ 分層：pre=soft / make=base / post=moss
export const PHASE_COLORS: Record<'pre' | 'make' | 'post' | 'other', string> = {
  pre:   PALETTE.earthSoft, // 前置原料 — 淺暖棕
  make:  PALETTE.earth,     // 製作核心 — 暖棕（較重）
  post:  PALETTE.moss,      // 後置熟成 — 草綠
  other: PALETTE.ink2,      // 灰
};

// Recipe status: muted background tint（cards, list rows）
export const RECIPE_STATUS_BG: Record<RecipeStatus, string> = {
  success:  rgba(PALETTE.earth, 0.10),
  fail:     rgba(PALETTE.error, 0.10),
  pending:  rgba(PALETTE.ink2, 0.06),
  progress: rgba(PALETTE.moss, 0.10),
  order:    rgba(PALETTE.mist, 0.10),
};

// Recipe status: left-border accent colour
export const RECIPE_STATUS_BORDER: Record<RecipeStatus, string> = {
  success:  PALETTE.earth,
  fail:     PALETTE.error,
  pending:  PALETTE.border,
  progress: PALETTE.moss,
  order:    PALETTE.mist,
};

// Task status: muted background tint for active cards
// waiting / done 無底色；其他依 phase 語意上色（processing=暖棕、prep=灰暖、ready=草綠）
export const TASK_STATUS_BG: Record<TaskStatus, string> = {
  waiting:    'transparent',
  processing: rgba(PALETTE.earth, 0.10),
  prep:       rgba(PALETTE.ink2,  0.08),
  ready:      rgba(PALETTE.moss,  0.10),
  done:       'transparent',
};

export const TASK_STATUS_ORDER: TaskStatus[] = ['waiting', 'processing', 'prep', 'ready', 'done'];
