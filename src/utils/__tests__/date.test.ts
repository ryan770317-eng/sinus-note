import { describe, it, expect, vi, afterEach } from 'vitest';
import { todayISO, addDays, daysUntil, calcProgress, formatNoteDate } from '../date';

afterEach(() => vi.useRealTimers());

describe('todayISO', () => {
  it('回傳本地日期，不受 UTC 影響（台灣清晨案例）', () => {
    // 模擬本地 2026-07-03 01:30（若用 toISOString 且時區為 UTC+8 會得到 07-02）
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 1, 30, 0));
    expect(todayISO()).toBe('2026-07-03');
  });

  it('補零', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(todayISO()).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('date-only 輸入加天數', () => {
    expect(addDays('2026-03-29', 5)).toBe('2026-04-03');
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
  });
});

describe('daysUntil', () => {
  it('今天為 0、明天為 1、昨天為 -1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 15, 0, 0));
    expect(daysUntil('2026-07-03')).toBe(0);
    expect(daysUntil('2026-07-04')).toBe(1);
    expect(daysUntil('2026-07-02')).toBe(-1);
  });
});

describe('calcProgress', () => {
  it('空 startDate（舊資料）回 0 而非 NaN', () => {
    expect(calcProgress('', '2026-07-10')).toBe(0);
    expect(Number.isNaN(calcProgress('', '2026-07-10'))).toBe(false);
  });

  it('已過期回 100、未開始回 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3));
    expect(calcProgress('2026-06-01', '2026-06-10')).toBe(100);
    expect(calcProgress('2026-07-10', '2026-07-20')).toBe(0);
  });

  it('end <= start 回 100', () => {
    expect(calcProgress('2026-07-10', '2026-07-10')).toBe(100);
  });
});

describe('formatNoteDate', () => {
  it('今天/昨天/同年/跨年', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 10, 0, 0));
    expect(formatNoteDate(new Date(2026, 6, 3, 14, 30).getTime()).date).toBe('今天');
    expect(formatNoteDate(new Date(2026, 6, 2, 9, 15).getTime()).date).toBe('昨天');
    expect(formatNoteDate(new Date(2026, 2, 25).getTime()).date).toBe('3/25');
    expect(formatNoteDate(new Date(2025, 11, 1).getTime()).date).toBe('2025/12/1');
  });
});
