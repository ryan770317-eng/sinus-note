export const BACKUP_KEY = 'sinus_last_backup_at';
export const SNOOZE_KEY = 'sinus_backup_snooze_until';

/**
 * 是否該提醒備份。
 * - snooze 未過期 → 不提醒。
 * - 從未備份（null 或無效日期字串）→ 提醒，daysSince=null。
 * - 有效日期 → 距今 >= 30 天才提醒。
 */
export function shouldRemindBackup(
  nowMs: number,
  lastBackupIso: string | null,
  snoozeUntilIso: string | null,
): { remind: boolean; daysSince: number | null } {
  if (snoozeUntilIso && Date.parse(snoozeUntilIso) > nowMs) return { remind: false, daysSince: null };
  // 無效日期字串（Date.parse → NaN）視同從未備份，否則 NaN 比較恆為 false 會漏提醒
  if (!lastBackupIso || Number.isNaN(Date.parse(lastBackupIso))) return { remind: true, daysSince: null };
  const days = Math.floor((nowMs - Date.parse(lastBackupIso)) / 86400000);
  return { remind: days >= 30, daysSince: days };
}
