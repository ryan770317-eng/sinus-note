import { useId, type ReactNode } from 'react';
import { Modal } from './Modal';

interface Props {
  /** 標題列文字（type-heading） */
  title: string;
  /** 關閉（× / Esc / 點背景） */
  onClose: () => void;
  /** 固定在底部的按鈕列；兩顆按鈕時自動 1:2 分欄（取消＋主要） */
  footer?: ReactNode;
  /** 可捲動的內容 */
  children: ReactNode;
}

/** 由下往上的抽屜。沿用 Modal 的 Esc／焦點鎖／捲動鎖，不改 Modal 本體。 */
export function BottomSheet({ title, onClose, footer, children }: Props) {
  const titleId = useId();
  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      contentClassName="relative bg-bg border-t border-border w-full md:max-w-xl md:border-x flex flex-col max-h-[85vh]"
    >
      <div className="pt-2 flex justify-center shrink-0" aria-hidden="true">
        <span className="block w-9 h-1 bg-border" />
      </div>
      <div className="flex items-center justify-between gap-3 pl-5 pr-2 h-14 shrink-0">
        <h2 id={titleId} className="type-heading">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="w-11 h-11 flex items-center justify-center text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.25" />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] grid grid-cols-[1fr_2fr] gap-2.5">
          {footer}
        </div>
      )}
    </Modal>
  );
}
