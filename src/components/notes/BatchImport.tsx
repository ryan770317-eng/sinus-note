import { useRef, useState } from 'react';
import type { Recipe, Material, Task, IngredientCat, FragCat, TaskType, TaskStatus } from '../../types';
import { callClaude, BATCH_SYSTEM_PROMPT } from '../../services/claude';
import { todayISO } from '../../utils/date';
import { useToast } from '../shared/Toast';
import { versionTag, uid } from '../../utils/id';
import type { BatchAction, ActionState } from './batch/types';
import { ACTION_LABELS } from './batch/types';
import { ActionDetail } from './batch/ActionDetail';

interface Props {
  recipes: Recipe[];
  materials: Material[];
  nextId: number;
  onAddMaterial: (mat: Omit<Material, 'id'>) => Promise<Material>;
  onUpdateStock: (name: string, qty: number, unit: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddRecipeNote: (recipeId: number, note: string) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  suppressSync: (ms?: number) => void;
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
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [actions, setActions] = useState<ActionState[]>([]);
  const [writingAll, setWritingAll] = useState(false);
  // 同一批連續寫入多個配方時，讓 num（V-x）不重複：nextId prop 在迴圈中不會更新
  const recipeSeqRef = useRef(0);

  const existingMatNames = new Set(materials.map((m) => m.name));

  function updateAction(idx: number, patch: Partial<BatchAction>) {
    setActions((prev) => prev.map((a, i) =>
      i === idx ? { ...a, action: { ...a.action, ...patch } as BatchAction } : a,
    ));
  }

  async function handleParse() {
    if (!input.trim()) return;
    setParsing(true);
    setActions([]);
    try {
      const raw = await callClaude(BATCH_SYSTEM_PROMPT, input);
      const cleaned = sanitizeJson(raw);
      const parsedRaw = JSON.parse(cleaned);
      if (!Array.isArray(parsedRaw)) {
        toast.error('解析結果格式錯誤：應為陣列');
        return;
      }
      const parsed = (parsedRaw as Record<string, unknown>[]).map(cleanAction).filter((a): a is BatchAction => a !== null);
      if (parsed.length === 0) {
        toast.info('解析結果為空，請確認貼入的內容格式');
        return;
      }

      const results: ActionState[] = [];
      let skippedCount = 0;
      for (const a of parsed) {
        const stableId = uid(a.type);
        if (a.type === 'material_add' && existingMatNames.has(a.name)) {
          results.push({ action: a, id: stableId, status: 'skipped' });
          skippedCount++;
        } else {
          results.push({ action: a, id: stableId, status: 'pending' });
        }
      }

      setActions(results);
      recipeSeqRef.current = 0;
      if (skippedCount > 0) {
        toast.info(`已自動跳過 ${skippedCount} 筆已存在的材料`);
      } else {
        toast.success(`共解析出 ${parsed.length} 筆動作`);
      }
    } catch (err) {
      toast.error(`解析失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(false);
    }
  }

  /** 實際寫入單一 action（confirmAction / confirmAll 共用） */
  async function writeAction(a: BatchAction): Promise<void> {
    if (a.type === 'material_add') {
      await onAddMaterial({ cat: a.cat, name: a.name, origin: a.origin ?? '', supplier: a.supplier ?? '', note: a.note ?? '', stock: { qty: a.qty ?? 0, unit: a.unit ?? 'g', note: '' } });
    } else if (a.type === 'stock_update') {
      await onUpdateStock(a.name, a.qty, a.unit);
    } else if (a.type === 'recipe_add') {
      const tw = a.totalWeight || (a.ingredients ?? []).reduce((s, i) => s + i.amount, 0);
      const seq = recipeSeqRef.current;
      recipeSeqRef.current += 1;
      await onAddRecipe({
        num: versionTag(nextId + seq),
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
      // 找不到目標配方時要明確失敗，不能顯示「已寫入」但其實什麼都沒寫
      if (!recipeId) throw new Error(`找不到配方「${a.recipeName || '?'}」，備註未寫入`);
      await onAddRecipeNote(recipeId, a.note);
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
  }

  async function confirmAction(idx: number) {
    if (writingAll) return; // 全部寫入進行中，避免同一筆被寫兩次
    const item = actions[idx];
    if (!item || item.status !== 'pending') return;

    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, status: 'writing' } : a));
    suppressSync(2000);

    try {
      await writeAction(item.action);
      setActions((prev) => prev.map((aa, i) => i === idx ? { ...aa, status: 'done' } : aa));
      toast.success('寫入完成');
    } catch (err) {
      toast.error(`寫入失敗：${err instanceof Error ? err.message : String(err)}`);
      setActions((prev) => prev.map((aa, i) => i === idx ? { ...aa, status: 'pending' } : aa));
    }
  }

  /** 一鍵寫入全部 pending（journal 除外），逐筆進行、失敗不中斷 */
  async function confirmAll() {
    if (writingAll) return;
    const snapshot = actions;
    setWritingAll(true);
    suppressSync(5000);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < snapshot.length; i++) {
      const item = snapshot[i];
      if (item.status !== 'pending' || item.action.type === 'journal') continue;
      setActions((prev) => prev.map((a, idx) => idx === i ? { ...a, status: 'writing' } : a));
      try {
        await writeAction(item.action);
        ok++;
        setActions((prev) => prev.map((a, idx) => idx === i ? { ...a, status: 'done' } : a));
      } catch (err) {
        fail++;
        setActions((prev) => prev.map((a, idx) => idx === i ? { ...a, status: 'pending' } : a));
        toast.error(`第 ${i + 1} 筆寫入失敗：${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setWritingAll(false);
    if (fail === 0 && ok > 0) toast.success(`全部寫入完成，共 ${ok} 筆`);
    else if (ok > 0) toast.info(`寫入完成：成功 ${ok} 筆、失敗 ${fail} 筆（失敗的保留為待確認）`);
  }

  function skipAction(idx: number) {
    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, status: 'skipped' } : a));
  }

  const pendingCount = actions.filter((a) => a.status === 'pending' && a.action.type !== 'journal').length;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="batch-import-panel"
        aria-label={`批次解析工具（${open ? '已展開' : '已收合'}）`}
        className="flex items-center justify-between w-full px-4 py-3 border border-border bg-card hover:border-ink-2 transition-colors"
        style={{ borderLeftWidth: 3, borderLeftColor: '#8B6F52' }}
      >
        <div className="flex items-center gap-2">
          <span className="type-meta text-ink">貼上對話 → 批次解析</span>
          <span className="type-micro tracking-label text-ink-2 px-1.5 py-0.5" style={{ background: 'rgba(139,111,82,0.12)' }}>AI</span>
        </div>
        <span className="text-ink-2 text-xs" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div id="batch-import-panel">
          <label htmlFor="batch-input" className="sr-only">貼入內容</label>
          <textarea
            id="batch-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="貼入配方資料、材料清單、或與 Claude 的對話..."
            className="input-field h-32 resize-none mb-3 w-full"
          />
          <button
            onClick={handleParse}
            disabled={parsing || !input.trim()}
            className="btn text-xs mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={parsing ? '解析中' : '解析貼入內容'}
          >
            {parsing ? '解析中...' : '解析'}
          </button>

          {actions.length > 0 && (
            <div className="space-y-3">
              {pendingCount > 1 && (
                <div className="flex justify-end">
                  <button
                    onClick={confirmAll}
                    disabled={writingAll}
                    className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`寫入全部 ${pendingCount} 筆待確認動作`}
                  >
                    {writingAll ? '寫入中…' : `全部寫入（${pendingCount} 筆）`}
                  </button>
                </div>
              )}
              {actions.map((item, idx) => (
                <div key={item.id} className="bg-card border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="type-meta tracking-label">
                        {ACTION_LABELS[item.action.type] ?? item.action.type}
                      </span>
                      <ActionDetail
                        item={item}
                        existingMatNames={existingMatNames}
                        onPatch={(patch) => updateAction(idx, patch)}
                      />
                    </div>
                    <div className="shrink-0 pt-1">
                      {item.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => confirmAction(idx)} className="btn text-xs">確認寫入</button>
                          <button onClick={() => skipAction(idx)} className="btn text-xs">跳過</button>
                        </div>
                      )}
                      {item.status === 'writing' && (
                        <span className="type-meta">寫入中...</span>
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
