import { useState } from 'react';
import type { Recipe, Material, Task, IngredientCat, FragCat, TaskType, TaskStatus } from '../../types';
import { callClaude, BATCH_SYSTEM_PROMPT } from '../../services/claude';
import { todayISO } from '../../utils/date';

type BatchAction =
  | { type: 'material_add'; cat: IngredientCat; name: string; origin: string; supplier: string; note: string; qty: number; unit: string }
  | { type: 'stock_update'; name: string; qty: number; unit: string }
  | { type: 'recipe_add'; name: string; fragCat: FragCat; ingredients: Array<{ cat: IngredientCat; name: string; amount: number; unit: string }>; notes: string }
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

  async function handleParse() {
    if (!input.trim()) return;
    setParsing(true);
    setActions([]);
    try {
      const raw = await callClaude(BATCH_SYSTEM_PROMPT, input);
      const parsed = JSON.parse(raw) as BatchAction[];
      setActions(parsed.map((a) => ({ action: a, status: 'pending' })));
    } catch (err) {
      alert(`解析失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(false);
    }
  }

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
        await onAddRecipe({
          num: `V-${String.fromCharCode(64 + (nextId % 26 || 26))}`,
          name: a.name,
          fragCat: a.fragCat,
          status: 'pending',
          rating: 0,
          tags: [],
          process: { tincture: false, ferment: false, wine: false, notes: '' },
          timeline: { makeDate: todayISO(), dryDays: 5, agingStart: '', agingNotes: '' },
          versions: [{ label: '主版', totalWeight: 0, ingredients: a.ingredients ?? [], notes: a.notes ?? '', comments: [] }],
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

  function describAction(a: BatchAction): string {
    if (a.type === 'material_add') return `${a.name}（${a.cat}）`;
    if (a.type === 'stock_update') return `${a.name} → ${a.qty}${a.unit}`;
    if (a.type === 'recipe_add') return a.name;
    if (a.type === 'recipe_note') return `${a.recipeName}：${a.note.slice(0, 30)}`;
    if (a.type === 'task_add') return a.title;
    return '日誌資訊';
  }

  // Suppress unused var warning
  void materials;

  return (
    <div className="border-t border-border mt-4 pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-light text-ink-2 w-full text-left mb-3"
      >
        <span className="section-label">貼上對話 → 批次解析</span>
        <span className="ml-auto text-ink-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="貼入與 Claude 的對話..."
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
            <div className="space-y-2">
              {actions.map((item, idx) => (
                <div key={idx} className="bg-card border border-border p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <span className="text-xs text-ink-2 tracking-label">{ACTION_LABELS[item.action.type] ?? item.action.type}</span>
                      <p className="text-sm font-light text-ink">{describAction(item.action)}</p>
                    </div>
                    <div className="shrink-0">
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
