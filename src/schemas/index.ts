import { z } from 'zod';

// ── Shared enum schemas ────────────────────────────────────────────
// .catch() means: if the value from Firestore is unrecognised, use the fallback
// instead of crashing the app.

export const IngredientCatSchema = z
  .enum(['base', 'herb', 'resin', 'tincture', 'ferment', 'wine', 'binder'])
  .catch('herb'); // covers legacy 'botanical' and any other unknown values

export const FragCatSchema = z
  .enum(['shrine', 'improve', 'green', 'wood', 'floral', 'resin', 'western', 'special', 'tincture', 'test'])
  .catch('test');

export const RecipeStatusSchema = z
  .enum(['success', 'fail', 'pending', 'progress', 'order'])
  .catch('pending');

// ── Recipe sub-schemas ─────────────────────────────────────────────

const IngredientSchema = z.object({
  cat:    IngredientCatSchema,
  name:   z.string().catch(''),
  amount: z.number().catch(0),
  unit:   z.string().catch('g'),
});

const VersionSchema = z.object({
  label:       z.string().catch('v1'),
  totalWeight: z.number().catch(0),
  ingredients: z.array(IngredientSchema).catch([]),
  notes:       z.string().catch(''),
  comments:    z.array(z.string()).catch([]),
});

const BurnEntrySchema = z.object({
  date:   z.string().catch(''),
  front:  z.string().catch(''),
  mid:    z.string().catch(''),
  tail:   z.string().catch(''),
  smoke:  z.enum(['good', 'ok', 'bad']).catch('ok'),
  rating: z.number().catch(0),
  notes:  z.string().catch(''),
});

// id is intentionally NOT given a .catch() — if a recipe has no numeric id,
// it is fundamentally corrupted and should be dropped rather than kept.
export const RecipeSchema = z.object({
  id:      z.number(),
  num:     z.string().catch(''),
  name:    z.string().catch('未命名'),
  fragCat: FragCatSchema,
  status:  RecipeStatusSchema,
  rating:  z.number().catch(0),
  tags:    z.array(z.string()).catch([]),
  process: z.object({
    tincture: z.boolean().catch(false),
    ferment:  z.boolean().catch(false),
    wine:     z.boolean().catch(false),
    notes:    z.string().catch(''),
  }).catch({ tincture: false, ferment: false, wine: false, notes: '' }),
  timeline: z.object({
    makeDate:   z.string().catch(''),
    dryDays:    z.number().catch(0),
    agingStart: z.string().catch(''),
    agingNotes: z.string().catch(''),
  }).catch({ makeDate: '', dryDays: 0, agingStart: '', agingNotes: '' }),
  versions: z.array(VersionSchema).catch([]),
  burnLog:  z.array(BurnEntrySchema).catch([]),
  createdAt: z.string().catch(''),
  updatedAt: z.string().catch(''),
});

// ── Task schema ────────────────────────────────────────────────────

const TaskStatusSchema = z
  .enum(['prep', 'processing', 'waiting', 'ready', 'done'])
  .catch('waiting');

const TaskTypeSchema = z
  .enum(['harvest', 'dry', 'grind', 'tincture', 'ferment', 'enzyme', 'paoZhi', 'honey', 'aging', 'weigh', 'shape', 'stickDry', 'cellar', 'burn', 'other'])
  .catch('other');

const CheckpointSchema = z.object({
  date:  z.string().catch(''),
  label: z.string().catch(''),
  done:  z.boolean().catch(false),
});

export const TaskSchema = z.object({
  id:            z.string(),
  title:         z.string().catch(''),
  material:      z.string().catch(''),
  recipeId:      z.number().nullable().catch(null),
  taskType:      TaskTypeSchema,
  status:        TaskStatusSchema,
  startDate:     z.string().catch(''),
  dueDate:       z.string().nullable().catch(null),
  completedDate: z.string().nullable().catch(null),
  notes:         z.string().catch(''),
  checkpoints:   z.array(CheckpointSchema).catch([]),
  createdAt:     z.string().catch(''),
  updatedAt:     z.string().catch(''),
});

// ── Material schema ────────────────────────────────────────────────

export const MaterialSchema = z.object({
  id:       z.string(),
  cat:      IngredientCatSchema,
  name:     z.string().catch(''),
  origin:   z.string().catch(''),
  supplier: z.string().catch(''),
  note:     z.string().catch(''),
  stock: z.object({
    qty:  z.number().catch(0),
    unit: z.string().catch('g'),
    note: z.string().catch(''),
  }).catch({ qty: 0, unit: 'g', note: '' }),
});

// ── Parse helpers ──────────────────────────────────────────────────
// Parses an array from Firestore, logs any items that fail validation,
// and drops them rather than crashing the app.

function parseArray<T>(schema: z.ZodType<T>, raw: unknown[], label: string): T[] {
  return raw
    .map((item) => {
      const result = schema.safeParse(item);
      if (!result.success) {
        console.warn(`[schema] dropped invalid ${label}:`, result.error.issues, item);
        return null;
      }
      return result.data;
    })
    .filter((x): x is T => x !== null);
}

export function parseRecipes(raw: unknown): ReturnType<typeof RecipeSchema.parse>[] {
  if (!Array.isArray(raw)) return [];
  return parseArray(RecipeSchema, raw, 'recipe');
}

export function parseTasks(raw: unknown): ReturnType<typeof TaskSchema.parse>[] {
  if (!Array.isArray(raw)) return [];
  return parseArray(TaskSchema, raw, 'task');
}

export function parseMaterials(raw: unknown): ReturnType<typeof MaterialSchema.parse>[] {
  if (!Array.isArray(raw)) return [];
  return parseArray(MaterialSchema, raw, 'material');
}
