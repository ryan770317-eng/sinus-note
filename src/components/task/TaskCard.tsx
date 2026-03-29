import { useState } from 'react';
import type { Task, Recipe } from '../../types';
import { TASK_TYPES, TASK_STATUS } from '../../utils/constants';
import { calcProgress, daysUntil, fmtDate } from '../../utils/date';
import { ProgressBar } from '../shared/ProgressBar';
import { ConfirmDialog } from '../shared/ConfirmDialog';

interface Props {
  task: Task;
  recipes: Recipe[];
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onDelete: (id: string) => void;
  onRecipeClick: (recipeId: number) => void;
}

export function TaskCard({ task, recipes, onEdit, onComplete, onDelete, onRecipeClick }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tt = TASK_TYPES[task.taskType];
  const isInstant = tt.defaultDays === 0;
  const isDone = task.status === 'done';
  const recipe = task.recipeId ? recipes.find((r) => r.id === task.recipeId) : null;
  const progress = !isInstant && task.dueDate ? calcProgress(task.startDate, task.dueDate) : 0;

  let countdown = '';
  if (!isInstant && task.dueDate && !isDone) {
    const days = daysUntil(task.dueDate);
    countdown = days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? '今天到期' : `剩 ${days} 天`;
  }

  return (
    <>
      <div
        className={`bg-card border border-border p-4 transition-opacity ${isDone ? 'opacity-50' : ''}`}
      >
        {/* Type label */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-ink-2 tracking-label">{tt.icon} {tt.label}</span>
          <span className="text-xs text-ink-3 tracking-label">{TASK_STATUS[task.status].label}</span>
        </div>

        {/* Title */}
        <p className={`font-serif text-[15px] text-ink mb-1 ${isDone ? 'line-through' : ''}`}>
          {task.title}
        </p>

        {/* Material */}
        {task.material && (
          <p className="text-xs text-ink-2 font-light mb-1">{task.material}</p>
        )}

        {/* Notes */}
        {task.notes && (
          <p className="text-xs text-ink-2 font-light mb-2">{task.notes}</p>
        )}

        {/* Related recipe */}
        {recipe && (
          <button
            onClick={() => onRecipeClick(recipe.id)}
            className="text-xs text-accent underline font-light mb-2 block"
          >
            {recipe.name}
          </button>
        )}

        {/* Timeline */}
        {!isInstant && task.dueDate && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-ink-3 font-light">
              {fmtDate(task.startDate)} → {fmtDate(task.dueDate)}
              <span className="ml-1 text-ink-4">
                ({Math.round((new Date(task.dueDate).getTime() - new Date(task.startDate).getTime()) / 86400000)}天)
              </span>
            </p>
            {countdown && (
              <span className={`text-xs font-light ${countdown.startsWith('逾期') ? 'text-error' : 'text-accent'}`}>
                {countdown}
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
        {!isInstant && task.dueDate && !isDone && (
          <div className="mb-3">
            <ProgressBar value={progress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-1">
          {!isDone && (
            <button
              onClick={() => onComplete(task)}
              className="btn text-xs"
            >
              完成
            </button>
          )}
          <button onClick={() => onEdit(task)} className="btn text-xs">編輯</button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn text-xs text-error border-error"
          >
            刪除
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`確定要刪除「${task.title}」？`}
          onConfirm={() => { onDelete(task.id); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
