import { useState } from 'react';
import type { Task, Recipe, BurnEntry } from '../../types';
import type { TaskStatus } from '../../types';
import { TASK_STATUS, TASK_STATUS_ORDER } from '../../utils/constants';
import { TaskAlert } from './TaskAlert';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { BurnForm } from './BurnForm';
import { todayISO } from '../../utils/date';

interface Props {
  tasks: Task[];
  alertTasks: Task[];
  recipes: Recipe[];
  materialNames: string[];
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRecipeClick: (recipeId: number) => void;
  onBurnSave: (taskId: string, recipeId: number | null, entry: BurnEntry) => Promise<void>;
}

const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

export function TaskDashboard({
  tasks,
  alertTasks,
  recipes,
  materialNames,
  onAdd,
  onUpdate,
  onDelete,
  onRecipeClick,
  onBurnSave,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [burnTask, setBurnTask] = useState<Task | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);

  function grouped(): Record<TaskStatus, Task[]> {
    const g: Record<TaskStatus, Task[]> = { waiting: [], processing: [], prep: [], ready: [], done: [] };
    for (const t of tasks) g[t.status].push(t);
    // Sort done: recent first, limit to 7 days unless expanded
    g.done = g.done
      .filter((t) => showAllDone || (t.completedDate ?? '') >= SEVEN_DAYS_AGO)
      .sort((a, b) => (b.completedDate ?? '') > (a.completedDate ?? '') ? 1 : -1);
    return g;
  }

  async function handleComplete(task: Task) {
    if (task.taskType === 'burn') {
      setBurnTask(task);
    } else {
      await onUpdate(task.id, { status: 'done', completedDate: todayISO() });
    }
  }

  async function handleBurnSave(entry: BurnEntry) {
    if (!burnTask) return;
    await onBurnSave(burnTask.id, burnTask.recipeId, entry);
    await onUpdate(burnTask.id, { status: 'done', completedDate: todayISO() });
    setBurnTask(null);
  }

  const g = grouped();
  const totalDone = tasks.filter((t) => t.status === 'done').length;
  const hiddenDone = tasks.filter((t) => t.status === 'done' && (t.completedDate ?? '') < SEVEN_DAYS_AGO).length;

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <h1 className="font-serif text-xl text-ink tracking-wide mb-6">工序</h1>

      <TaskAlert tasks={alertTasks} recipes={recipes} onEdit={setEditTask} />

      {editTask && (
        <div className="mb-6">
          <TaskForm
            initial={editTask}
            recipes={recipes}
            materialNames={materialNames}
            onSave={async (data) => {
              await onUpdate(editTask.id, data);
              setEditTask(null);
            }}
            onCancel={() => setEditTask(null)}
          />
        </div>
      )}

      {showForm && !editTask && (
        <div className="mb-6">
          <TaskForm
            recipes={recipes}
            materialNames={materialNames}
            onSave={async (data) => {
              await onAdd(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Grouped list */}
      {TASK_STATUS_ORDER.map((status) => {
        const group = g[status];
        if (group.length === 0) return null;
        return (
          <div key={status} className="mb-6">
            <p className="section-label mb-3">{TASK_STATUS[status].label}</p>
            <div className="space-y-3">
              {group.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  recipes={recipes}
                  onEdit={setEditTask}
                  onComplete={handleComplete}
                  onDelete={onDelete}
                  onRecipeClick={onRecipeClick}
                />
              ))}
            </div>
            {status === 'done' && hiddenDone > 0 && !showAllDone && (
              <button
                onClick={() => setShowAllDone(true)}
                className="mt-3 text-xs text-ink-2 font-light underline"
              >
                顯示全部已完成（共 {totalDone} 筆）
              </button>
            )}
          </div>
        );
      })}

      {tasks.length === 0 && !showForm && (
        <p className="text-sm text-ink-3 font-light text-center py-16">
          還沒有工序，點 ＋ 新增
        </p>
      )}

      {/* FAB */}
      {!showForm && !editTask && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed right-5 w-14 h-14 bg-ink text-bg text-2xl flex items-center justify-center z-40 shadow-sm hover:bg-ink-2 transition-colors"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
          aria-label="新增工序"
        >
          ＋
        </button>
      )}

      {burnTask && (
        <BurnForm onSave={handleBurnSave} onCancel={() => setBurnTask(null)} />
      )}
    </div>
  );
}
