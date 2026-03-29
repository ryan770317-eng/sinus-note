import type { FragCat, RecipeStatus, IngredientCat, TaskType, TaskStatus } from '../types';

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

// 每個香氣分類的識別色（border / bg / text）
export const FRAG_CAT_COLORS: Record<FragCat, { border: string; bg: string; text: string }> = {
  shrine:   { border: '#7a6b8a', bg: 'rgba(122,107,138,0.12)', text: '#7a6b8a' }, // 紫 — 供香莊嚴
  improve:  { border: '#9a8052', bg: 'rgba(154,128,82,0.10)',  text: '#9a8052' }, // 金琥珀 — 改良精進
  green:    { border: '#5f7a5f', bg: 'rgba(95,122,95,0.10)',   text: '#5f7a5f' }, // 草綠 — 草本自然
  wood:     { border: '#8B6F52', bg: 'rgba(139,111,82,0.10)',  text: '#8B6F52' }, // 暖棕 — 木質沉穩
  floral:   { border: '#9a7070', bg: 'rgba(154,112,112,0.10)', text: '#9a7070' }, // 玫瑰 — 花香柔美
  resin:    { border: '#9a8040', bg: 'rgba(154,128,64,0.10)',  text: '#9a8040' }, // 琥珀黃 — 樹脂溫潤
  western:  { border: '#5a7a8c', bg: 'rgba(90,122,140,0.10)',  text: '#5a7a8c' }, // 藍灰 — 西方冷冽
  special:  { border: '#6b5a8c', bg: 'rgba(107,90,140,0.10)',  text: '#6b5a8c' }, // 深紫 — 特殊神秘
  tincture: { border: '#8a6b7a', bg: 'rgba(138,107,122,0.10)', text: '#8a6b7a' }, // 薰衣草 — 酊劑萃取
  test:     { border: '#8c8070', bg: 'rgba(140,128,112,0.08)', text: '#8c8070' }, // 石灰 — 測試
};

// ── Recipe: ingredient categories ─────────────────────────────────
export const ING_CATS: Record<IngredientCat, { label: string }> = {
  base:      { label: '基底木' },
  botanical: { label: '花果藥草' },
  resin:     { label: '樹脂' },
  tincture:  { label: '酊劑' },
  ferment:   { label: '發酵' },
  wine:      { label: '酒媒' },
  binder:    { label: '黏粉' },
};

// 材料分類識別色
export const ING_CAT_COLORS: Record<IngredientCat, string> = {
  base:      '#8B6F52', // 暖棕 — 基底木
  botanical: '#5f7a5f', // 草綠 — 花果藥草
  resin:     '#9a8040', // 琥珀 — 樹脂
  tincture:  '#8a6b7a', // 薰衣草 — 酊劑
  ferment:   '#8a6b52', // 橙褐 — 發酵
  wine:      '#7a4a4a', // 深紅 — 酒媒
  binder:    '#6B6459', // 灰棕 — 黏粉
};

// ── Recipe status ─────────────────────────────────────────────────
export const RECIPE_STATUS: Record<RecipeStatus, { label: string; color: string }> = {
  success:  { label: '成功',   color: '#8B6F52' }, // 暖棕
  fail:     { label: '失敗',   color: '#a06050' }, // 鏽紅
  pending:  { label: '待製',   color: '#9a9080' }, // 灰暖
  progress: { label: '進行中', color: '#5f7a5f' }, // 草綠
  order:    { label: '訂單',   color: '#5a7a8c' }, // 鋼藍
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

// Phase colours for tasks
export const PHASE_COLORS: Record<'pre' | 'make' | 'post' | 'other', string> = {
  pre:   '#9a8040', // 琥珀 — 前置原料
  make:  '#8B6F52', // 暖棕 — 成型製作
  post:  '#5f7a5f', // 草綠 — 後置熟成
  other: '#6B6459', // 灰
};

export const TASK_STATUS_ORDER: TaskStatus[] = ['waiting', 'processing', 'prep', 'ready', 'done'];
