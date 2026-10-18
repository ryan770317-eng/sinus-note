import type { Task } from '../../types';
import { TASK_TYPES, TASK_STATUS } from '../../utils/constants';

interface Props {
  recipeId: number;
  tasks: Task[];
  onTaskClick: () => void; // Navigate to task tab
}

/** 相關工序內容（56 高細線列）。開合由外層 DrawerRow 控制。 */
export function RelatedTasks({ recipeId, tasks, onTaskClick }: Props) {
  const related = tasks.filter((t) => t.recipeId === recipeId);
  if (related.length === 0) return null;
  return (
    <div className="border-t border-border">
      {related.map((task) => {
        const tt = TASK_TYPES[task.taskType] ?? TASK_TYPES['other'];
        return (
          <button
            key={task.id}
            type="button"
            onClick={onTaskClick}
            className="w-full min-h-14 py-2 border-b border-border last:border-b-0 flex items-center justify-between gap-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-base text-ink truncate">{task.title}</span>
              <span className="block text-[13px] text-ink-2">{tt.label}</span>
            </span>
            <span className="shrink-0 text-[13px] text-ink">{TASK_STATUS[task.status].label}</span>
          </button>
        );
      })}
    </div>
  );
}
