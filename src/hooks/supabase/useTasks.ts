import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, taskToRow, rowToTask, subscribeTable } from '../../lib/supabase';
import type { TaskRow } from '../../lib/supabase';
import type { Task } from '../../types';
import { daysUntil } from '../../utils/date';
import { TASK_TYPES } from '../../utils/constants';
import { uid } from '../../utils/id';

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('tasks').select('*').eq('user_id', userId).order('created_at');
    if (err) { setError(`讀取工序失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    const rows = (data ?? []) as TaskRow[];
    setTasks(rows.map(rowToTask).filter((t): t is Task => t !== null));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setTasks([]); setLoading(false); return; }
    fetchTasks().then(() => setLoading(false));
    const unsub = subscribeTable('tasks', userId, fetchTasks);
    return unsub;
  }, [userId, fetchTasks]);

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  const saveTasks = useCallback(async (items: Task[]) => {
    if (!userId) return;
    suppressSync();
    if (items.length > 0) {
      const { error: err } = await sb.from('tasks').upsert(items.map((t) => taskToRow(t, userId)));
      if (err) { setError(`批次儲存工序失敗: ${err.message}`); return; }
    }
    // Read latest state via functional updater to avoid stale closure
    let orphans: string[] = [];
    setTasks((prev) => {
      const newIds = new Set(items.map((t) => t.id));
      orphans = prev.filter((t) => !newIds.has(t.id)).map((t) => t.id);
      return items;
    });
    if (orphans.length > 0) {
      const { error: err } = await sb.from('tasks').delete().in('id', orphans).eq('user_id', userId);
      if (err) { setError(`刪除舊工序失敗: ${err.message}`); }
    }
  }, [userId, suppressSync]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('not authenticated');
    const id = uid('tk');
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };
    suppressSync();
    const { error: err } = await sb.from('tasks').insert(taskToRow(newTask, userId));
    if (err) { setError(`新增工序失敗: ${err.message}`); throw err; }
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  }, [userId, suppressSync]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!userId) return;
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const updated: Task = { ...task, ...updates, updatedAt: new Date().toISOString() };
      sb.from('tasks').update(taskToRow(updated, userId)).eq('id', id).eq('user_id', userId)
        .then(({ error: err }) => { if (err) setError(`更新工序失敗: ${err.message}`); });
      return prev.map((t) => (t.id === id ? updated : t));
    });
    suppressSync();
  }, [userId, suppressSync]);

  const deleteTask = useCallback(async (id: string) => {
    if (!userId) return;
    suppressSync();
    const { error: err } = await sb.from('tasks').delete().eq('id', id).eq('user_id', userId);
    if (err) { setError(`刪除工序失敗: ${err.message}`); return; }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [userId, suppressSync]);

  const alertTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const tt = TASK_TYPES[t.taskType];
    if (tt.defaultDays === 0) return true;
    if (!t.dueDate) return false;
    return daysUntil(t.dueDate) <= 3;
  });

  return {
    tasks,
    alertTasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    saveTasks,
    suppressSync,
  };
}
