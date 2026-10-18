import { useId, type ReactNode } from 'react';

interface Props {
  /** 左側主標（16px ink） */
  label: ReactNode;
  /** 中間摘要（13px ink-2，靠右、單行截斷） */
  summary?: string;
  /** 跟在 label 後面的計數（13px ink-2 tabular-nums） */
  count?: number;
  /** 是否展開 */
  open: boolean;
  /** 點整列切換展開 */
  onToggle: () => void;
  /** 放在 label 前的圖示（例：製作模式「已稱」的黑底白勾） */
  icon?: ReactNode;
  /** 放在摘要與 ＋／－ 之間的小標籤（例：「AI」） */
  trailing?: ReactNode;
  /** 展開時渲染在列下方的內容 */
  children: ReactNode;
  /** error：label 與 summary 改用 error 色（規則警告） */
  tone?: 'default' | 'error';
}

/**
 * 抽屜列（v2 畫板核心樣式）：高 56、上方 1px 細線。
 * 相鄰多列共用一條線 — 每列只畫 border-t，外層容器自己補 border-b。
 */
export function DrawerRow({ label, summary, count, open, onToggle, icon, trailing, children, tone = 'default' }: Props) {
  const panelId = useId();
  const toneClass = tone === 'error' ? 'text-error' : '';
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full h-14 flex items-center gap-3 text-left"
      >
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        <span className={`shrink-0 text-base ${toneClass || 'text-ink'}`}>
          {label}
          {count != null && <span className="ml-1.5 text-[13px] text-ink-2 tabular-nums">{count}</span>}
        </span>
        <span className={`flex-1 min-w-0 truncate text-right text-[13px] ${toneClass || 'text-ink-2'}`}>
          {summary}
        </span>
        {trailing && <span className="shrink-0">{trailing}</span>}
        <span className="shrink-0 w-11 h-11 -mr-3 flex items-center justify-center text-ink" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7 H13" stroke="currentColor" strokeWidth="1.25" />
            {!open && <path d="M7 1 V13" stroke="currentColor" strokeWidth="1.25" />}
          </svg>
        </span>
      </button>
      {open && (
        <div id={panelId} className="pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
