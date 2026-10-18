import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** 目前的數值；0 顯示為空白 */
  value: number;
  /** 文字變動時回傳數字（空字串或無效視為 0） */
  onValueChange: (n: number) => void;
};

/**
 * 小數輸入：type="text" + inputMode="decimal"。
 * 內部以字串編輯（能打出「1.」「0.5」），對外只吐數字；空字串視為 0。
 * 外部值被改掉（例如切版本）時，以外部值為準重新顯示。
 */
export function DecimalInput({ value, onValueChange, ...rest }: Props) {
  const [text, setText] = useState(() => (value ? String(value) : ''));
  const parsed = Number(text.replace(',', '.')) || 0;
  const shown = parsed === (value || 0) ? text : (value ? String(value) : '');
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        onValueChange(Number(e.target.value.replace(',', '.')) || 0);
      }}
    />
  );
}
