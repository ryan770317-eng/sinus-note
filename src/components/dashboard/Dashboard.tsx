import { useState } from 'react';
import type { Recipe, Material, Task, Note } from '../../types';
import { isAlertTask } from '../../hooks/supabase/useTasks';
import { PHASE_COLORS, TASK_TYPES } from '../../utils/constants';
import { formatDashboardDate, formatNoteDate } from '../../utils/date';
import { pickNextTask, taskUrgency } from '../../utils/nextTask';
import { BatchImport } from '../notes/BatchImport';
import { GlobalSearch } from './GlobalSearch';
import { StatsLine } from './StatsLine';
import { IconSettings } from '../nav/NavIcons';
import { SectionHeader } from '../shared/SectionHeader';
import { DrawerRow } from '../shared/DrawerRow';
import { RecipeRow } from '../shared/RecipeRow';

interface Props {
  recipes: Recipe[];
  tasks: Task[];
  materials: Material[];
  notes: Note[];
  isMock: boolean;
  nextId: number;
  /** 尚未備份或超過 30 天（齒輪角標用） */
  backupDue: boolean;
  onTabChange: (tab: 'recipe' | 'task' | 'material' | 'notes') => void;
  onRecipeClick: (id: number) => void;
  onMaterialClick: (query: string) => void;
  onNoteClick: (query: string) => void;
  /** 切到工序分頁並打開該工序的編輯 */
  onTaskOpen: (taskId: string) => void;
  onAddMaterial: (mat: Omit<Material, 'id'>) => Promise<Material>;
  onUpdateStock: (name: string, qty: number, unit: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddRecipeNote: (recipeId: number, note: string) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  /** 手機版設定入口（底部導航沒有設定格） */
  onMenuOpen: () => void;
}

const OVERDUE_COLOR = '#a06050';
const AMBER = '#9a8040';

type Drawer = 'recipes' | 'notes' | 'batch' | null;

export function Dashboard({
  recipes,
  tasks,
  materials,
  notes,
  isMock,
  nextId,
  backupDue,
  onTabChange,
  onRecipeClick,
  onMaterialClick,
  onNoteClick,
  onTaskOpen,
  onAddMaterial,
  onUpdateStock,
  onAddRecipe,
  onAddRecipeNote,
  onAddTask,
  onMenuOpen,
}: Props) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [restOpen, setRestOpen] = useState(false);
  const toggle = (d: Drawer) => setDrawer((cur) => (cur === d ? null : d));

  const nextTask = pickNextTask(tasks);
  const alertTasks = tasks.filter(isAlertTask);
  const attention = alertTasks.filter((t) => t.id !== nextTask?.id);
  const attentionHead = attention.slice(0, 2);
  const attentionRest = attention.slice(2);

  const recentRecipes = [...recipes].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  const recipeSummary =
    recentRecipes.slice(0, 3).map((r) => r.name).join('、') + (recentRecipes.length > 3 ? '…' : '');

  const recipeName = (t: Task) => (t.recipeId ? recipes.find((r) => r.id === t.recipeId)?.name : undefined);

  const gearFlag = backupDue || isMock;
  const gearLabel = backupDue ? '設定（尚未備份）' : isMock ? '設定（示範資料）' : '開啟設定選單';

  const empty = recipes.length === 0 && tasks.length === 0 && materials.length === 0 && notes.length === 0;

  return (
    <div className="max-w-content mx-auto px-5 pt-7 pb-20">
      {/* Header */}
      <div className="min-h-14 flex items-start justify-between gap-3">
        <div>
          <h1 className="type-display">SINUS NOTE</h1>
          <p className="text-[13px] text-ink-2 mt-0.5 tabular-nums">{formatDashboardDate(new Date())}</p>
        </div>
        {/* 手機版設定入口；桌面版頂列已有設定鈕 */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="md:hidden relative w-11 h-11 -mr-3 flex items-center justify-center text-ink"
          aria-label={gearLabel}
        >
          <IconSettings size={20} />
          {gearFlag && (
            <span
              aria-hidden="true"
              className="absolute top-2 right-2 w-1.5 h-1.5"
              style={{ background: AMBER }}
            />
          )}
        </button>
      </div>

      {/* Global search */}
      <div className="mt-5">
        <GlobalSearch
          recipes={recipes}
          materials={materials}
          notes={notes}
          onRecipeClick={onRecipeClick}
          onMaterialClick={onMaterialClick}
          onNoteClick={onNoteClick}
        />
      </div>

      <div className="mt-4">
        <StatsLine recipes={recipes} tasks={tasks} />
      </div>

      {/* NEXT 下一步 */}
      {nextTask && (() => {
        const u = taskUrgency(nextTask);
        const tt = TASK_TYPES[nextTask.taskType] ?? TASK_TYPES.other;
        const barColor = u.overdue ? OVERDUE_COLOR : PHASE_COLORS[tt.phase];
        const rn = recipeName(nextTask);
        return (
          <section className="mt-8">
            <SectionHeader kicker="NEXT" title="下一步" />
            <div
              className="mt-2 bg-card border-l-[3px] px-[18px] py-[18px] flex items-end justify-between gap-3"
              style={{ borderLeftColor: barColor }}
            >
              <div className="min-w-0">
                <p className={`text-xs font-medium tracking-[0.12em] ${u.overdue ? 'text-error' : 'text-ink-2'}`}>
                  {u.overdue ? '最急' : '下一步'}
                </p>
                <p className="font-serif text-xl text-ink mt-1">{nextTask.title}</p>
                <p className="text-[13px] text-ink-2 mt-1">
                  {rn && <>{rn} · </>}
                  <span className={u.overdue ? 'text-error font-medium tabular-nums' : 'tabular-nums'}>{u.text}</span>
                </p>
              </div>
              <button type="button" onClick={() => onTaskOpen(nextTask.id)} className="btn-primary shrink-0">
                處理
              </button>
            </div>
          </section>
        );
      })()}

      {/* ATTENTION 需要注意 */}
      {alertTasks.length > 0 && attention.length > 0 && (
        <section className="mt-8">
          <SectionHeader kicker="ATTENTION" title="需要注意" count={alertTasks.length} />
          <div className="mt-1 border-t border-border">
            {attentionHead.map((t) => (
              <AttentionRow key={t.id} task={t} onOpen={() => onTaskOpen(t.id)} />
            ))}
          </div>
          {attentionRest.length > 0 && (
            <div className="-mt-px border-b border-border">
              <DrawerRow
                label={`其餘 ${attentionRest.length} 項`}
                summary={attentionRest.map((t) => t.title).join('、')}
                open={restOpen}
                onToggle={() => setRestOpen((o) => !o)}
              >
                <div className="border-t border-border">
                  {attentionRest.map((t) => (
                    <AttentionRow key={t.id} task={t} onOpen={() => onTaskOpen(t.id)} />
                  ))}
                </div>
              </DrawerRow>
            </div>
          )}
        </section>
      )}

      {/* Drawers */}
      <div className="mt-10 border-b border-border">
        {recipes.length > 0 && (
          <DrawerRow
            label="近期配方"
            count={recipes.length}
            summary={recipeSummary}
            open={drawer === 'recipes'}
            onToggle={() => toggle('recipes')}
          >
            <div className="border-t border-border">
              {recentRecipes.slice(0, 4).map((r) => (
                <RecipeRow key={r.id} recipe={r} onClick={() => onRecipeClick(r.id)} />
              ))}
            </div>
            <button type="button" onClick={() => onTabChange('recipe')} className="btn-text mt-1 -ml-3">
              全部 →
            </button>
          </DrawerRow>
        )}

        {notes.length > 0 && (
          <DrawerRow
            label="最新隨手記"
            count={notes.length}
            summary={notes[0].text.slice(0, 30)}
            open={drawer === 'notes'}
            onToggle={() => toggle('notes')}
          >
            <div className="space-y-2">
              {notes.slice(0, 2).map((n) => {
                const { date, time } = formatNoteDate(n.ts);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onTabChange('notes')}
                    className="block w-full text-left bg-card p-3.5"
                    aria-label={`開啟隨手記：${n.text.slice(0, 40)}`}
                  >
                    <p className="text-xs text-ink-2 tabular-nums">{date} {time}</p>
                    <p className="text-base text-ink line-clamp-2 mt-1">{n.text}</p>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => onTabChange('notes')} className="btn-text mt-1 -ml-3">
              全部 →
            </button>
          </DrawerRow>
        )}

        <DrawerRow
          label="批次解析"
          summary="貼上對話，AI 整理成配方、材料、工序"
          trailing={<span className="text-xs font-medium tracking-[0.1em] text-ink-2 border border-border px-1.5 py-0.5">AI</span>}
          open={drawer === 'batch'}
          onToggle={() => toggle('batch')}
        >
          <BatchImport
            // 批次匯入是「寫入真資料」的入口：示範模式下比對用的清單必須是空的，
            // 否則同名材料會被誤判為已存在而跳過
            recipes={isMock ? [] : recipes}
            materials={isMock ? [] : materials}
            nextId={nextId}
            onAddMaterial={onAddMaterial}
            onUpdateStock={onUpdateStock}
            onAddRecipe={onAddRecipe}
            onAddRecipeNote={onAddRecipeNote}
            onAddTask={onAddTask}
          />
        </DrawerRow>
      </div>

      {/* Empty state（四個 store 皆空才會出現；示範模式不會看到） */}
      {empty && (
        <div className="text-center py-16">
          <p className="font-serif text-2xl text-ink-2 mb-3">引香筆記</p>
          <p className="type-body text-ink-2">從下方選單開始新增配方或工序</p>
        </div>
      )}
    </div>
  );
}

function AttentionRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const tt = TASK_TYPES[task.taskType] ?? TASK_TYPES.other;
  const u = taskUrgency(task);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full h-[60px] border-b border-border flex items-center gap-3 text-left"
      aria-label={`${task.title} — ${u.text}`}
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 shrink-0"
        style={{ background: u.overdue ? OVERDUE_COLOR : PHASE_COLORS[tt.phase] }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-base text-ink truncate">{task.title}</span>
        <span className="block text-[13px] text-ink-2">{tt.label}</span>
      </span>
      <span className={`shrink-0 text-[13px] tabular-nums ${u.overdue ? 'text-error font-medium' : 'text-ink'}`}>
        {u.text}
      </span>
    </button>
  );
}
