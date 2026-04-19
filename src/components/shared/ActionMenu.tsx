import { useEffect, useRef, useState } from 'react';

export type ActionItem = {
  label: string;
  icon?: string;
  onClick: () => void;
  /** 危險動作（紅色文字） */
  danger?: boolean;
};

type Props = {
  /** Menu 標題（顯示於 sheet 頂部） */
  title?: string;
  /** Menu 副標 */
  subtitle?: string;
  items: ActionItem[];
  /** 觸發按鈕的 aria-label */
  triggerLabel?: string;
  /** 觸發按鈕額外 className */
  triggerClassName?: string;
};

/**
 * 結合 桌機 popover + 手機 bottom-sheet 的動作選單。
 * 自動依視窗寬度切換呈現方式（breakpoint 768px）。
 */
export function ActionMenu({
  title,
  subtitle,
  items,
  triggerLabel = '更多動作',
  triggerClassName = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 偵測 mobile
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Click outside（僅 desktop popover）
  useEffect(() => {
    if (!open || isMobile) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, isMobile]);

  // Body scroll lock（僅 mobile sheet）
  useEffect(() => {
    if (open && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open, isMobile]);

  const handleItemClick = (item: ActionItem) => {
    setOpen(false);
    // 延遲執行，避免 menu 消失動畫和 action 衝突
    setTimeout(() => item.onClick(), 0);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={triggerLabel}
        aria-expanded={open}
        className={`min-w-[32px] min-h-[32px] flex items-center justify-center text-ink-3 hover:text-ink hover:bg-ink/5 transition-colors ${triggerClassName}`}
      >
        <DotsIcon />
      </button>

      {/* Desktop popover */}
      {open && !isMobile && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 bg-bg border border-ink-4 shadow-lg z-30"
          style={{ minWidth: 160 }}
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-card transition-colors flex items-center gap-2 ${
                i < items.length - 1 ? 'border-b border-border' : ''
              } ${item.danger ? 'text-error' : 'text-ink-2'}`}
              role="menuitem"
            >
              {item.icon && <span className="w-4 text-center">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-ink/40 animate-[fadeIn_160ms_ease-out]"
            onClick={() => setOpen(false)}
          />
          {/* sheet */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-bg border-t border-ink-4 animate-[slideUp_220ms_cubic-bezier(0.25,0.8,0.25,1)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {(title || subtitle) && (
              <div className="px-5 py-4 border-b border-border">
                {subtitle && <p className="type-meta mb-0.5">{subtitle}</p>}
                {title && <p className="type-name">{title}</p>}
              </div>
            )}
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => handleItemClick(item)}
                className={`w-full text-left px-5 py-4 type-body hover:bg-card flex items-center gap-3 ${
                  i < items.length - 1 ? 'border-b border-border' : ''
                } ${item.danger ? 'text-error' : 'text-ink'}`}
                role="menuitem"
              >
                {item.icon && <span className="text-lg w-6 text-center">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => setOpen(false)}
              className="w-full text-center py-4 type-body text-ink-2 border-t border-border hover:bg-card"
            >
              取消
            </button>
          </div>

          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}
