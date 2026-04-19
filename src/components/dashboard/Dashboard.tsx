import type { Recipe, Material, Task, Note } from '../../types';
import { TASK_TYPES } from '../../utils/constants';
import { daysUntil } from '../../utils/date';
import { BatchImport } from '../notes/BatchImport';
import { StatsRow } from './StatsRow';
import { AlertTasksSection } from './AlertTasksSection';
import { ActiveTasksSection } from './ActiveTasksSection';
import { RecentRecipesSection } from './RecentRecipesSection';
import { MaterialOverviewSection } from './MaterialOverviewSection';
import { LatestNotesSection } from './LatestNotesSection';

interface Props {
  recipes: Recipe[];
  tasks: Task[];
  materials: Material[];
  notes: Note[];
  isMock: boolean;
  nextId: number;
  onTabChange: (tab: 'recipe' | 'task' | 'material' | 'notes') => void;
  onRecipeClick: (id: number) => void;
  onTaskClick: () => void;
  onAddMaterial: (mat: Omit<Material, 'id'>) => Promise<void>;
  onUpdateStock: (name: string, qty: number, unit: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddRecipeNote: (recipeId: number, note: string) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  suppressSync: (ms?: number) => void;
}

export function Dashboard({
  recipes,
  tasks,
  materials,
  notes,
  isMock,
  nextId,
  onTabChange,
  onRecipeClick,
  onAddMaterial,
  onUpdateStock,
  onAddRecipe,
  onAddRecipeNote,
  onAddTask,
  suppressSync,
}: Props) {
  const today = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });

  // ── Alerts: overdue or due ≤ 3 days ─────────────────────────────
  const alertTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const tt = TASK_TYPES[t.taskType] ?? TASK_TYPES['other'];
    if (tt.defaultDays === 0) return true;
    if (!t.dueDate) return false;
    return daysUntil(t.dueDate) <= 3;
  });

  // ── Active tasks (not done) ──────────────────────────────────────
  const activeTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate > b.dueDate ? 1 : -1;
    })
    .slice(0, 5);

  // ── Recent recipes ───────────────────────────────────────────────
  const recentRecipes = [...recipes]
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
    .slice(0, 4);

  const openTask     = () => onTabChange('task');
  const openRecipe   = () => onTabChange('recipe');
  const openMaterial = () => onTabChange('material');
  const openNotes    = () => onTabChange('notes');

  const empty = recipes.length === 0 && tasks.length === 0 && materials.length === 0;

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="type-display">SINUS NOTE</h1>
        <p className="type-meta mt-0.5">{today}</p>
      </div>

      {/* Mock data banner */}
      {isMock && (
        <div
          className="mb-5 px-3 py-2 border border-dashed border-ink-4 type-micro"
          role="status"
        >
          目前顯示示範資料（假），登入後將自動載入您的真實資料
        </div>
      )}

      <StatsRow recipes={recipes} tasks={tasks} />

      <AlertTasksSection tasks={alertTasks} recipes={recipes} onOpen={openTask} />
      <ActiveTasksSection tasks={activeTasks} recipes={recipes} onOpen={openTask} />
      <RecentRecipesSection
        recipes={recentRecipes}
        totalCount={recipes.length}
        onOpen={openRecipe}
        onRecipeClick={onRecipeClick}
      />
      <MaterialOverviewSection materials={materials} onOpen={openMaterial} />
      <LatestNotesSection notes={notes} onOpen={openNotes} />

      {/* ── Batch import ──────────────────────────────────────── */}
      <div className="mb-6">
        <BatchImport
          recipes={recipes}
          materials={materials}
          nextId={nextId}
          onAddMaterial={onAddMaterial}
          onUpdateStock={onUpdateStock}
          onAddRecipe={onAddRecipe}
          onAddRecipeNote={onAddRecipeNote}
          onAddTask={onAddTask}
          suppressSync={suppressSync}
        />
      </div>

      {/* ── Empty state ───────────────────────────────────────── */}
      {empty && (
        <div className="text-center py-16">
          <p className="font-serif text-2xl text-ink-4 mb-3">引香筆記</p>
          <p className="type-body text-ink-3">從下方選單開始新增配方或工序</p>
        </div>
      )}
    </div>
  );
}
