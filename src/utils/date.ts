// Firestore may return Timestamp objects instead of plain numbers
function toMillis(ts: unknown): number {
  if (typeof ts === 'number') return ts;
  if (ts && typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (ts && typeof (ts as { seconds?: number }).seconds === 'number') {
    return (ts as { seconds: number }).seconds * 1000;
  }
  return Date.now();
}

/**
 * Format timestamp to relative date string
 * 今天 14:30 / 昨天 09:15 / 3/25 16:00 / 2025/12/1 16:00
 */
export function formatNoteDate(ts: unknown): { date: string; time: string } {
  const millis = toMillis(ts);
  const d = new Date(millis);
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

/** Days remaining until dueDate (negative = overdue) */
export function daysUntil(isoDate: string): number {
  const due = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / 86400000);
}

/** Progress percentage between startDate and dueDate */
export function calcProgress(startDate: string, dueDate: string | null): number {
  if (!dueDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(dueDate).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

/** Format ISO date: "3/29" */
export function fmtDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Today as "YYYY-MM-DD" */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add N days to ISO date string */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
