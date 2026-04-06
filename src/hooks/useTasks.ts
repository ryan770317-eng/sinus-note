import { useCallback } from 'react';
import { useFirestoreDoc } from './useFirestore';
import type { Task } from '../types';
import { daysUntil } from '../utils/date';
import { TASK_TYPES } from '../utils/constants';
import { parseTasks } from '../schemas';

interface TasksDoc {
  items: Task[];
  updatedAt: unknown;
}

export function useTasks(userId: string | null) {
  const { data, loading, save, suppressSync } = useFirestoreDoc<TasksDoc>(userId, 'tasks');

  const tasks: Task[] = parseTasks(data?.items);

  const saveTasks = useCallback(
    async (items: Task[]) => {
      await save({ items });
    },
    [save],
  );

  const addTask = useCallback(
    async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `tk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };
      await saveTasks([...tasks, newTask]);
      return newTask;
    },
    [tasks, saveTasks],
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      await saveTasks(
        tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
        ),
      );
    },
    [tasks, saveTasks],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await saveTasks(tasks.filter((t) => t.id !== id));
    },
    [tasks, saveTasks],
  );

  // Tasks due within 3 days (not done)
  const alertTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const tt = TASK_TYPES[t.taskType];
    if (tt.defaultDays === 0) return true; // instant tasks always show if not done
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
