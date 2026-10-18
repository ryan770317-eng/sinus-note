import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pickNextTask, taskUrgency } from '../nextTask';
import type { Task } from '../../types';

function task(over: Partial<Task>): Task {
  return {
    id: 't', title: 't', material: '', recipeId: null, taskType: 'dry', status: 'waiting',
    startDate: '2026-10-01', dueDate: null, completedDate: null, notes: '', checkpoints: [],
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '', ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('pickNextTask', () => {
  it('空清單或全部完成 → null', () => {
    expect(pickNextTask([])).toBeNull();
    expect(pickNextTask([task({ status: 'done', dueDate: '2026-10-01' })])).toBeNull();
  });

  it('(a) 逾期優先，取逾期最多天', () => {
    const r = pickNextTask([
      task({ id: 'today', dueDate: '2026-10-17' }),
      task({ id: 'late2', dueDate: '2026-10-15' }),
      task({ id: 'late9', dueDate: '2026-10-08' }),
    ]);
    expect(r?.id).toBe('late9');
  });

  it('(b) 沒有逾期時取今天到期', () => {
    const r = pickNextTask([
      task({ id: 'soon', dueDate: '2026-10-18' }),
      task({ id: 'today', dueDate: '2026-10-17' }),
      task({ id: 'instant', taskType: 'weigh', status: 'ready' }),
    ]);
    expect(r?.id).toBe('today');
  });

  it('(c) 即時工序（待處理／處理中）取 createdAt 最早', () => {
    const r = pickNextTask([
      task({ id: 'soon', dueDate: '2026-10-20' }),
      task({ id: 'w2', taskType: 'weigh', status: 'ready', createdAt: '2026-10-05T00:00:00.000Z' }),
      task({ id: 'w1', taskType: 'burn', status: 'processing', createdAt: '2026-10-02T00:00:00.000Z' }),
      task({ id: 'wait', taskType: 'grind', status: 'waiting', createdAt: '2026-09-01T00:00:00.000Z' }),
    ]);
    expect(r?.id).toBe('w1');
  });

  it('(d) 其餘取 dueDate 最近', () => {
    const r = pickNextTask([
      task({ id: 'far', dueDate: '2026-11-30' }),
      task({ id: 'near', dueDate: '2026-10-20' }),
      task({ id: 'nodate' }),
    ]);
    expect(r?.id).toBe('near');
  });

  it('只剩沒有 dueDate 的非即時工序 → null', () => {
    expect(pickNextTask([task({ id: 'nodate' })])).toBeNull();
  });
});

describe('taskUrgency', () => {
  it('逾期／今天／剩 N 天', () => {
    expect(taskUrgency(task({ dueDate: '2026-10-14' }))).toEqual({ text: '逾期 3 天', overdue: true });
    expect(taskUrgency(task({ dueDate: '2026-10-17' }))).toEqual({ text: '今天到期', overdue: false });
    expect(taskUrgency(task({ dueDate: '2026-10-20' }))).toEqual({ text: '剩 3 天', overdue: false });
  });
  it('即時工序回狀態名', () => {
    expect(taskUrgency(task({ taskType: 'weigh', status: 'ready' })).text).toBe('待處理');
  });
});
