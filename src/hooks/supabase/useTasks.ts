import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, taskToRow, rowToTask, subscribeTable } from '../../lib/supabase';
import type { TaskRow } from '../../lib/supabase';
import type { Task } from '../../types';
import { daysUntil } from '../../utils/date';
import { TASK_TYPES } from '../../utils/constants';
import { uid } from '../../utils/id';

/** 提醒條件（Dashboard / TaskAlert / App 共用單一實作） */
export function isAlertTask(t: Task): boolean {
  if (t.status === 'done') return false;
  const tt = TASK_TYPES[t.taskType] ?? TASK_TYPES['other'];
  if (tt.defaultDays === 0) return true;
  if (!t.dueDate) return false;
  return daysUntil(t.dueDate) <= 3;
}

/**
 * 錯誤契約（四個 store hook 一致）：
 *  - 讀取失敗 → setError（App 層統一 toast）
 *  - 寫入失敗 → throw（呼叫端 catch + toast），樂觀更新會先回滾
 */
export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  // 最新值 ref：與 setState 同步在「寫入當下」更新（不等 re-render），
  // 連續操作（如批次寫入迴圈）之間讀到的才是最新狀態
  const tasksRef = useRef<Task[]>([]);
  const commitTasks = useCallback((next: Task[]) => {
    tasksRef.current = next;
    setTasks(next);
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('tasks').select('*').eq('user_id', userId).order('created_at');
    if (err) { setError(`讀取工序失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    const rows = (data ?? []) as TaskRow[];
    commitTasks(rows.map(rowToTask).filter((t): t is Task => t !== null));
  }, [userId, commitTasks]);

  useEffect(() => {
    if (!userId) { commitTasks([]); setLoading(false); return; }
    fetchTasks().then(() => setLoading(false));
    const unsub = subscribeTable('tasks', userId, fetchTasks);
    return unsub;
  }, [userId, fetchTasks, commitTasks]);

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  /** 批次覆蓋（匯入用）：upsert 新清單，刪除不在清單內的舊 row */
  const saveTasks = useCallback(async (items: Task[]) => {
    if (!userId) return;
    suppressSync();
    if (items.length > 0) {
      const { error: err } = await sb.from('tasks').upsert(items.map((t) => taskToRow(t, userId)));
      if (err) throw new Error(`批次儲存工序失敗: ${err.message}`);
    }
    const newIds = new Set(items.map((t) => t.id));
    const orphans = tasksRef.current.filter((t) => !newIds.has(t.id)).map((t) => t.id);
    commitTasks(items);
    if (orphans.length > 0) {
      const { error: err } = await sb.from('tasks').delete().in('id', orphans).eq('user_id', userId);
      if (err) throw new Error(`刪除舊工序失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('尚未登入');
    const id = uid('tk');
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };
    suppressSync();
    const { error: err } = await sb.from('tasks').insert(taskToRow(newTask, userId));
    if (err) throw new Error(`新增工序失敗: ${err.message}`);
    commitTasks([...tasksRef.current, newTask]);
    return newTask;
  }, [userId, suppressSync, commitTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!userId) throw new Error('尚未登入');
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const updated: Task = { ...current, ...updates, updatedAt: new Date().toISOString() };
    suppressSync();
    commitTasks(tasksRef.current.map((t) => (t.id === id ? updated : t)));
    const { error: err } = await sb.from('tasks').update(taskToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    if (err) {
      commitTasks(tasksRef.current.map((t) => (t.id === id ? current : t)));
      throw new Error(`更新工序失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitTasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('tasks').delete().eq('id', id).eq('user_id', userId);
    if (err) throw new Error(`刪除工序失敗: ${err.message}`);
    commitTasks(tasksRef.current.filter((t) => t.id !== id));
  }, [userId, suppressSync, commitTasks]);

  /** 重新插入剛刪除的工序（Undo 用） */
  const restoreTask = useCallback(async (task: Task) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('tasks').insert(taskToRow(task, userId));
    if (err) throw new Error(`還原工序失敗: ${err.message}`);
    commitTasks([...tasksRef.current.filter((t) => t.id !== task.id), task]);
  }, [userId, suppressSync, commitTasks]);

  const alertTasks = tasks.filter(isAlertTask);

  return {
    tasks,
    alertTasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    saveTasks,
    suppressSync,
  };
}
