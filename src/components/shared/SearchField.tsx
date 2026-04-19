import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** 結果數（顯示於輸入框下方）。undefined = 不顯示計數 */
  resultCount?: number;
  /** 跨類模式：undefined = 不顯示 toggle；true/false = 顯示可切換的 toggle */
  crossCategory?: boolean;
  onCrossCategoryChange?: (v: boolean) => void;
  /** 預設是否展開（電腦版可傳 true） */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * 共用搜尋欄位：
 *  - 預設收合成 ⌕ 圖示按鈕
 *  - 點擊展開輸入框，auto focus
 *  - 輸入框右側有 ✕ clear button
 *  - 有內容時顯示「N 筆結果」計數
 *  - 桌機 `/` 快捷鍵展開
 *  - 可選：跨類搜尋 toggle
 */
export function SearchField({
  value,
  onChange,
  placeholder = '搜尋...',
  resultCount,
  crossCategory,
  onCrossCategoryChange,
  defaultOpen = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(defaultOpen || !!value);
  const inputRef = useRef<HTMLInputElement>(null);

  // `/` 快捷鍵展開（desktop 獨享；避免輸入中觸發）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !open) {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        if (value) {
          onChange('');
        } else {
          setOpen(false);
          inputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, value, onChange]);

  // 展開時 auto focus
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const showCrossToggle = onCrossCategoryChange && typeof crossCategory === 'boolean';

  if (!open) {
    // 收合狀態：只顯示 ⌕ icon 按鈕
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
          aria-label="展開搜尋"
          title="搜尋 ( / )"
        >
          <SearchIcon />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 輸入框 + clear + cross-toggle 列 */}
      <div className="flex items-stretch gap-0 border border-ink-4 focus-within:border-ink-2 bg-card transition-colors">
        <div className="flex items-center px-3 text-ink-3">
          <SearchIcon />
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-2 pr-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-3 hover:text-ink transition-colors"
            aria-label="清除搜尋"
          >
            <ClearIcon />
          </button>
        )}
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-3 hover:text-ink border-l border-ink-4 transition-colors"
          aria-label="收起搜尋"
          title="收起 (Esc)"
        >
          <CollapseIcon />
        </button>
      </div>

      {/* 副資訊列：結果計數 + 跨類 toggle */}
      {(value || showCrossToggle) && (
        <div className="flex items-center justify-between mt-1.5 px-1">
          <div className="type-micro">
            {value && typeof resultCount === 'number' && (
              <span>
                {resultCount === 0 ? '無結果' : `${resultCount} 筆結果`}
              </span>
            )}
          </div>
          {showCrossToggle && (
            <button
              type="button"
              onClick={() => onCrossCategoryChange!(!crossCategory)}
              className="type-micro tracking-label uppercase flex items-center gap-1.5 py-1 hover:text-ink transition-colors"
              aria-pressed={crossCategory}
            >
              <span
                className="inline-block w-3.5 h-3.5 border border-ink-4 relative"
                style={{ background: crossCategory ? '#1A1A18' : 'transparent' }}
              >
                {crossCategory && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-bg"
                    style={{ fontSize: 10, lineHeight: 1 }}
                  >
                    ✓
                  </span>
                )}
              </span>
              <span>跨類搜尋</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
