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
    ? 'h-12 px-6 bg-error text-white text-base font-medium tracking-[0.08em] inline-flex items-center justify-center hover:bg-[#8a4a3c] transition-colors cursor-pointer'
    : 'btn-primary';

  return (
    <Modal onClose={onCancel} describedBy={msgId} ariaLabel="確認對話框">
      <p id={msgId} className="type-body mb-6 whitespace-pre-line">{message}</p>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn" aria-label={cancelLabel}>
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
