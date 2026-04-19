import type { TabId } from './BottomNav';

type IconProps = {
  className?: string;
  size?: number;
};

const STROKE = 1.2;

export function IconOverview({ className = '', size = 22 }: IconProps) {
  // 總覽：九宮格小方塊
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <rect x="3"  y="3"  width="6" height="6" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="13" y="3"  width="6" height="6" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="3"  y="13" width="6" height="6" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="13" y="13" width="6" height="6" stroke="currentColor" strokeWidth={STROKE} />
    </svg>
  );
}

export function IconRecipe({ className = '', size = 22 }: IconProps) {
  // 配方：燒杯 / flask
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <path d="M8 3 H14" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path
        d="M9 3 V9 L4.5 17 A1 1 0 0 0 5.5 19 H16.5 A1 1 0 0 0 17.5 17 L13 9 V3"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M7 13 H15" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function IconTask({ className = '', size = 22 }: IconProps) {
  // 工序：時鐘（時間 / 進行中）
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M11 6.5 V11 L14 13" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMaterial({ className = '', size = 22 }: IconProps) {
  // 材料庫：堆疊罐 / jars
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="3" width="14" height="3" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M5 6 V18 A1 1 0 0 0 6 19 H16 A1 1 0 0 0 17 18 V6" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M5 11.5 H17" stroke="currentColor" strokeWidth={STROKE} opacity="0.55" />
    </svg>
  );
}

export function IconNotes({ className = '', size = 22 }: IconProps) {
  // 隨手記：紙筆
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <path d="M5 3 H13 L17 7 V19 H5 Z" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M13 3 V7 H17" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M8 11 H14" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" opacity="0.55" />
      <path d="M8 14.5 H12" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function IconSettings({ className = '', size = 20 }: IconProps) {
  // 齒輪
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth={STROKE} />
      <path
        d="M11 1.5 V4 M11 18 V20.5 M1.5 11 H4 M18 11 H20.5
           M4.2 4.2 L6 6 M16 16 L17.8 17.8 M4.2 17.8 L6 16 M16 6 L17.8 4.2"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </svg>
  );
}

export const TAB_ICONS: Record<TabId, (p: IconProps) => React.JSX.Element> = {
  overview: IconOverview,
  recipe:   IconRecipe,
  task:     IconTask,
  material: IconMaterial,
  notes:    IconNotes,
};
