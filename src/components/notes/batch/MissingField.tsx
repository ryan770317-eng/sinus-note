import { useEffect, useRef, useState } from 'react';

export const MISSING_BG = 'rgba(200,170,80,0.15)';

/** Editable input that uses local state — only syncs to parent on blur.
 *  Rendered unconditionally (not swapped with Field) to avoid unmounting. */
export function EditableField({
  initial,
  onCommit,
  placeholder,
  label,
}: {
  initial: string;
  onCommit: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const [val, setVal] = useState(initial);
  const committed = useRef(initial);

  useEffect(() => {
    if (initial !== committed.current) {
      setVal(initial);
      committed.current = initial;
    }
  }, [initial]);

  function handleBlur() {
    committed.current = val;
    onCommit(val);
  }

  const isEmpty = !val;
  return (
    <span className="text-xs font-light">
      <span className="text-ink-2">{label}</span>{' '}
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={`${label}${isEmpty ? '（待補充）' : ''}`}
        className={`text-xs px-1.5 py-0.5 border rounded font-light outline-none ${
          isEmpty ? 'border-dashed border-amber-400' : 'border-border'
        }`}
        style={{ background: isEmpty ? MISSING_BG : 'transparent', minWidth: 80 }}
      />
    </span>
  );
}

export function Field({
  label,
  value,
  missing,
}: {
  label: string;
  value: string;
  missing?: boolean;
}) {
  return (
    <span className="type-meta text-ink">
      <span className="text-ink-2">{label}</span>{' '}
      {missing ? (
        <span className="px-1 rounded" style={{ background: MISSING_BG }}>未填</span>
      ) : (
        value
      )}
    </span>
  );
}
