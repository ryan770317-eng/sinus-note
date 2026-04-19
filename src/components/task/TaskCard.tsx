import { useState } from 'react';
import type { Task, Recipe } from '../../types';
import {
  TASK_TYPES,
  TASK_STATUS,
  PHASE_COLORS,
  TASK_STATUS_BG,
} from '../../utils/constants';
import { calcProgress, daysUntil, fmtDate } from '../../utils/date';
import { ProgressBar } from '../shared/ProgressBar';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useToast } from '../shared/Toast';

interface Props {
  task: Task;
  recipes: Recipe[];
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onDelete: (id: string) => void;
  onRestore?: (task: Task) => Promise<void>;
  onRecipeClick: (recipeId: number) => void;
}

export function TaskCard({ task, recipes, onEdit, onComplete, onDelete, onRestore, onRecipeClick }: Props) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tt = TASK_TYPES[task.taskType] ?? TASK_TYPES['other'];
  const isInstant = tt.defaultDays === 0;
  const isDone = task.status === 'done';
  const recipe = task.recipeId ? recipes.find((r) => r.id === task.recipeId) : null;
  const progress = !isInstant && task.dueDate ? calcProgress(task.startDate, task.dueDate) : 0;
  const phaseColor = PHASE_COLORS[tt.phase];

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
          background: isDone ? 'transparent' : TASK_STATUS_BG[task.status],
        }}
      >
        {/* Type + status */}
        <div className="flex items-center justify-between mb-1">
          <span className="type-micro tracking-label" style={{ color: phaseColor }}>
            {tt.icon} {tt.label}
          </span>
          <span
            className="type-micro px-1.5 py-0.5"
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
          <p className="type-meta mb-1">{task.material}</p>
        )}
        {task.notes && (
          <p className="type-meta mb-2">{task.notes}</p>
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
            <p className="type-micro">
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
            <button
              onClick={() => onComplete(task)}
              className="btn text-xs"
              aria-label={`將工序「${task.title}」標記為完成`}
            >
              完成
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="btn text-xs"
            aria-label={`編輯工序「${task.title}」`}
          >
            編輯
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn text-xs text-error border-error"
            aria-label={`刪除工序「${task.title}」`}
          >
            刪除
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`確定要刪除「${task.title}」？`}
          confirmLabel="刪除"
          tone="danger"
          onConfirm={async () => {
            setConfirmDelete(false);
            try {
              await onDelete(task.id);
              if (onRestore) {
                toast.success('工序已刪除', {
                  action: {
                    label: '復原',
                    onClick: async () => {
                      try {
                        await onRestore(task);
                        toast.info('工序已復原');
                      } catch (err) {
                        toast.error(`復原失敗：${err instanceof Error ? err.message : String(err)}`);
                      }
                    },
                  },
                });
              } else {
                toast.success('工序已刪除');
              }
            } catch (err) {
              toast.error(`刪除失敗：${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
