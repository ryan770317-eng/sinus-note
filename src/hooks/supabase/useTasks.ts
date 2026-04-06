import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, taskToRow, rowToTask, subscribeTable } from '../../lib/supabase';
import type { TaskRow } from '../../lib/supabase';
import type { Task } from '../../types';
import { daysUntil } from '../../utils/date';
import { TASK_TYPES } from '../../utils/constants';

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const suppressRef = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    const { data } = await sb.from('tasks').select('*').eq('user_id', userId).order('created_at');
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
      await sb.from('tasks').upsert(items.map((t) => taskToRow(t, userId)));
    }
    const newIds = new Set(items.map((t) => t.id));
    const orphans = tasks.filter((t) => !newIds.has(t.id)).map((t) => t.id);
    if (orphans.length > 0) {
      await sb.from('tasks').delete().in('id', orphans).eq('user_id', userId);
    }
    setTasks(items);
  }, [userId, tasks, suppressSync]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('not authenticated');
    const id = `tk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };
    suppressSync();
    await sb.from('tasks').insert(taskToRow(newTask, userId));
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  }, [userId, suppressSync]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!userId) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updated: Task = { ...task, ...updates, updatedAt: new Date().toISOString() };
    suppressSync();
    await sb.from('tasks').update(taskToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, [userId, tasks, suppressSync]);

  const deleteTask = useCallback(async (id: string) => {
    if (!userId) return;
    suppressSync();
    await sb.from('tasks').delete().eq('id', id).eq('user_id', userId);
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
    addTask,
    updateTask,
    deleteTask,
    saveTasks,
    suppressSync,
  };
}
