import type { Task, Recipe } from '../../types';
import { TASK_TYPES, TASK_STATUS, PHASE_COLORS } from '../../utils/constants';
import { calcProgress, fmtDate } from '../../utils/date';
import { ProgressBar } from '../shared/ProgressBar';
import { SectionHeader } from '../shared/SectionHeader';

interface Props {
  tasks: Task[];
  recipes: Recipe[];
  onOpen: () => void;
}

export function ActiveTasksSection({ tasks, recipes, onOpen }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader title="工序進行中" count={tasks.length} onMore={onOpen} />
      <div className="space-y-2">
        {tasks.map((t) => {
          const tt = TASK_TYPES[t.taskType] ?? TASK_TYPES['other'];
          const isInstant = tt.defaultDays === 0;
          const progress = !isInstant && t.dueDate ? calcProgress(t.startDate, t.dueDate) : null;
          const phaseColor = PHASE_COLORS[tt.phase];
          const recipe = t.recipeId ? recipes.find((r) => r.id === t.recipeId) : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={onOpen}
              className="w-full text-left border border-border px-4 py-3 cursor-pointer hover:border-ink-2 transition-colors"
              style={{ borderLeftWidth: 3, borderLeftColor: phaseColor }}
              aria-label={`${t.title} — ${TASK_STATUS[t.status].label}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="type-micro tracking-label mb-0.5" style={{ color: phaseColor }}>
                    {tt.icon} {tt.label}
                    {recipe && <span className="text-ink-4 ml-1">· {recipe.name}</span>}
                  </p>
                  <p className="type-name truncate">{t.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className="type-micro px-1.5 py-0.5"
                    style={{ background: `${phaseColor}18`, color: phaseColor }}
                  >
                    {TASK_STATUS[t.status].label}
                  </span>
                </div>
              </div>
              {progress !== null && (
                <div>
                  <div className="flex justify-between type-micro text-ink-4 mb-1">
                    <span>{fmtDate(t.startDate)} → {fmtDate(t.dueDate)}</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
