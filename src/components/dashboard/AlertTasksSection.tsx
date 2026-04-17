import type { Task, Recipe } from '../../types';
import { TASK_TYPES, TASK_STATUS, PHASE_COLORS } from '../../utils/constants';
import { daysUntil } from '../../utils/date';
import { SectionHeader } from '../shared/SectionHeader';

interface Props {
  tasks: Task[];
  recipes: Recipe[];
  onOpen: () => void;
}

export function AlertTasksSection({ tasks, recipes, onOpen }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader title="需要注意" count={tasks.length} color="#a06050" onMore={onOpen} />
      <div className="space-y-2">
        {tasks.map((t) => {
          const tt = TASK_TYPES[t.taskType] ?? TASK_TYPES['other'];
          const isInstant = tt.defaultDays === 0;
          let urgency = '';
          let urgencyColor = '';
          if (isInstant) {
            urgency = TASK_STATUS[t.status].label;
            urgencyColor = '#8B6F52';
          } else if (t.dueDate) {
            const d = daysUntil(t.dueDate);
            if (d < 0)       { urgency = `逾期 ${Math.abs(d)} 天`; urgencyColor = '#a06050'; }
            else if (d === 0){ urgency = '今天到期';              urgencyColor = '#a06050'; }
            else             { urgency = `剩 ${d} 天`;             urgencyColor = '#8B6F52'; }
          }
          const recipe = t.recipeId ? recipes.find((r) => r.id === t.recipeId) : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={onOpen}
              className="w-full text-left border border-border px-4 py-3 cursor-pointer hover:border-ink-2 transition-colors"
              style={{ borderLeftWidth: 3, borderLeftColor: urgencyColor }}
              aria-label={`${t.title} — ${urgency}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-label mb-0.5" style={{ color: PHASE_COLORS[tt.phase] }}>
                    {tt.icon} {tt.label}
                    {recipe && <span className="text-ink-4 ml-1">· {recipe.name}</span>}
                  </p>
                  <p className="text-sm font-serif text-ink truncate">{t.title}</p>
                </div>
                <span className="text-xs font-light shrink-0" style={{ color: urgencyColor }}>{urgency}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
