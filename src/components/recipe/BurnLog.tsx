import { useState } from 'react';
import type { BurnEntry } from '../../types';

interface Props {
  burnLog: BurnEntry[];
}

const SMOKE_LABEL = { good: '優', ok: '可', bad: '差' };

export function BurnLog({ burnLog }: Props) {
  const [open, setOpen] = useState(false);

  if (burnLog.length === 0) return null;

  return (
    <div className="border-t border-border mt-4 pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-light text-ink-2 w-full text-left"
      >
        <span className="section-label">試燒紀錄</span>
        <span className="text-ink-4 text-xs ml-1">{burnLog.length} 筆</span>
        <span className="ml-auto text-ink-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {burnLog.map((entry, i) => (
            <div key={i} className="bg-card border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-ink-2">{entry.date}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-3">煙 {SMOKE_LABEL[entry.smoke]}</span>
                  <span className="text-xs text-ink-3">{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</span>
                </div>
              </div>
              {entry.front && <p className="text-xs font-light text-ink mb-0.5"><span className="text-ink-2">前</span> {entry.front}</p>}
              {entry.mid && <p className="text-xs font-light text-ink mb-0.5"><span className="text-ink-2">中</span> {entry.mid}</p>}
              {entry.tail && <p className="text-xs font-light text-ink mb-0.5"><span className="text-ink-2">後</span> {entry.tail}</p>}
              {entry.notes && <p className="text-xs text-ink-3 font-light mt-1">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
