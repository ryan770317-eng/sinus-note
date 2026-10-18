import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** 結果數（顯示於輸入框下方）。undefined = 不顯示計數 */
  resultCount?: number;
  /** 常駐模式：永遠展開、不渲染收起鈕、高 48、bg-card 無邊框（手機設計稿規格） */
  persistent?: boolean;
  /** 非常駐模式：預設是否展開 */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * 共用搜尋欄位：
 *  - persistent：常駐輸入框（總覽、配方、材料、隨手記）
 *  - 非 persistent：預設收合成 ⌕ 圖示按鈕，點擊展開並 auto focus
 *  - 有內容時顯示清除 ×（44×44）與「N 筆結果」
 *  - 桌機 `/` 快捷鍵聚焦／展開
 */
export function SearchField({
  value,
  onChange,
  placeholder = '搜尋...',
  resultCount,
  persistent = false,
  defaultOpen = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(persistent || defaultOpen || !!value);
  const inputRef = useRef<HTMLInputElement>(null);
  const expanded = persistent || open;

  // `/` 快捷鍵（desktop 獨享；避免輸入中觸發）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
      if (e.key === '/' && !typing) {
        e.preventDefault();
        if (persistent) inputRef.current?.focus();
        else setOpen(true);
      }
      if (e.key === 'Escape' && t === inputRef.current) {
        if (value) {
          onChange('');
        } else if (!persistent) {
          setOpen(false);
          inputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [persistent, value, onChange]);

  // 非常駐：展開時 auto focus（常駐不自動聚焦，避免手機一進頁就跳鍵盤）
  useEffect(() => {
    if (open && !persistent) inputRef.current?.focus();
  }, [open, persistent]);

  if (!expanded) {
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
          aria-label="展開搜尋"
          title="搜尋 ( / )"
        >
          <SearchIcon size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={
          persistent
            ? 'flex items-center h-12 bg-card'
            : 'flex items-stretch border-[1.5px] border-ink-2 focus-within:border-ink bg-card transition-colors'
        }
      >
        <span className={`flex items-center text-ink-2 ${persistent ? 'pl-3.5 pr-2.5' : 'px-3'}`}>
          <SearchIcon size={persistent ? 18 : 16} />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-0 bg-transparent h-11 text-base text-ink placeholder:text-ink-2 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
            aria-label="清除搜尋"
          >
            <ClearIcon />
          </button>
        )}
        {!persistent && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-2 hover:text-ink border-l border-border transition-colors"
            aria-label="收起搜尋"
            title="收起 (Esc)"
          >
            <CollapseIcon />
          </button>
        )}
      </div>

      {value && typeof resultCount === 'number' && (
        <p className="type-micro mt-1.5 px-1 tabular-nums" aria-live="polite">
          {resultCount === 0 ? '無結果' : `${resultCount} 筆結果`}
        </p>
      )}
    </div>
  );
}

function SearchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7H11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
