import { createClient } from '@supabase/supabase-js';
import type { Recipe, Task, Material, Note, FragCat } from '../types';
import { parseRecipes, parseTasks, parseMaterials } from '../schemas';

// ── Client ─────────────────────────────────────────────────────────
export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ── DB row types (snake_case, as returned by Supabase) ─────────────

export interface RecipeRow {
  id: number;
  user_id: string;
  num: string;
  name: string;
  frag_cat: string;
  status: string;
  rating: number;
  tags: string[];
  process: Record<string, unknown>;
  timeline: Record<string, unknown>;
  versions: unknown[];
  burn_log: unknown[];
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  material: string;
  recipe_id: number | null;
  task_type: string;
  status: string;
  start_date: string;
  due_date: string | null;
  completed_date: string | null;
  notes: string;
  checkpoints: unknown[];
  created_at: string;
  updated_at: string;
}

export interface MaterialRow {
  id: string;
  user_id: string;
  cat: string;
  name: string;
  origin: string;
  supplier: string;
  note: string;
  stock: Record<string, unknown>;
}

export interface NoteRow {
  id: string;
  user_id: string;
  text: string;
  ts: number;
  ai_result: string | null;
}

export interface UserConfigRow {
  user_id: string;
  next_id: number;
  cat_order: string[] | null;
  cat_images: Record<string, string>;
  updated_at: string;
}

// ── Row → App type converters ──────────────────────────────────────

export function rowToRecipe(row: RecipeRow): Recipe | null {
  const parsed = parseRecipes([{
    id: row.id,
    num: row.num,
    name: row.name,
    fragCat: row.frag_cat,
    status: row.status,
    rating: row.rating,
    tags: row.tags ?? [],
    process: row.process,
    timeline: row.timeline,
    versions: row.versions,
    burnLog: row.burn_log,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }]);
  return parsed[0] ?? null;
}

export function recipeToRow(r: Recipe, userId: string): RecipeRow {
  return {
    id: r.id,
    user_id: userId,
    num: r.num,
    name: r.name,
    frag_cat: r.fragCat,
    status: r.status,
    rating: r.rating,
    tags: r.tags,
    process: r.process as Record<string, unknown>,
    timeline: r.timeline as Record<string, unknown>,
    versions: r.versions as unknown[],
    burn_log: r.burnLog as unknown[],
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function rowToTask(row: TaskRow): Task | null {
  const parsed = parseTasks([{
    id: row.id,
    title: row.title,
    material: row.material,
    recipeId: row.recipe_id,
    taskType: row.task_type,
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
    completedDate: row.completed_date,
    notes: row.notes,
    checkpoints: row.checkpoints,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }]);
  return parsed[0] ?? null;
}

export function taskToRow(t: Task, userId: string): TaskRow {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    material: t.material,
    recipe_id: t.recipeId,
    task_type: t.taskType,
    status: t.status,
    start_date: t.startDate,
    due_date: t.dueDate,
    completed_date: t.completedDate,
    notes: t.notes,
    checkpoints: t.checkpoints as unknown[],
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function rowToMaterial(row: MaterialRow): Material | null {
  const parsed = parseMaterials([{
    id: row.id,
    cat: row.cat,
    name: row.name,
    origin: row.origin,
    supplier: row.supplier,
    note: row.note,
    stock: row.stock,
  }]);
  return parsed[0] ?? null;
}

export function materialToRow(m: Material, userId: string): MaterialRow {
  return {
    id: m.id,
    user_id: userId,
    cat: m.cat,
    name: m.name,
    origin: m.origin,
    supplier: m.supplier,
    note: m.note,
    stock: m.stock as Record<string, unknown>,
  };
}

export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    text: row.text,
    ts: row.ts,
    aiResult: row.ai_result ?? undefined,
  };
}

export function noteToRow(n: Note, userId: string): NoteRow {
  return {
    id: n.id,
    user_id: userId,
    text: n.text,
    ts: n.ts,
    ai_result: n.aiResult ?? null,
  };
}

// ── Generic realtime refetch helper ───────────────────────────────
// Returns a function that can be called to tear down the subscription.
export function subscribeTable(
  table: string,
  userId: string,
  onRefetch: () => void,
): () => void {
  const channel = sb
    .channel(`${table}:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      onRefetch,
    )
    .subscribe();

  return () => { sb.removeChannel(channel); };
}

// Smaller helper: user_config has user_id as PK (no user_id filter column)
export function subscribeUserConfig(
  userId: string,
  onRefetch: () => void,
): () => void {
  const channel = sb
    .channel(`user_config:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_config', filter: `user_id=eq.${userId}` },
      onRefetch,
    )
    .subscribe();

  return () => { sb.removeChannel(channel); };
}

export type { FragCat };
