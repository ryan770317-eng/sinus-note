interface Props {
  /** 方塊顏色（PALETTE 色碼） */
  color: string;
  /** 狀態文字（13px ink；狀態不靠彩色字表達） */
  label: string;
  /** 空心方塊（1.5px ink-2 邊框）— 給「待製」 */
  outlined?: boolean;
  /** 方塊邊長，預設 8 */
  size?: number;
}

/** 8px 色方塊＋墨色狀態字。取代舊版彩底狀態膠囊。 */
export function StatusDot({ color, label, outlined = false, size = 8 }: Props) {
  return (
    <span className="inline-flex items-center gap-2 shrink-0 text-[13px] text-ink">
      <span
        aria-hidden="true"
        className="inline-block shrink-0"
        style={
          outlined
            ? { width: size, height: size, border: '1.5px solid #6B6459' }
            : { width: size, height: size, background: color }
        }
      />
      {label}
    </span>
  );
}
