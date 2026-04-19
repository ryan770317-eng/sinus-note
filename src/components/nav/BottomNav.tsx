import type { JSX } from 'react';
import { TAB_ICONS, IconSettings } from './NavIcons';

export type TabId = 'overview' | 'recipe' | 'task' | 'material' | 'notes';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',  label: '總覽' },
  { id: 'recipe',    label: '配方' },
  { id: 'task',      label: '工序' },
  { id: 'material',  label: '材料' },
  { id: 'notes',     label: '隨手記' },
];

interface Props {
  current: TabId;
  onChange: (tab: TabId) => void;
  onMenuOpen: () => void;
}

export function BottomNav({ current, onChange, onMenuOpen }: Props): JSX.Element {
  return (
    <>
      {/* ───────────────────────── Tablet / Desktop: top bar ───────────────────────── */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-12 bg-bg/95 backdrop-blur border-b border-border items-stretch"
        aria-label="主要導覽"
      >
        <div className="flex flex-1 items-stretch" role="tablist">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            const active = tab.id === current;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                role="tab"
                aria-selected={active}
                aria-label={`切換到${tab.label}分頁`}
                className={`group relative px-4 flex items-center gap-2 type-label transition-colors ${
                  active ? 'text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span>{tab.label}</span>
                {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />}
              </button>
            );
          })}
        </div>
        <button
          onClick={onMenuOpen}
          className="px-4 flex items-center justify-center text-ink-2 hover:text-ink border-l border-border transition-colors"
          aria-label="開啟設定選單"
        >
          <IconSettings size={18} />
        </button>
      </nav>

      {/* ───────────────────────── Mobile: flat bottom tab bar ───────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="主要導覽"
      >
        <div className="flex items-stretch" role="tablist">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            const active = tab.id === current;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                role="tab"
                aria-selected={active}
                aria-label={`切換到${tab.label}分頁`}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  active ? 'text-ink' : 'text-ink-2'
                }`}
              >
                {active && <span className="absolute top-0 left-3 right-3 h-[2px] bg-ink" />}
                <Icon size={22} className="shrink-0" />
                <span className="type-micro tracking-wider mt-0.5">{tab.label}</span>
              </button>
            );
          })}
          {/* Settings — last slot, visually separated by left border */}
          <button
            onClick={onMenuOpen}
            className="flex-1 max-w-[64px] flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-ink-2 border-l border-border transition-colors hover:text-ink"
            aria-label="開啟設定選單"
          >
            <IconSettings size={20} className="shrink-0" />
            <span className="type-micro tracking-wider mt-0.5">設定</span>
          </button>
        </div>
      </nav>
    </>
  );
}
