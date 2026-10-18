import type { Task, Recipe } from '../../types';
import { TASK_TYPES, PHASE_COLORS } from '../../utils/constants';
import { taskUrgency } from '../../utils/nextTask';

interface Props {
  tasks: Task[];
  recipes: Recipe[];
  onEdit: (task: Task) => void;
}

const OVERDUE_COLOR = '#a06050';

/** 今日提醒：60px 細線列（同總覽「需要注意」樣式） */
export function TaskAlert({ tasks, recipes, onEdit }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="kicker">TODAY<span className="ml-2.5 tracking-[0.1em]">今日提醒</span><span className="ml-1.5 text-ink tabular-nums">{tasks.length}</span></h2>
      <div className="mt-2 border-t border-border">
        {tasks.map((task) => {
          const tt = TASK_TYPES[task.taskType] ?? TASK_TYPES['other'];
          const recipe = task.recipeId ? recipes.find((r) => r.id === task.recipeId) : null;
          const u = taskUrgency(task);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onEdit(task)}
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
                <span className="block text-[13px] text-ink-2 truncate">
                  {tt.label}{recipe && ` · ${recipe.name}`}
                </span>
              </span>
              <span className={`shrink-0 text-[13px] tabular-nums ${u.overdue ? 'text-error font-medium' : 'text-ink'}`}>
                {u.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
