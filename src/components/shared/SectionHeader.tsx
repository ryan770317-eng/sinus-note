interface Props {
  title: string;
  count: number;
  color?: string;
  onMore?: () => void;
  moreLabel?: string;
}

export function SectionHeader({ title, count, color, onMore, moreLabel = '全部 →' }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <p className="section-label" style={color ? { color } : undefined}>{title}</p>
        <span
          className="text-[10px] font-light px-1.5 leading-5"
          style={{
            background: color ? `${color}18` : 'rgba(107,100,89,0.1)',
            color: color ?? '#6B6459',
          }}
          aria-label={`${count} 項`}
        >
          {count}
        </span>
      </div>
      {onMore && (
        <button
          onClick={onMore}
          className="text-xs text-ink-2 font-light hover:text-ink px-2 py-2 min-w-[44px] text-right"
          aria-label={`${title} — ${moreLabel}`}
        >
          {moreLabel}
        </button>
      )}
    </div>
  );
}
