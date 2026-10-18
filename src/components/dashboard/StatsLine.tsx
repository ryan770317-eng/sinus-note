import type { Recipe, Task } from '../../types';

interface Props {
  recipes: Recipe[];
  tasks: Task[];
}

/** 總覽統計一行：配方 N · 進行中 N · 已完工序 N / N（公式沿用舊 StatsRow） */
export function StatsLine({ recipes, tasks }: Props) {
  const progressCount = recipes.filter((r) => r.status === 'progress').length;
  const activeTaskCount = tasks.filter((t) => ['waiting', 'processing', 'prep'].includes(t.status)).length;
  const doneTaskCount = tasks.filter((t) => t.status === 'done').length;
  const Num = ({ n }: { n: number }) => <span className="text-ink tabular-nums">{n}</span>;
  return (
    <p className="text-[13px] text-ink-2" aria-label="資料總覽">
      配方 <Num n={recipes.length} />
      <span aria-hidden="true">{"\u3000·\u3000"}</span>
      進行中 <Num n={progressCount + activeTaskCount} />
      <span aria-hidden="true">{"\u3000·\u3000"}</span>
      已完工序 <Num n={doneTaskCount} /> / <Num n={tasks.length} />
    </p>
  );
}
