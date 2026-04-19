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
import { ActionMenu } from '../shared/ActionMenu';

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
  const [expanded, setExpanded] = useState(false);
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

  // 展開時才顯示的詳細區塊判斷
  const hasExpandable =
    task.notes || (recipe) || (!isInstant && task.dueDate);

  const handleCheckbox = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onComplete(task);
  };

  const toggleExpand = () => {
    if (hasExpandable) setExpanded((v) => !v);
  };

  return (
    <>
      <div
        className={`border border-border flex transition-all ${isDone ? 'opacity-40' : ''}`}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isDone ? '#D6CFC4' : phaseColor,
          background: isDone ? 'transparent' : TASK_STATUS_BG[task.status],
        }}
      >
        {/* === 左側勾選欄 === */}
        <button
          type="button"
          onClick={handleCheckbox}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleCheckbox(e); } }}
          aria-label={isDone ? `取消完成「${task.title}」` : `標記「${task.title}」為完成`}
          aria-pressed={isDone}
          className="flex items-center justify-center self-stretch px-4 hover:bg-ink/5 transition-colors border-r border-border"
          style={{ minWidth: 52 }}
        >
          {isDone ? (
            <span
              className="w-5 h-5 flex items-center justify-center"
              style={{ background: '#1A1A18' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 6 L5 9 L10 3" stroke="#F5F1EB" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : (
            <span
              className="w-5 h-5 border-2 transition-colors"
              style={{ borderColor: phaseColor }}
            />
          )}
        </button>

        {/* === 右側內容區 === */}
        <div
          className={`flex-1 min-w-0 px-4 py-3 relative ${hasExpandable ? 'cursor-pointer' : ''}`}
          onClick={toggleExpand}
          onKeyDown={(e) => { if (hasExpandable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleExpand(); } }}
          role={hasExpandable ? 'button' : undefined}
          tabIndex={hasExpandable ? 0 : undefined}
          aria-expanded={hasExpandable ? expanded : undefined}
        >
          {/* Type + status + menu */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="type-micro tracking-label" style={{ color: isDone ? '#D6CFC4' : phaseColor }}>
              {tt.icon} {tt.label}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="type-micro px-1.5 py-0.5"
                style={{
                  background: isDone ? 'transparent' : `${phaseColor}18`,
                  color: isDone ? '#D6CFC4' : phaseColor,
                }}
              >
                {TASK_STATUS[task.status].label}
              </span>
              {hasExpandable && (
                <span
                  aria-hidden="true"
                  className="text-ink-3 transition-transform inline-flex items-center"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5 L7 9 L11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              <div className="relative">
                <ActionMenu
                  triggerLabel={`「${task.title}」更多動作`}
                  title={task.title}
                  subtitle="工序操作"
                  items={[
                    { label: '編輯', icon: '✎', onClick: () => onEdit(task) },
                    { label: '刪除', icon: '✕', danger: true, onClick: () => setConfirmDelete(true) },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <p className={`font-serif text-[15px] text-ink ${isDone ? 'line-through text-ink-3' : ''}`}>
            {task.title}
          </p>

          {/* 短摘要（永遠顯示） */}
          {task.material && (
            <p className="type-meta mt-1">{task.material}</p>
          )}

          {/* 收合狀態：單行時間摘要 */}
          {!expanded && !isInstant && task.dueDate && (
            <p className="type-micro mt-1.5">
              {fmtDate(task.startDate)} → {fmtDate(task.dueDate)}
              {countdown && (
                <span className="ml-2" style={{ color: countdownColor }}>· {countdown}</span>
              )}
            </p>
          )}

          {/* === 展開內容 === */}
          {expanded && (
            <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
              {/* Timeline + progress */}
              {!isInstant && task.dueDate && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="type-micro">
                      {fmtDate(task.startDate)} → {fmtDate(task.dueDate)}
                      <span className="ml-1 text-ink-4">
                        ({Math.round((new Date(task.dueDate).getTime() - new Date(task.startDate).getTime()) / 86400000)} 天)
                      </span>
                    </p>
                    {countdown && (
                      <span className="type-micro" style={{ color: countdownColor }}>{countdown}</span>
                    )}
                  </div>
                  {!isDone && <ProgressBar value={progress} />}
                </div>
              )}

              {/* Notes */}
              {task.notes && (
                <div className="pt-3 border-t border-border">
                  <p className="type-micro tracking-label mb-1">備註</p>
                  <p className="type-meta whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}

              {/* Related recipe */}
              {recipe && (
                <div className="pt-3 border-t border-border">
                  <p className="type-micro tracking-label mb-1">關聯配方</p>
                  <button
                    onClick={() => onRecipeClick(recipe.id)}
                    className="type-body underline"
                    style={{ color: '#8B6F52' }}
                  >
                    {recipe.name}
                  </button>
                </div>
              )}
            </div>
          )}
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
