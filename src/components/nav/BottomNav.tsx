import type { JSX } from 'react';
import { IconSettings } from './NavIcons';
import { TAB_ICONS } from './tabIcons';

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
  onQuickNote: () => void;
}

/** 快速記錄鉛筆 icon（比照 NavIcons line-icon 風格） */
function IconPencil({ className = '', size = 16 }: { className?: string; size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <path d="M14.5 3.5 L18.5 7.5 L8 18 L4 19 L5 15 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M13 5 L17 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BottomNav({ current, onChange, onMenuOpen, onQuickNote }: Props): JSX.Element {
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
          onClick={onQuickNote}
          className="px-4 flex items-center gap-2 type-label text-ink bg-card hover:text-ink border-l border-border transition-colors"
          aria-label="快速記錄"
        >
          <IconPencil size={18} className="shrink-0" />
          <span>記錄</span>
        </button>
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
          {/* Quick note — 手機列最後一格。
              設定使用頻率低，已移到總覽頁右上角齒輪，讓列上維持 6 格不擁擠 */}
          <button
            onClick={onQuickNote}
            className="flex-1 max-w-[64px] flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-bg bg-ink border-l border-border"
            aria-label="快速記錄"
          >
            <IconPencil size={18} className="shrink-0" />
            <span className="type-micro tracking-wider mt-0.5">記錄</span>
          </button>
        </div>
      </nav>
    </>
  );
}
