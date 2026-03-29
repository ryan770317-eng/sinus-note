import type { FragCat, RecipeStatus, IngredientCat, TaskType, TaskStatus } from '../types';

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

export const ING_CATS: Record<IngredientCat, { label: string }> = {
  base:      { label: '基底木' },
  botanical: { label: '花果藥草' },
  resin:     { label: '樹脂' },
  tincture:  { label: '酊劑' },
  ferment:   { label: '發酵' },
  wine:      { label: '酒媒' },
  binder:    { label: '黏粉' },
};

export const RECIPE_STATUS: Record<RecipeStatus, { label: string; color: string }> = {
  success:  { label: '成功',   color: '#8B6F52' },
  fail:     { label: '失敗',   color: '#a06050' },
  pending:  { label: '待製',   color: '#6B6459' },
  progress: { label: '進行中', color: '#6B6459' },
  order:    { label: '訂單',   color: '#6B6459' },
};

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

// Status display order for TaskDashboard
export const TASK_STATUS_ORDER: TaskStatus[] = ['waiting', 'processing', 'prep', 'ready', 'done'];
