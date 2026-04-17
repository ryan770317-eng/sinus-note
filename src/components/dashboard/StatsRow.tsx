import type { Recipe, Task } from '../../types';

interface Props {
  recipes: Recipe[];
  tasks: Task[];
}

export function StatsRow({ recipes, tasks }: Props) {
  const successCount  = recipes.filter((r) => r.status === 'success').length;
  const progressCount = recipes.filter((r) => r.status === 'progress').length;
  const activeTaskCount = tasks.filter((t) => ['waiting', 'processing', 'prep'].includes(t.status)).length;
  const doneTaskCount   = tasks.filter((t) => t.status === 'done').length;

  const stats = [
    { label: '配方總數', value: recipes.length, sub: `${successCount} 成功`, color: '#8B6F52' },
    { label: '進行中',   value: progressCount + activeTaskCount, sub: '配方＋工序', color: '#5f7a5f' },
    { label: '已完工序', value: doneTaskCount, sub: `共 ${tasks.length} 筆`, color: '#5a7a8c' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6" role="group" aria-label="資料總覽">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-card border border-border px-3 py-3 text-center"
          style={{ borderTopWidth: 2, borderTopColor: s.color }}
        >
          <p className="font-serif text-2xl" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] tracking-label mt-0.5" style={{ color: s.color }}>{s.label}</p>
          <p className="text-[10px] text-ink-2 font-light opacity-70">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
