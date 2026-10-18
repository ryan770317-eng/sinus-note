import type { Recipe } from '../../types';
import { FRAG_CATS } from '../../utils/constants';
import { starsFilled } from '../../utils/format';
import { recipeStatusDot } from '../../utils/status';
import { StatusDot } from './StatusDot';

interface Props {
  recipe: Recipe;
  /** 點整列（進詳情） */
  onClick: () => void;
}

/** 配方清單列（FormulasV2）：80 高、底線分隔。總覽抽屜與配方首頁共用。 */
export function RecipeRow({ recipe: r, onClick }: Props) {
  const sub = [
    FRAG_CATS[r.fragCat]?.label ?? r.fragCat,
    (r.tags ?? []).join(' · '),
    starsFilled(r.rating),
  ].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`開啟配方 ${r.name}`}
      className="w-full h-20 border-b border-border flex items-center gap-3 text-left hover:bg-card transition-colors"
    >
      <span className="w-9 shrink-0 font-serif text-[13px] text-ink-2 tracking-[0.04em]">{r.num}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-serif text-lg text-ink truncate">{r.name}</span>
        {sub && <span className="block text-[13px] text-ink-2 truncate">{sub}</span>}
      </span>
      <StatusDot {...recipeStatusDot(r.status)} />
    </button>
  );
}
