import type { Note } from '../../types';
import { formatNoteDate } from '../../utils/date';
import { SectionHeader } from '../shared/SectionHeader';

interface Props {
  notes: Note[];
  onOpen: () => void;
}

export function LatestNotesSection({ notes, onOpen }: Props) {
  if (notes.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader title="最新隨手記" count={notes.length} onMore={onOpen} />
      <div className="space-y-2">
        {notes.slice(0, 2).map((n) => {
          const { date, time } = formatNoteDate(n.ts);
          return (
            <button
              key={n.id}
              onClick={onOpen}
              className="w-full text-left bg-card border border-border px-4 py-3 hover:border-ink-2 transition-colors"
              aria-label={`開啟隨手記：${n.text.slice(0, 40)}`}
            >
              <p className="type-micro mb-1">
                <span className="font-normal text-ink">{date}</span> {time}
              </p>
              <p className="type-body line-clamp-2">{n.text}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
