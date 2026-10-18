interface Props {
  /** 中文標題 */
  title: string;
  /** 英文大寫 kicker（例：NEXT、ATTENTION、FORMULA） */
  kicker?: string;
  /** 跟在標題後的計數（ink tabular-nums） */
  count?: number;
  /** 右側「全部 →」 */
  onMore?: () => void;
  moreLabel?: string;
}

/** Section 標題：「英文大寫 kicker＋中文」12/500 ink-2。 */
export function SectionHeader({ title, kicker, count, onMore, moreLabel = '全部 →' }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[44px]">
      <h2 className="kicker">
        {kicker}
        <span className={`${kicker ? 'ml-2.5 ' : ''}tracking-[0.1em]`}>{title}</span>
        {count != null && <span className="ml-1.5 text-ink tabular-nums">{count}</span>}
      </h2>
      {onMore && (
        <button type="button" onClick={onMore} className="btn-text -mr-3" aria-label={`${title} — ${moreLabel}`}>
          {moreLabel}
        </button>
      )}
    </div>
  );
}
