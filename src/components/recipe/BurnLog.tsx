import type { BurnEntry } from '../../types';
import { stars } from '../../utils/format';

interface Props {
  burnLog: BurnEntry[];
}

const SMOKE_LABEL = { good: '優', ok: '可', bad: '差' };

/** 試燒紀錄內容（細線列）。開合由外層 DrawerRow 控制。 */
export function BurnLog({ burnLog }: Props) {
  if (burnLog.length === 0) return null;
  return (
    <div className="border-t border-border">
      {burnLog.map((entry, i) => (
        <div key={i} className="py-3 border-b border-border last:border-b-0">
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2 tabular-nums">
            <span>{entry.date}</span>
            <span>
              煙 {SMOKE_LABEL[entry.smoke] ?? entry.smoke}
              <span className="ml-2 text-accent">{stars(entry.rating)}</span>
            </span>
          </div>
          {entry.front && <p className="text-base text-ink mt-1"><span className="text-[13px] text-ink-2 mr-2">前</span>{entry.front}</p>}
          {entry.mid && <p className="text-base text-ink mt-0.5"><span className="text-[13px] text-ink-2 mr-2">中</span>{entry.mid}</p>}
          {entry.tail && <p className="text-base text-ink mt-0.5"><span className="text-[13px] text-ink-2 mr-2">後</span>{entry.tail}</p>}
          {entry.notes && <p className="text-[13px] text-ink-2 mt-1">{entry.notes}</p>}
        </div>
      ))}
    </div>
  );
}
