/**
 * Format timestamp to relative date string
 * 今天 14:30 / 昨天 09:15 / 3/25 16:00 / 2025/12/1 16:00
 */
export function formatNoteDate(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const now = new Date();

  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDay.getTime() === today.getTime()) return { date: '今天', time };
  if (dDay.getTime() === yesterday.getTime()) return { date: '昨天', time };
  if (d.getFullYear() === now.getFullYear()) {
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, time };
  }
  return { date: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`, time };
}

/**
 * Calculate days remaining until dueDate (negative = overdue)
 */
export function daysUntil(isoDate: string): number {
  const due = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / 86400000);
}

/**
 * Calculate progress percentage between startDate and dueDate
 */
export function calcProgress(startDate: string, dueDate: string | null): number {
  if (!dueDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(dueDate).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/**
 * Format ISO date for display: "3/29"
 */
export function fmtDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Today as ISO date string "YYYY-MM-DD"
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Add days to ISO date
 */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
