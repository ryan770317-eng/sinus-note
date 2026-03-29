import { useState } from 'react';
import type { Task } from '../../types';
import { TASK_TYPES, TASK_STATUS } from '../../utils/constants';

interface Props {
  recipeId: number;
  tasks: Task[];
  onTaskClick: () => void; // Navigate to task tab
}

export function RelatedTasks({ recipeId, tasks, onTaskClick }: Props) {
  const [open, setOpen] = useState(false);
  const related = tasks.filter((t) => t.recipeId === recipeId);

  if (related.length === 0) return null;

  return (
    <div className="border-t border-border mt-4 pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="section-label">相關工序</span>
        <span className="text-ink-4 text-xs ml-1">{related.length} 筆</span>
        <span className="ml-auto text-ink-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {related.map((task) => {
            const tt = TASK_TYPES[task.taskType];
            return (
              <button
                key={task.id}
                onClick={onTaskClick}
                className="w-full text-left bg-card border border-border px-3 py-2 hover:border-ink-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-2">{tt.icon} {tt.label}</span>
                    <p className="text-sm font-serif text-ink">{task.title}</p>
                  </div>
                  <span className="text-xs text-ink-3">{TASK_STATUS[task.status].label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
