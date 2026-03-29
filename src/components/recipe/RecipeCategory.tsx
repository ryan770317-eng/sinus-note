import type { Recipe, FragCat, RecipeStatus } from '../../types';
import { FRAG_CATS, RECIPE_STATUS } from '../../utils/constants';
import { StatusBadge } from '../shared/StatusBadge';

interface Props {
  cat: FragCat;
  recipes: Recipe[];
  onBack: () => void;
  onRecipeClick: (id: number) => void;
  onNew: () => void;
}

const STATUS_ORDER: RecipeStatus[] = ['success', 'progress', 'order', 'pending', 'fail'];

export function RecipeCategory({ cat, recipes, onBack, onRecipeClick, onNew }: Props) {
  const catRecipes = recipes.filter((r) => r.fragCat === cat);

  const grouped: Record<RecipeStatus, Recipe[]> = {
    success: [], fail: [], pending: [], progress: [], order: [],
  };
  for (const r of catRecipes) grouped[r.status].push(r);

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-ink-2 text-sm font-light">← 返回</button>
        <h1 className="font-serif text-xl text-ink tracking-wide">{FRAG_CATS[cat].label}</h1>
      </div>

      {catRecipes.length === 0 && (
        <p className="text-sm text-ink-3 font-light py-8 text-center">此分類尚無配方</p>
      )}

      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        return (
          <div key={status} className="mb-6">
            <p className="section-label mb-3">{RECIPE_STATUS[status].label}</p>
            <div className="space-y-2">
              {group.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRecipeClick(r.id)}
                  className="w-full text-left bg-card border border-border px-4 py-3 hover:border-ink-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm text-ink">{r.name}</p>
                      <p className="text-xs text-ink-2 font-light mt-0.5">{r.num}</p>
                      {r.tags.length > 0 && (
                        <p className="text-xs text-ink-3 font-light mt-1">{r.tags.join(' · ')}</p>
                      )}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={onNew}
        className="fixed right-5 bottom-16 w-11 h-11 bg-ink text-bg text-xl flex items-center justify-center z-40"
        aria-label="新增配方"
      >
        ＋
      </button>
    </div>
  );
}
