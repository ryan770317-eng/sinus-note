import { useState, useRef, useEffect } from 'react';
import type { Recipe, Material, Task, IngredientCat, FragCat, TaskType, TaskStatus } from '../../types';
import { callClaude, BATCH_SYSTEM_PROMPT } from '../../services/claude';
import { todayISO } from '../../utils/date';
import { FRAG_CATS, ING_CATS, TASK_TYPES } from '../../utils/constants';

type BatchAction =
  | { type: 'material_add'; cat: IngredientCat; name: string; origin: string; supplier: string; note: string; qty: number; unit: string }
  | { type: 'stock_update'; name: string; qty: number; unit: string }
  | { type: 'recipe_add'; name: string; fragCat: FragCat; totalWeight: number; ingredients: Array<{ cat: IngredientCat; name: string; amount: number; unit: string }>; notes: string }
  | { type: 'recipe_note'; recipeId?: number; recipeName: string; note: string }
  | { type: 'task_add'; title: string; material?: string; taskType: TaskType; notes: string; status?: TaskStatus; dueDate?: string }
  | { type: 'journal' };

const ACTION_LABELS: Record<string, string> = {
  material_add: '新增材料',
  stock_update: '更新庫存',
  recipe_add: '新增配方',
  recipe_note: '追加配方備注',
  task_add: '新增工序',
  journal: '日誌（不寫入）',
};

interface ActionState {
  action: BatchAction;
  id: string; // stable key for React reconciliation
  status: 'pending' | 'writing' | 'done' | 'skipped';
}

interface Props {
  recipes: Recipe[];
  materials: Material[];
  nextId: number;
  onAddMaterial: (mat: Omit<Material, 'id'>) => Promise<void>;
  onUpdateStock: (name: string, qty: number, unit: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddRecipeNote: (recipeId: number, note: string) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  suppressSync: (ms?: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────

const MISSING_BG = 'rgba(200,170,80,0.15)';

/** Editable input that uses local state — only syncs to parent on blur.
 *  Rendered unconditionally (not swapped with Field) to avoid unmounting. */
function EditableField({ initial, onCommit, placeholder, label }: {
  initial: string; onCommit: (v: string) => void; placeholder: string; label: string;
}) {
  const [val, setVal] = useState(initial);
  const committed = useRef(initial);

  // Only sync from parent if the parent value genuinely changed (e.g. reset)
  useEffect(() => {
    if (initial !== committed.current) {
      setVal(initial);
      committed.current = initial;
    }
  }, [initial]);

  function handleBlur() {
    committed.current = val;
    onCommit(val);
  }

  const isEmpty = !val;
  return (
    <span className="text-xs font-light">
      <span className="text-ink-2">{label}</span>{' '}
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`text-xs px-1.5 py-0.5 border rounded font-light outline-none ${isEmpty ? 'border-dashed border-amber-400' : 'border-border'}`}
        style={{ background: isEmpty ? MISSING_BG : 'transparent', minWidth: 80 }}
      />
    </span>
  );
}

function Field({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <span className="text-xs font-light text-ink">
      <span className="text-ink-2">{label}</span>{' '}
      {missing
        ? <span className="px-1 rounded" style={{ background: MISSING_BG }}>未填</span>
        : value}
    </span>
  );
}

/** Sanitize Claude's JSON output */
function sanitizeJson(raw: string): string {
  let s = raw;
  s = s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/g, '');
  s = s.replace(/^\s*\/\/.*$/gm, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s.trim();
}

/** Whitelist known fields per action type */
function cleanAction(a: Record<string, unknown>): BatchAction | null {
  const type = a.type as string;
  switch (type) {
    case 'material_add':
      return { type, cat: a.cat as IngredientCat ?? 'herb', name: a.name as string ?? '', origin: a.origin as string ?? '', supplier: a.supplier as string ?? '', note: a.note as string ?? '', qty: Number(a.qty) || 0, unit: a.unit as string ?? 'g' };
    case 'stock_update':
      return { type, name: a.name as string ?? '', qty: Number(a.qty) || 0, unit: a.unit as string ?? 'g' };
    case 'recipe_add':
      return { type, name: a.name as string ?? '', fragCat: (a.fragCat as FragCat) || 'improve', totalWeight: Number(a.totalWeight) || 0, ingredients: Array.isArray(a.ingredients) ? a.ingredients.map((i: Record<string, unknown>) => ({ cat: i.cat as IngredientCat ?? 'herb', name: i.name as string ?? '', amount: Number(i.amount) || 0, unit: i.unit as string ?? 'g' })) : [], notes: a.notes as string ?? '' };
    case 'recipe_note':
      return { type, recipeId: a.recipeId as number | undefined, recipeName: a.recipeName as string ?? '', note: a.note as string ?? '' };
    case 'task_add':
      return { type, title: a.title as string ?? '', material: a.material as string, taskType: a.taskType as TaskType ?? 'other', notes: a.notes as string ?? '', status: a.status as TaskStatus, dueDate: a.dueDate as string };
    case 'journal':
      return { type };
    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────

export function BatchImport({
  recipes,
  materials,
  nextId,
  onAddMaterial,
  onUpdateStock,
  onAddRecipe,
  onAddRecipeNote,
  onAddTask,
  suppressSync,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [actions, setActions] = useState<ActionState[]>([]);

  // Stable set of existing material names for dedup
  const existingMatNames = new Set(materials.map((m) => m.name));

  function updateAction(idx: number, patch: Partial<BatchAction>) {
    setActions((prev) => prev.map((a, i) =>
      i === idx ? { ...a, action: { ...a.action, ...patch } as BatchAction } : a,
    ));
  }

  // ── Parse ────────────────────────────────────────────────────────
  async function handleParse() {
    if (!input.trim()) return;
    setParsing(true);
    setActions([]);
    try {
      const raw = await callClaude(BATCH_SYSTEM_PROMPT, input);
      const cleaned = sanitizeJson(raw);
      const arr = JSON.parse(cleaned) as Record<string, unknown>[];
      const parsed = arr.map(cleanAction).filter((a): a is BatchAction => a !== null);
      if (parsed.length === 0) {
        alert('解析結果為空，請確認貼入的內容格式');
        return;
      }

      // Dedup materials: auto-skip material_add if name already in library
      const results: ActionState[] = [];
      let skippedCount = 0;
      for (const a of parsed) {
        const stableId = `${a.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        if (a.type === 'material_add' && existingMatNames.has(a.name)) {
          results.push({ action: a, id: stableId, status: 'skipped' });
          skippedCount++;
        } else {
          results.push({ action: a, id: stableId, status: 'pending' });
        }
      }

      setActions(results);
      if (skippedCount > 0) {
        alert(`已自動跳過 ${skippedCount} 筆已存在的材料`);
      }
    } catch (err) {
      alert(`解析失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(false);
    }
  }

  // ── Confirm ──────────────────────────────────────────────────────
  async function confirmAction(idx: number) {
    const item = actions[idx];
    if (!item || item.status !== 'pending') return;

    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, status: 'writing' } : a));
    suppressSync(2000);

    try {
      const a = item.action;
      if (a.type === 'material_add') {
        await onAddMaterial({ cat: a.cat, name: a.name, origin: a.origin ?? '', supplier: a.supplier ?? '', note: a.note ?? '', stock: { qty: a.qty ?? 0, unit: a.unit ?? 'g', note: '' } });
      } else if (a.type === 'stock_update') {
        await onUpdateStock(a.name, a.qty, a.unit);
      } else if (a.type === 'recipe_add') {
        const tw = a.totalWeight || (a.ingredients ?? []).reduce((s, i) => s + i.amount, 0);
        await onAddRecipe({
          num: `V-${String.fromCharCode(64 + (nextId % 26 || 26))}`,
          name: a.name,
          fragCat: a.fragCat || 'improve',
          status: 'pending',
          rating: 0,
          tags: [],
          process: { tincture: false, ferment: false, wine: false, notes: '' },
          timeline: { makeDate: todayISO(), dryDays: 5, agingStart: '', agingNotes: '' },
          versions: [{ label: '主版', totalWeight: tw, ingredients: a.ingredients ?? [], notes: a.notes ?? '', comments: [] }],
          burnLog: [],
        });
      } else if (a.type === 'recipe_note') {
        let recipeId = a.recipeId;
        if (!recipeId && a.recipeName) {
          const found = recipes.find((r) => r.name.includes(a.recipeName));
          recipeId = found?.id;
        }
        if (recipeId) await onAddRecipeNote(recipeId, a.note);
      } else if (a.type === 'task_add') {
        await onAddTask({
          title: a.title,
          material: a.material ?? '',
          recipeId: null,
          taskType: a.taskType,
          status: a.status ?? 'waiting',
          startDate: todayISO(),
          dueDate: a.dueDate ?? null,
          completedDate: null,
          notes: a.notes ?? '',
          checkpoints: [],
        });
      }
      setActions((prev) => prev.map((aa, i) => i === idx ? { ...aa, status: 'done' } : aa));
    } catch (err) {
      alert(`寫入失敗：${err instanceof Error ? err.message : String(err)}`);
      setActions((prev) => prev.map((aa, i) => i === idx ? { ...aa, status: 'pending' } : aa));
    }
  }

  function skipAction(idx: number) {
    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, status: 'skipped' } : a));
  }

  // ── Render detail card per action type ───────────────────────────
  function renderDetail(item: ActionState, idx: number) {
    const a = item.action;
    const editable = item.status === 'pending';

    if (a.type === 'material_add') {
      return (
        <div className="space-y-1.5 mt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Field label="類別:" value={ING_CATS[a.cat]?.label ?? a.cat} />
            <Field label="品名:" value={a.name} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {editable ? (
              <EditableField label="產地:" initial={a.origin ?? ''} onCommit={(v) => updateAction(idx, { origin: v })} placeholder="產地" />
            ) : (
              <Field label="產地:" value={a.origin || ''} missing={!a.origin} />
            )}
            {editable ? (
              <EditableField label="供應商:" initial={a.supplier ?? ''} onCommit={(v) => updateAction(idx, { supplier: v })} placeholder="供應商" />
            ) : (
              <Field label="供應商:" value={a.supplier || ''} missing={!a.supplier} />
            )}
          </div>
          {a.note && <Field label="備注:" value={a.note} />}
          {(a.qty > 0) && <Field label="庫存:" value={`${a.qty}${a.unit ?? 'g'}`} />}
          {item.status === 'skipped' && existingMatNames.has(a.name) && (
            <p className="text-[10px] text-ink-2">材料庫已有此品項</p>
          )}
        </div>
      );
    }

    if (a.type === 'recipe_add') {
      const tw = a.totalWeight || (a.ingredients ?? []).reduce((s, i) => s + i.amount, 0);
      const catLabel = FRAG_CATS[a.fragCat]?.label ?? a.fragCat;
      return (
        <div className="space-y-2 mt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Field label="配方名:" value={a.name} />
            <Field label="分類:" value={catLabel} />
            <Field label="總重:" value={`${tw}g`} />
          </div>
          {(a.ingredients?.length ?? 0) > 0 && (
            <table className="w-full text-xs font-light">
              <thead>
                <tr className="text-ink-2 border-b border-border">
                  <th className="text-left py-0.5 font-normal">類別</th>
                  <th className="text-left py-0.5 font-normal">材料</th>
                  <th className="text-right py-0.5 font-normal">份量</th>
                </tr>
              </thead>
              <tbody>
                {a.ingredients.map((ing, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-0.5 text-ink-2">{ING_CATS[ing.cat]?.label ?? ing.cat}</td>
                    <td className="py-0.5">{ing.name}</td>
                    <td className="py-0.5 text-right">{ing.amount}{ing.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {a.notes && (
            <p className="text-xs font-light text-ink-2 whitespace-pre-wrap">{a.notes}</p>
          )}
        </div>
      );
    }

    if (a.type === 'task_add') {
      const ttLabel = TASK_TYPES[a.taskType]?.label ?? a.taskType;
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <Field label="標題:" value={a.title} />
          <Field label="工序:" value={ttLabel} />
          <Field label="狀態:" value={a.status ?? 'waiting'} />
          {a.notes && <Field label="備注:" value={a.notes} />}
        </div>
      );
    }

    if (a.type === 'stock_update') {
      return (
        <div className="mt-1">
          <Field label="" value={`${a.name} → ${a.qty}${a.unit}`} />
        </div>
      );
    }

    if (a.type === 'recipe_note') {
      return (
        <div className="mt-1">
          <p className="text-xs font-light text-ink">{a.recipeName}：{a.note.slice(0, 80)}</p>
        </div>
      );
    }

    return null;
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-3 border border-border bg-card hover:border-ink-2 transition-colors"
        style={{ borderLeftWidth: 3, borderLeftColor: '#8B6F52' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-light text-ink">貼上對話 → 批次解析</span>
          <span className="text-[10px] tracking-label text-ink-2 px-1.5 py-0.5" style={{ background: 'rgba(139,111,82,0.12)' }}>AI</span>
        </div>
        <span className="text-ink-2 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="貼入配方資料、材料清單、或與 Claude 的對話..."
            className="input-field h-32 resize-none mb-3 w-full"
          />
          <button
            onClick={handleParse}
            disabled={parsing || !input.trim()}
            className="btn text-xs mb-4"
          >
            {parsing ? '解析中...' : '解析'}
          </button>

          {actions.length > 0 && (
            <div className="space-y-3">
              {actions.map((item, idx) => (
                <div key={item.id} className="bg-card border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-xs text-ink-2 tracking-label">{ACTION_LABELS[item.action.type] ?? item.action.type}</span>
                      {renderDetail(item, idx)}
                    </div>
                    <div className="shrink-0 pt-1">
                      {item.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => confirmAction(idx)} className="btn text-xs">確認寫入</button>
                          <button onClick={() => skipAction(idx)} className="btn text-xs">跳過</button>
                        </div>
                      )}
                      {item.status === 'writing' && (
                        <span className="text-xs text-ink-2">寫入中...</span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-xs text-accent">✓ 已寫入</span>
                      )}
                      {item.status === 'skipped' && (
                        <span className="text-xs text-ink-4">已跳過</span>
                      )}
                      {item.action.type === 'journal' && item.status === 'pending' && (
                        <button onClick={() => skipAction(idx)} className="btn text-xs">關閉</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
