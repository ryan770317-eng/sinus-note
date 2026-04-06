import type { Recipe, FragCat, RecipeStatus } from '../../types';
import { FRAG_CATS, RECIPE_STATUS } from '../../utils/constants';

const STATUS_BORDER: Record<RecipeStatus, string> = {
  success:  '#8B6F52',
  fail:     '#a06050',
  pending:  '#D6CFC4',
  progress: '#8B6F52',
  order:    '#6B6459',
};

const STATUS_BG: Record<RecipeStatus, string> = {
  success:  'rgba(139,111,82,0.10)',
  fail:     'rgba(160,96,80,0.10)',
  pending:  'transparent',
  progress: 'rgba(139,111,82,0.05)',
  order:    'rgba(107,100,89,0.05)',
};

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
  for (const r of catRecipes) {
    if (r.status in grouped) grouped[r.status].push(r);
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-ink-2 text-sm font-light">← 返回</button>
        <h1 className="font-serif text-xl text-ink tracking-wide">{FRAG_CATS[cat].label}</h1>
        <span className="text-xs text-ink-2 opacity-60 font-light">{catRecipes.length} 個</span>
      </div>

      {catRecipes.length === 0 && (
        <p className="text-sm text-ink-3 font-light py-8 text-center">此分類尚無配方</p>
      )}

      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        const st = RECIPE_STATUS[status] ?? RECIPE_STATUS['pending'];
        return (
          <div key={status} className="mb-6">
            {/* Status group header with colored accent */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5" style={{ background: st.color }} />
              <p className="text-xs tracking-label font-light" style={{ color: st.color }}>{st.label}</p>
              <span className="text-[10px] text-ink-2 opacity-60 font-light">{group.length}</span>
            </div>

            <div className="space-y-2">
              {group.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRecipeClick(r.id)}
                  className="w-full text-left border border-border px-4 py-3 hover:border-ink-2 transition-colors"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: STATUS_BORDER[r.status],
                    background: STATUS_BG[r.status],
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-3 font-light mb-0.5">{r.num}</p>
                      <p className="font-serif text-sm text-ink">{r.name}</p>
                      {(r.tags?.length ?? 0) > 0 && (
                        <p className="text-[10px] text-ink-3 font-light mt-1">{r.tags.join(' · ')}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {r.rating > 0 && (
                        <p className="text-[10px] text-accent">{'★'.repeat(r.rating)}</p>
                      )}
                      {(r.burnLog?.length ?? 0) > 0 && (
                        <p className="text-[10px] text-ink-2 opacity-60 font-light">試燒 {r.burnLog!.length}</p>
                      )}
                    </div>
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
