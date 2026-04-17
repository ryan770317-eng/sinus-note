import { useState, useEffect } from 'react';
import type { Task, TaskType, TaskStatus, Recipe } from '../../types';
import { TASK_TYPES, TASK_STATUS } from '../../utils/constants';
import { todayISO, addDays } from '../../utils/date';
import { useToast } from '../shared/Toast';

interface Props {
  initial?: Task;
  recipes: Recipe[];
  materialNames: string[];
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ initial, recipes, materialNames, onSave, onCancel }: Props) {
  const toast = useToast();
  const [quick, setQuick] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [material, setMaterial] = useState(initial?.material ?? '');
  const [taskType, setTaskType] = useState<TaskType>(initial?.taskType ?? 'other');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'waiting');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [dueDate, setDueDate] = useState<string>(initial?.dueDate ?? '');
  const [recipeId, setRecipeId] = useState<number | null>(initial?.recipeId ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [matSuggestions, setMatSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);

  // Auto-compute dueDate when taskType or startDate changes
  useEffect(() => {
    if (initial?.dueDate) return;
    const days = TASK_TYPES[taskType].defaultDays;
    if (days > 0) {
      setDueDate(addDays(startDate, days));
    } else {
      setDueDate('');
    }
  }, [taskType, startDate, initial?.dueDate]);

  function handleMaterialInput(val: string) {
    setMaterial(val);
    if (val.length < 1) {
      setMatSuggestions([]);
      return;
    }
    setMatSuggestions(materialNames.filter((n) => n.includes(val)).slice(0, 5));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      setTitleError(true);
      toast.error('請填寫標題');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        material: material.trim(),
        taskType,
        status,
        startDate,
        dueDate: dueDate || null,
        recipeId,
        notes: notes.trim(),
        completedDate: initial?.completedDate ?? null,
        checkpoints: initial?.checkpoints ?? [],
      });
      toast.success(initial ? '工序已更新' : '工序已新增');
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="section-label">{initial ? '編輯工序' : '新增工序'}</p>
        <label className="flex items-center gap-2 text-xs text-ink-2 font-light cursor-pointer">
          <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="accent-accent" />
          快速模式
        </label>
      </div>

      <div>
        <label htmlFor="task-title" className="section-label block mb-1">標題 *</label>
        <input
          id="task-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (titleError && e.target.value.trim()) setTitleError(false); }}
          required
          aria-required="true"
          aria-invalid={titleError}
          className={`input-field ${titleError ? 'border-error' : ''}`}
        />
        {titleError && <p className="text-xs text-error font-light mt-1">請填寫標題</p>}
      </div>

      <div>
        <label className="section-label block mb-1">工序類型</label>
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as TaskType)}
          className="input-field"
        >
          {(Object.keys(TASK_TYPES) as TaskType[]).map((k) => (
            <option key={k} value={k}>{TASK_TYPES[k].label}</option>
          ))}
        </select>
      </div>

      {!quick && (
        <>
          <div className="relative">
            <label className="section-label block mb-1">關聯材料</label>
            <input
              value={material}
              onChange={(e) => handleMaterialInput(e.target.value)}
              className="input-field"
              placeholder="可選"
              autoComplete="off"
            />
            {matSuggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 bg-bg border border-border">
                {matSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setMaterial(s); setMatSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-sm font-light hover:bg-card"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="section-label block mb-1">狀態</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input-field">
              {(Object.keys(TASK_STATUS) as TaskStatus[]).map((k) => (
                <option key={k} value={k}>{TASK_STATUS[k].label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">開始日期</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">預計完成</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="section-label block mb-1">關聯配方</label>
            <select
              value={recipeId ?? ''}
              onChange={(e) => setRecipeId(e.target.value ? Number(e.target.value) : null)}
              className="input-field"
            >
              <option value="">— 不關聯 —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="section-label block mb-1">備注</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field h-16 resize-none" />
          </div>
        </>
      )}

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} disabled={submitting} className="btn text-xs disabled:opacity-50">取消</button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '儲存中…' : '儲存'}
        </button>
      </div>
    </form>
  );
}
