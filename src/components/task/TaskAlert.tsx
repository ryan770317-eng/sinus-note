import type { Task, Recipe } from '../../types';
import { TASK_TYPES, TASK_STATUS } from '../../utils/constants';
import { daysUntil, fmtDate } from '../../utils/date';

interface Props {
  tasks: Task[];
  recipes: Recipe[];
  onEdit: (task: Task) => void;
}

export function TaskAlert({ tasks, recipes, onEdit }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="section-label mb-3">今日提醒</p>
      <div className="space-y-2">
        {tasks.map((task) => {
          const tt = TASK_TYPES[task.taskType];
          const isInstant = tt.defaultDays === 0;
          const recipe = task.recipeId ? recipes.find((r) => r.id === task.recipeId) : null;
          let badge = '';
          let badgeColor = '';

          if (isInstant) {
            badge = TASK_STATUS[task.status].label;
            badgeColor = 'text-accent';
          } else if (task.dueDate) {
            const days = daysUntil(task.dueDate);
            if (days < 0) {
              badge = `已到期 ${Math.abs(days)} 天`;
              badgeColor = 'text-error';
            } else {
              badge = `剩 ${days} 天`;
              badgeColor = 'text-accent';
            }
          }

          return (
            <button
              key={task.id}
              onClick={() => onEdit(task)}
              className="w-full text-left bg-card border border-border px-4 py-3 hover:border-ink-2 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-ink-2">{tt.icon} {tt.label}</span>
                    {recipe && (
                      <span className="text-xs text-ink-3">· {recipe.name}</span>
                    )}
                  </div>
                  <p className="text-sm font-serif text-ink truncate">{task.title}</p>
                  {task.dueDate && !isInstant && (
                    <p className="text-xs text-ink-3 mt-0.5">{fmtDate(task.startDate)} → {fmtDate(task.dueDate)}</p>
                  )}
                </div>
                <span className={`text-xs font-light shrink-0 ${badgeColor}`}>{badge}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
