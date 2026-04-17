import { useId } from 'react';
import { Modal } from './Modal';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual emphasis for confirm button — 'default' | 'danger'. */
  tone?: 'default' | 'danger';
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = '確認',
  cancelLabel = '取消',
  tone = 'default',
}: Props) {
  const msgId = useId();
  const confirmClass = tone === 'danger'
    ? 'px-4 py-2 border border-error bg-error text-bg font-light text-sm tracking-label hover:opacity-90 transition-opacity cursor-pointer'
    : 'btn-primary text-xs';

  return (
    <Modal onClose={onCancel} describedBy={msgId} ariaLabel="確認對話框">
      <p id={msgId} className="text-sm font-light text-ink mb-6 whitespace-pre-line">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn text-xs" aria-label={cancelLabel}>
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={confirmClass}
          aria-label={confirmLabel}
          autoFocus={tone !== 'danger'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
