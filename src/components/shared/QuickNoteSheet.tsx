import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { useToast } from './useToast';
import { VoiceInput } from '../notes/VoiceInput';

interface Props {
  onSave: (text: string) => Promise<void>;
  onClose: () => void;
}

/** 全域快速記錄 bottom-sheet：任何分頁一鍵記下文字/語音。 */
export function QuickNoteSheet({ onSave, onClose }: Props) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSave() {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onSave(t);
      toast.success('已記錄');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      ariaLabel="快速記錄"
      className="fixed inset-0 z-[70] flex items-end"
      contentClassName="relative bg-bg border-t border-border w-full p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">快速記錄</p>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-3 hover:text-ink px-2 -mr-2 text-lg"
          aria-label="關閉"
        >
          ×
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="記下這一刻..."
        autoFocus
        className="input-field h-24 resize-none w-full"
      />

      <div className="flex items-center justify-between gap-3 mt-3">
        <VoiceInput
          onResult={(t) => {
            setText((prev) => (prev ? `${prev} ${t}` : t));
            textareaRef.current?.focus();
          }}
        />
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="btn text-xs">取消</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting || !text.trim()}
            className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '記錄中…' : '記錄'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
