import type { Recipe } from '../../types';
import {
  FRAG_CATS,
  RECIPE_STATUS,
  RECIPE_STATUS_BG,
  RECIPE_STATUS_BORDER,
} from '../../utils/constants';
import { SectionHeader } from '../shared/SectionHeader';

interface Props {
  recipes: Recipe[];
  totalCount: number;
  onOpen: () => void;
  onRecipeClick: (id: number) => void;
}

export function RecentRecipesSection({ recipes, totalCount, onOpen, onRecipeClick }: Props) {
  if (recipes.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader title="近期配方" count={totalCount} onMore={onOpen} />
      <div className="space-y-2">
        {recipes.map((r) => {
          const st = RECIPE_STATUS[r.status] ?? RECIPE_STATUS['pending'];
          return (
            <button
              key={r.id}
              onClick={() => onRecipeClick(r.id)}
              className="w-full text-left border border-border px-4 py-3 hover:border-ink-2 transition-colors"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: RECIPE_STATUS_BORDER[r.status],
                background: RECIPE_STATUS_BG[r.status],
              }}
              aria-label={`開啟配方 ${r.name}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-ink-2 tracking-label mb-0.5">
                    {r.num} · {FRAG_CATS[r.fragCat].label}
                  </p>
                  <p className="text-sm font-serif text-ink truncate">{r.name}</p>
                  {(r.tags?.length ?? 0) > 0 && (
                    <p className="text-[10px] text-ink-3 font-light mt-0.5">{r.tags.join(' · ')}</p>
                  )}
                </div>
                <span
                  className="text-[10px] font-light px-1.5 py-0.5 shrink-0"
                  style={{ background: st.color, color: '#F5F1EB' }}
                >
                  {st.label}
                </span>
              </div>
              {r.rating > 0 && (
                <p className="text-[10px] text-accent mt-1">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
