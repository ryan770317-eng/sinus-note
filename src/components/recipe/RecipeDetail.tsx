import { useState } from 'react';
import type { Recipe, Task, Ingredient, IngredientCat } from '../../types';
import { FRAG_CATS, ING_CATS, RECIPE_STATUS } from '../../utils/constants';
import { StatusBadge } from '../shared/StatusBadge';
import { BurnLog } from './BurnLog';
import { RelatedTasks } from './RelatedTasks';

interface Props {
  recipe: Recipe;
  tasks: Task[];
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: number) => void;
  onTaskTab: () => void;
}

export function RecipeDetail({ recipe, tasks, onBack, onEdit, onDelete, onTaskTab }: Props) {
  const [vIdx, setVIdx] = useState(0);
  const versions = recipe.versions ?? [];
  const version = versions[vIdx];
  const allTasksDone = tasks.filter((t) => t.recipeId === recipe.id).every((t) => t.status === 'done');
  const hasTasks = tasks.some((t) => t.recipeId === recipe.id);

  const catByIngCat: Partial<Record<IngredientCat, Ingredient[]>> = {};
  if (version) {
    for (const ing of version.ingredients) {
      if (!catByIngCat[ing.cat]) catByIngCat[ing.cat] = [];
      catByIngCat[ing.cat]!.push(ing);
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-ink-2 text-sm font-light">← 返回</button>
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-xs text-ink-3 font-light">{recipe.num} · {FRAG_CATS[recipe.fragCat].label}</p>
            <h1 className="font-serif text-xl text-ink">{recipe.name}</h1>
          </div>
          <StatusBadge status={recipe.status} />
        </div>
        {(recipe.tags?.length ?? 0) > 0 && (
          <p className="text-xs text-ink-2 font-light">{recipe.tags.join(' · ')}</p>
        )}

        {/* Status suggestion */}
        {hasTasks && allTasksDone && recipe.status !== 'success' && (
          <p className="text-xs text-accent mt-2">所有關聯工序已完成，可考慮更新狀態</p>
        )}
      </div>

      {/* Version tabs */}
      {versions.length > 1 && (
        <div className="flex gap-0 mb-4 border-b border-border">
          {versions.map((v, i) => (
            <button
              key={i}
              onClick={() => setVIdx(i)}
              className={`px-4 py-2 text-xs font-light tracking-label transition-colors ${
                i === vIdx ? 'border-b-2 border-ink text-ink -mb-px' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {version && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">配方組成</p>
            <p className="text-xs text-ink-2 font-light">總重 {version.totalWeight}g</p>
          </div>
          <div className="space-y-4">
            {(Object.keys(ING_CATS) as (keyof typeof ING_CATS)[]).map((cat) => {
              const ings = catByIngCat[cat];
              if (!ings?.length) return null;
              return (
                <div key={cat}>
                  <p className="text-xs text-ink-3 font-light mb-2">{ING_CATS[cat].label}</p>
                  <div className="space-y-1">
                    {ings.map((ing, i) => {
                      const pct = version.totalWeight ? (ing.amount / version.totalWeight) * 100 : 0;
                      return (
                        <div key={i} className="py-1 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-light text-ink">{ing.name}</p>
                            <p className="text-sm font-light text-ink-2">
                              {ing.amount}{ing.unit}
                              {pct > 0 && <span className="text-xs text-ink-4 ml-1">{pct.toFixed(1)}%</span>}
                            </p>
                          </div>
                          {pct > 0 && (
                            <div className="w-full h-[2px] bg-border mt-1">
                              <div className="h-full bg-accent/50" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {version.notes && (
            <p className="text-sm text-ink-2 font-light mt-4 whitespace-pre-wrap">{version.notes}</p>
          )}
          {(version.comments?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-1">
              {version.comments.map((c, i) => (
                <p key={i} className="text-xs text-ink-3 font-light">· {c}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {recipe.timeline && (
        <div className="mb-5 border-t border-border pt-4">
          <p className="section-label mb-3">時間軸</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {recipe.timeline.makeDate && (
              <div>
                <p className="text-xs text-ink-3">製作日期</p>
                <p className="font-light text-ink">{recipe.timeline.makeDate}</p>
              </div>
            )}
            {(recipe.timeline.dryDays ?? 0) > 0 && (
              <div>
                <p className="text-xs text-ink-3">乾燥天數</p>
                <p className="font-light text-ink">{recipe.timeline.dryDays} 天</p>
              </div>
            )}
            {recipe.timeline.agingStart && (
              <div>
                <p className="text-xs text-ink-3">陳化開始</p>
                <p className="font-light text-ink">{recipe.timeline.agingStart}</p>
              </div>
            )}
            {recipe.timeline.agingNotes && (
              <div className="col-span-2">
                <p className="text-xs text-ink-3">陳化備注</p>
                <p className="font-light text-ink">{recipe.timeline.agingNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Process flags */}
      {recipe.process && (recipe.process.tincture || recipe.process.ferment || recipe.process.wine || recipe.process.notes) && (
        <div className="mb-5 border-t border-border pt-4">
          <p className="section-label mb-3">工序標記</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {recipe.process.tincture && <span className="border border-border text-xs text-ink-2 px-2 py-0.5">酊劑</span>}
            {recipe.process.ferment && <span className="border border-border text-xs text-ink-2 px-2 py-0.5">發酵</span>}
            {recipe.process.wine && <span className="border border-border text-xs text-ink-2 px-2 py-0.5">酒媒</span>}
          </div>
          {recipe.process.notes && <p className="text-sm text-ink-2 font-light">{recipe.process.notes}</p>}
        </div>
      )}

      {/* Rating */}
      {recipe.rating > 0 && (
        <p className="text-sm text-ink-2 mb-5">{'★'.repeat(recipe.rating)}{'☆'.repeat(5 - recipe.rating)}</p>
      )}

      {/* Burn log */}
      <BurnLog burnLog={recipe.burnLog ?? []} />

      {/* Related tasks */}
      <RelatedTasks recipeId={recipe.id} tasks={tasks} onTaskClick={onTaskTab} />

      {/* Actions */}
      <div className="flex gap-3 mt-6 border-t border-border pt-4">
        <button onClick={() => onEdit(recipe)} className="btn text-xs">編輯</button>
        <button
          onClick={() => {
            if (confirm(`確定要刪除「${recipe.name}」？`)) onDelete(recipe.id);
          }}
          className="btn text-xs text-error border-error"
        >
          刪除
        </button>
        <div className="flex-1" />
        <p className="text-xs text-ink-4 font-light self-end">
          {RECIPE_STATUS[recipe.status].label}
        </p>
      </div>
    </div>
  );
}
