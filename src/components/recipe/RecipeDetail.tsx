import { useMemo, useState } from 'react';
import type { Recipe, Task, Ingredient, IngredientCat, Material } from '../../types';
import { FRAG_CATS, ING_CATS, ING_CAT_COLORS, RECIPE_STATUS } from '../../utils/constants';
import { speciesGroupLabel } from '../../utils/species';
import { StatusBadge } from '../shared/StatusBadge';
import { BurnLog } from './BurnLog';
import { RelatedTasks } from './RelatedTasks';

interface Props {
  recipe: Recipe;
  tasks: Task[];
  materials: Material[];
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: number) => void;
  onTaskTab: () => void;
}

interface ResolvedIngredient {
  ing: Ingredient;
  material: Material | null;
}

interface CeilingWarning {
  material: Material;
  ratioPct: number;
  ceilingPct: number;
}

/** 解析 ingredient → 對應材料（優先 materialId，回落比對 name + aliases）*/
function resolveMaterial(ing: Ingredient, materials: Material[]): Material | null {
  if (ing.materialId) {
    const byId = materials.find((m) => m.id === ing.materialId);
    if (byId) return byId;
  }
  // 回落：name 完全相符
  const byName = materials.find((m) => m.name === ing.name);
  if (byName) return byName;
  // 回落：aliases 命中
  return materials.find((m) => (m.aliases ?? []).includes(ing.name)) ?? null;
}

/** 取顯示名稱：優先 displayShort，回落 ing.name */
function ingredientDisplay(ing: Ingredient, mat: Material | null): string {
  if (mat?.displayShort) return mat.displayShort;
  return ing.name;
}

export function RecipeDetail({ recipe, tasks, materials, onBack, onEdit, onDelete, onTaskTab }: Props) {
  const [vIdx, setVIdx] = useState(0);
  const [openSimilarFor, setOpenSimilarFor] = useState<string | null>(null);
  const versions = recipe.versions ?? [];
  const version = versions[vIdx];
  const allTasksDone = tasks.filter((t) => t.recipeId === recipe.id).every((t) => t.status === 'done');
  const hasTasks = tasks.some((t) => t.recipeId === recipe.id);

  // ── 解析 ingredients → 對應材料 ──────────────────────────────
  const resolved: ResolvedIngredient[] = useMemo(() => {
    if (!version) return [];
    return (version.ingredients ?? []).map((ing) => ({
      ing,
      material: resolveMaterial(ing, materials),
    }));
  }, [version, materials]);

  // ── v3Warnings 與硬上限檢查 ─────────────────────────────────
  const { ceilingWarnings, materialWarnings } = useMemo(() => {
    const cw: CeilingWarning[] = [];
    const mw = new Map<string, string>();  // dedupe by warning text
    if (version && version.totalWeight > 0) {
      for (const r of resolved) {
        if (!r.material) continue;
        const ratioPct = (r.ing.amount / version.totalWeight) * 100;
        if (r.material.hardCeiling != null && ratioPct > r.material.hardCeiling) {
          cw.push({ material: r.material, ratioPct, ceilingPct: r.material.hardCeiling });
        }
        for (const w of r.material.v3Warnings ?? []) mw.set(w, r.material.name);
      }
    }
    return {
      ceilingWarnings: cw,
      materialWarnings: Array.from(mw.entries()).map(([text, source]) => ({ text, source })),
    };
  }, [resolved, version]);

  // ── 同物種對照 ─────────────────────────────────────────────
  function similarFor(mat: Material): Material[] {
    const k = mat.speciesGroup;
    if (!k) return [];
    return materials.filter((m) => m.id !== mat.id && m.speciesGroup === k);
  }

  if (!version) return null;

  const catByIngCat: Record<string, ResolvedIngredient[]> = {};
  for (const r of resolved) {
    const key = r.ing.cat in ING_CATS ? r.ing.cat : 'herb';
    if (!catByIngCat[key]) catByIngCat[key] = [];
    catByIngCat[key].push(r);
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="type-meta py-2 -ml-2 px-2" aria-label="返回上一頁">← 返回</button>
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="type-micro">{recipe.num} · {FRAG_CATS[recipe.fragCat]?.label ?? recipe.fragCat}</p>
            <h1 className="type-title">{recipe.name}</h1>
          </div>
          <StatusBadge status={recipe.status} />
        </div>
        {(recipe.tags?.length ?? 0) > 0 && (
          <p className="type-meta">{recipe.tags.join(' · ')}</p>
        )}
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

      {/* v3Warnings panel — 只在有警告時顯示 */}
      {(ceilingWarnings.length > 0 || materialWarnings.length > 0) && (
        <div className="border border-error bg-error/5 p-3 mb-5">
          <p className="section-label text-error mb-2">v3.0 規則檢查</p>

          {ceilingWarnings.length > 0 && (
            <div className="mb-2">
              {ceilingWarnings.map((w, i) => (
                <p key={i} className="type-meta text-error">
                  · <span className="font-normal">{w.material.displayShort ?? w.material.name}</span>{' '}
                  比例 {w.ratioPct.toFixed(1)}% 超過硬上限 {w.ceilingPct}%
                </p>
              ))}
            </div>
          )}

          {materialWarnings.length > 0 && (
            <div>
              {materialWarnings.map((w, i) => (
                <p key={i} className="type-meta text-error">
                  · {w.text} <span className="text-ink-3">（{w.source}）</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      {version && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">配方組成</p>
            <p className="type-meta">總重 {version.totalWeight}g</p>
          </div>

          {/* Stacked proportion bar */}
          {(version.totalWeight ?? 0) > 0 && (() => {
            const segs = (Object.keys(ING_CATS) as IngredientCat[])
              .map((cat) => ({
                cat,
                weight: (catByIngCat[cat] ?? []).reduce((s, r) => s + (r.ing.amount || 0), 0),
              }))
              .filter((s) => s.weight > 0);
            if (!segs.length) return null;
            return (
              <div className="flex h-2 w-full mb-4 gap-px overflow-hidden">
                {segs.map(({ cat, weight }) => (
                  <div
                    key={cat}
                    style={{ width: `${(weight / version.totalWeight) * 100}%`, background: ING_CAT_COLORS[cat] }}
                    title={`${ING_CATS[cat].label} ${((weight / version.totalWeight) * 100).toFixed(0)}%`}
                  />
                ))}
              </div>
            );
          })()}

          <div className="space-y-4">
            {(Object.keys(ING_CATS) as (keyof typeof ING_CATS)[]).map((cat) => {
              const items = catByIngCat[cat];
              if (!items?.length) return null;
              return (
                <div key={cat}>
                  <p className="type-meta mb-2" style={{ color: ING_CAT_COLORS[cat] }}>{ING_CATS[cat].label}</p>
                  <div className="space-y-1">
                    {items.map((r, i) => {
                      const pct = version.totalWeight ? (r.ing.amount / version.totalWeight) * 100 : 0;
                      const overCeiling = r.material?.hardCeiling != null && pct > r.material.hardCeiling;
                      const sims = r.material ? similarFor(r.material) : [];
                      const showSims = openSimilarFor === `${cat}-${i}`;
                      return (
                        <div key={i} className="border-b border-border/50 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="type-body">
                                {ingredientDisplay(r.ing, r.material)}
                                {r.material?.supplier && (
                                  <span className="type-micro text-ink-3 ml-2">· {supplierShort(r.material.supplier)}</span>
                                )}
                                {!r.material && (
                                  <span className="type-micro text-ink-3 ml-2 italic">未對應</span>
                                )}
                              </p>
                              {(r.material?.species || r.material?.speciesGroup) && (
                                <p className="type-micro text-ink-3 mt-0.5">
                                  {r.material.species && <span className="italic">{r.material.species}</span>}
                                  {r.material.species && r.material.speciesGroup && ' · '}
                                  {r.material.speciesGroup && speciesGroupLabel(r.material.speciesGroup)}
                                </p>
                              )}
                            </div>
                            <p className="type-body text-ink-2 shrink-0">
                              {r.ing.amount}{r.ing.unit}
                              {pct > 0 && (
                                <span className={`text-xs opacity-60 ml-1 ${overCeiling ? 'text-error font-normal opacity-100' : 'text-ink-2'}`}>
                                  {pct.toFixed(1)}%
                                </span>
                              )}
                            </p>
                            {sims.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setOpenSimilarFor(showSims ? null : `${cat}-${i}`)}
                                className="type-micro text-accent shrink-0"
                                aria-label={`查看同物種`}
                              >
                                同種×{sims.length}
                              </button>
                            )}
                          </div>
                          {showSims && sims.length > 0 && (
                            <div className="mt-2 pl-3 border-l border-border space-y-0.5">
                              {sims.map((sm) => (
                                <p key={sm.id} className="type-micro text-ink-2">
                                  · {sm.displayShort ?? sm.name}
                                  {sm.supplier && <span className="text-ink-3"> ({sm.supplier})</span>}
                                  {sm.qualityNote && <span className="text-ink-3"> — {sm.qualityNote.slice(0, 30)}</span>}
                                </p>
                              ))}
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
            <p className="type-body text-ink-2 mt-4 whitespace-pre-wrap">{version.notes}</p>
          )}
          {(version.comments?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-1">
              {version.comments.map((c, i) => (
                <p key={i} className="type-micro">· {c}</p>
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
          {recipe.process.notes && <p className="type-body text-ink-2">{recipe.process.notes}</p>}
        </div>
      )}

      {recipe.rating > 0 && (
        <p className="text-sm text-ink-2 mb-5">{'★'.repeat(recipe.rating)}{'☆'.repeat(5 - recipe.rating)}</p>
      )}

      <BurnLog burnLog={recipe.burnLog ?? []} />

      <RelatedTasks recipeId={recipe.id} tasks={tasks} onTaskClick={onTaskTab} />

      <div className="flex gap-3 mt-6 border-t border-border pt-4">
        <button onClick={() => onEdit(recipe)} className="btn text-xs" aria-label={`編輯配方 ${recipe.name}`}>編輯</button>
        <button onClick={() => onDelete(recipe.id)} className="btn text-xs text-error border-error" aria-label={`刪除配方 ${recipe.name}`}>刪除</button>
        <div className="flex-1" />
        <p className="text-xs text-ink-2 opacity-60 font-light self-end">
          {RECIPE_STATUS[recipe.status].label}
        </p>
      </div>
    </div>
  );
}

function supplierShort(s: string): string {
  return s.length <= 4 ? s : s.slice(0, 2);
}
