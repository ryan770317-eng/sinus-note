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
      <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-12 bg-bg border-b border-border items-center">
        <div className="flex flex-1 items-center">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
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
        >
          ···
        </button>
      </div>

      {/* ── Mobile: bottom nav (< md) ── */}
      <div
        ref={navRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Expanded panel */}
        <div
          className="overflow-hidden transition-all duration-[250ms] ease-in-out"
          style={{ maxHeight: open ? `${TABS.length * 52}px` : '0px' }}
        >
          {TABS.map((tab, i) => (
            <div key={tab.id}>
              <button
                onClick={() => selectTab(tab.id)}
                className={`w-full text-left px-5 py-3 text-sm tracking-label transition-colors hover:bg-card ${
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
            className="flex-1 flex items-center px-5 gap-2 h-full text-sm font-light text-ink tracking-label"
          >
            <span className="font-normal">{currentLabel}</span>
            <span
              className="text-ink-2 transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
            >
              ▾
            </span>
          </button>
          <button
            onClick={onMenuOpen}
            className="px-5 h-full text-ink-2 tracking-wider text-xs hover:text-ink"
          >
            ···
          </button>
        </div>
      </div>
    </>
  );
}
