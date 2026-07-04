import { describe, it, expect } from 'vitest';
import { shouldRemindBackup } from '../backup';

const NOW = Date.parse('2026-07-04T00:00:00.000Z');
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString();

describe('shouldRemindBackup', () => {
  it('從未備份 → 提醒，daysSince=null', () => {
    expect(shouldRemindBackup(NOW, null, null)).toEqual({ remind: true, daysSince: null });
  });

  it('29 天 → 不提醒', () => {
    expect(shouldRemindBackup(NOW, iso(29), null)).toEqual({ remind: false, daysSince: 29 });
  });

  it('30 天 → 提醒', () => {
    expect(shouldRemindBackup(NOW, iso(30), null)).toEqual({ remind: true, daysSince: 30 });
  });

  it('snooze 中 → 不提醒（即使從未備份）', () => {
    const snooze = new Date(NOW + 3 * 86400000).toISOString();
    expect(shouldRemindBackup(NOW, null, snooze)).toEqual({ remind: false, daysSince: null });
  });

  it('snooze 過期 → 回復提醒邏輯', () => {
    const snooze = new Date(NOW - 1 * 86400000).toISOString();
    expect(shouldRemindBackup(NOW, iso(40), snooze)).toEqual({ remind: true, daysSince: 40 });
  });

  it('無效日期字串 → 視同從未備份（提醒）', () => {
    expect(shouldRemindBackup(NOW, 'not-a-date', null)).toEqual({ remind: true, daysSince: null });
  });
});
