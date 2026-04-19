import { useState, useEffect, useRef } from 'react';

export type TabId = 'overview' | 'recipe' | 'task' | 'material' | 'notes';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',  label: '總覽' },
  { id: 'recipe',    label: '配方' },
  { id: 'task',      label: '工序' },
  { id: 'material',  label: '材料庫' },
  { id: 'notes',     label: '隨手記' },
];

interface Props {
  current: TabId;
  onChange: (tab: TabId) => void;
  onMenuOpen: () => void;
}

export function BottomNav({ current, onChange, onMenuOpen }: Props) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const currentLabel = TABS.find((t) => t.id === current)?.label ?? '';

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function selectTab(tab: TabId) {
    onChange(tab);
    setOpen(false);
  }

  return (
    <>
      {/* ── Tablet / Desktop: top nav bar (md+) ── */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-12 bg-bg border-b border-border items-center"
        aria-label="主要導覽"
      >
        <div className="flex flex-1 items-center" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              aria-selected={tab.id === current}
              aria-label={`切換到${tab.label}分頁`}
              className={`px-5 h-12 text-sm tracking-label transition-colors relative ${
                tab.id === current
                  ? 'text-ink font-normal'
                  : 'text-ink-2 font-light hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.id === current && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onMenuOpen}
          className="px-5 h-12 text-ink-2 tracking-wider text-xs hover:text-ink border-l border-border"
          aria-label="開啟設定選單"
        >
          ···
        </button>
      </nav>

      {/* ── Mobile: bottom nav (< md) ── */}
      <nav
        ref={navRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="主要導覽"
      >
        {/* Expanded panel */}
        <div
          id="mobile-nav-menu"
          className="overflow-hidden transition-all duration-[250ms] ease-in-out"
          style={{ maxHeight: open ? `${TABS.length * 52}px` : '0px' }}
          role="menu"
          aria-hidden={!open}
        >
          {TABS.map((tab, i) => (
            <div key={tab.id}>
              <button
                onClick={() => selectTab(tab.id)}
                role="menuitem"
                aria-current={tab.id === current ? 'page' : undefined}
                tabIndex={open ? 0 : -1}
                className={`w-full text-left px-5 py-3 text-sm tracking-label transition-colors hover:bg-card min-h-[44px] ${
                  tab.id === current
                    ? 'text-ink font-normal'
                    : 'text-ink-2 font-light'
                }`}
              >
                {tab.label}
              </button>
              {i < TABS.length - 1 && <div className="border-t border-border" />}
            </div>
          ))}
        </div>

        {/* Collapsed bar */}
        <div className="flex items-center h-12">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
            aria-label={`目前分頁：${currentLabel}，點擊${open ? '收合' : '展開'}其他分頁`}
            className="flex-1 flex items-center px-5 gap-2 h-full type-body tracking-label"
          >
            <span className="font-normal">{currentLabel}</span>
            <span
              className="text-ink-2 transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
          <button
            onClick={onMenuOpen}
            className="px-5 h-full text-ink-2 tracking-wider text-xs hover:text-ink"
            aria-label="開啟設定選單"
          >
            ···
          </button>
        </div>
      </nav>
    </>
  );
}
