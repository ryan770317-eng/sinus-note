import type { Task } from '../types';
import { TASK_TYPES, TASK_STATUS } from './constants';
import { daysUntil } from './date';

const isInstant = (t: Task) => (TASK_TYPES[t.taskType] ?? TASK_TYPES.other).defaultDays === 0;

/**
 * 總覽「下一步」：從未完成工序中挑一筆最該處理的。依序：
 *  (a) 已逾期 → 逾期最多天
 *  (b) 今天到期
 *  (c) 即時工序（defaultDays 0）且狀態為待處理／處理中 → createdAt 最早
 *  (d) 其餘有 dueDate 者 → dueDate 最近
 *  都沒有 → null
 */
export function pickNextTask(tasks: Task[]): Task | null {
  const open = tasks.filter((t) => t.status !== 'done');
  const dated = open
    .filter((t) => !!t.dueDate)
    .map((t) => ({ t, d: daysUntil(t.dueDate as string) }))
    .sort((a, b) => a.d - b.d);

  const overdue = dated.find((x) => x.d < 0);
  if (overdue) return overdue.t;

  const today = dated.find((x) => x.d === 0);
  if (today) return today.t;

  const instant = open
    .filter((t) => isInstant(t) && (t.status === 'ready' || t.status === 'processing'))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  if (instant.length) return instant[0];

  return dated[0]?.t ?? null;
}

/** 工序急迫度文字：逾期 N 天／今天到期／剩 N 天；即時工序或無期限 → 狀態名 */
export function taskUrgency(t: Task): { text: string; overdue: boolean } {
  if (t.dueDate && !isInstant(t)) {
    const d = daysUntil(t.dueDate);
    if (d < 0) return { text: `逾期 ${Math.abs(d)} 天`, overdue: true };
    if (d === 0) return { text: '今天到期', overdue: false };
    return { text: `剩 ${d} 天`, overdue: false };
  }
  return { text: TASK_STATUS[t.status]?.label ?? t.status, overdue: false };
}
