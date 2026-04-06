import { useState } from 'react';
import type { Task, Recipe } from '../../types';
import { TASK_TYPES, TASK_STATUS } from '../../utils/constants';
import { calcProgress, daysUntil, fmtDate } from '../../utils/date';
import { ProgressBar } from '../shared/ProgressBar';
import { ConfirmDialog } from '../shared/ConfirmDialog';

const PHASE_COLOR: Record<string, string> = {
  pre:   '#6B6459',
  make:  '#8B6F52',
  post:  '#7a8c6e',
  other: '#6B6459',
};

const STATUS_BG: Record<string, string> = {
  prep:       'rgba(107,100,89,0.08)',
  processing: 'rgba(139,111,82,0.10)',
  waiting:    'transparent',
  ready:      'rgba(122,140,110,0.10)',
  done:       'transparent',
};

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
  const tt = TASK_TYPES[task.taskType] ?? TASK_TYPES['other'];
  const isInstant = tt.defaultDays === 0;
  const isDone = task.status === 'done';
  const recipe = task.recipeId ? recipes.find((r) => r.id === task.recipeId) : null;
  const progress = !isInstant && task.dueDate ? calcProgress(task.startDate, task.dueDate) : 0;
  const phaseColor = PHASE_COLOR[tt.phase];

  let countdown = '';
  let countdownColor = '#6B6459';
  if (!isInstant && task.dueDate && !isDone) {
    const days = daysUntil(task.dueDate);
    if (days < 0) { countdown = `逾期 ${Math.abs(days)} 天`; countdownColor = '#a06050'; }
    else if (days === 0) { countdown = '今天到期'; countdownColor = '#a06050'; }
    else { countdown = `剩 ${days} 天`; countdownColor = '#8B6F52'; }
  }

  return (
    <>
      <div
        className={`border border-border px-4 py-3 transition-opacity ${isDone ? 'opacity-40' : ''}`}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isDone ? '#D6CFC4' : phaseColor,
          background: isDone ? 'transparent' : STATUS_BG[task.status],
        }}
      >
        {/* Type + status */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-label" style={{ color: phaseColor }}>
            {tt.icon} {tt.label}
          </span>
          <span
            className="text-[10px] font-light px-1.5 py-0.5"
            style={{
              background: isDone ? 'transparent' : `${phaseColor}18`,
              color: isDone ? '#D6CFC4' : phaseColor,
            }}
          >
            {TASK_STATUS[task.status].label}
          </span>
        </div>

        {/* Title */}
        <p className={`font-serif text-[15px] text-ink mb-1 ${isDone ? 'line-through text-ink-3' : ''}`}>
          {task.title}
        </p>

        {task.material && (
          <p className="text-xs text-ink-2 font-light mb-1">{task.material}</p>
        )}
        {task.notes && (
          <p className="text-xs text-ink-2 font-light mb-2">{task.notes}</p>
        )}

        {recipe && (
          <button
            onClick={() => onRecipeClick(recipe.id)}
            className="text-xs font-light mb-2 block"
            style={{ color: '#8B6F52', textDecoration: 'underline' }}
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
              <span className="text-xs font-light" style={{ color: countdownColor }}>{countdown}</span>
            )}
          </div>
        )}

        {!isInstant && task.dueDate && !isDone && (
          <div className="mb-3">
            <ProgressBar value={progress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          {!isDone && (
            <button onClick={() => onComplete(task)} className="btn text-xs">完成</button>
          )}
          <button onClick={() => onEdit(task)} className="btn text-xs">編輯</button>
          <button onClick={() => setConfirmDelete(true)} className="btn text-xs text-error border-error">刪除</button>
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
