import { useEffect, useMemo, useState } from 'react';
import type { Recipe, Task, Ingredient, IngredientCat, Material, BurnEntry } from '../../types';
import { FRAG_CATS, ING_CATS, ING_CAT_COLORS, TASK_TYPES, TASK_STATUS } from '../../utils/constants';
import { starsFilled, supplierShort, fmtAmount, scaleFactor } from '../../utils/format';
import { recipeStatusDot } from '../../utils/status';
import { ingredientDisplay } from '../../utils/ingredient';
import { StatusDot } from '../shared/StatusDot';
import { SectionHeader } from '../shared/SectionHeader';
import { DrawerRow } from '../shared/DrawerRow';
import { ActionMenu } from '../shared/ActionMenu';
import { useToast } from '../shared/useToast';
import { BurnForm } from '../task/BurnForm';
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
  onCreateWeighTask: (recipe: Recipe, batchWeight: number | null) => Promise<void>;
  /** 「記一筆試燒」：把試燒紀錄追加到這個配方 */
  onBurnSaveForRecipe: (recipeId: number, entry: BurnEntry) => Promise<void>;
}

export interface ResolvedIngredient {
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

const ingCatOf = (cat: IngredientCat): IngredientCat => (cat in ING_CATS ? cat : 'herb');

type DrawerKey = 'tests' | 'notes' | 'process' | 'timeline' | 'burn' | 'tasks';

export function RecipeDetail({
  recipe, tasks, materials, onBack, onEdit, onDelete, onTaskTab, onCreateWeighTask, onBurnSaveForRecipe,
}: Props) {
  const toast = useToast();
  const [vIdx, setVIdx] = useState(0);
  const [openSimilarFor, setOpenSimilarFor] = useState<number | null>(null);
  const [targetText, setTargetText] = useState('');
  const [openDrawers, setOpenDrawers] = useState<Set<DrawerKey>>(() => new Set<DrawerKey>(['notes']));
  const [burnOpen, setBurnOpen] = useState(false);
  // U5 製作核對模式
  const [makeMode, setMakeMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const storageKey = `sinus_make_${recipe.id}_${vIdx}`;
  // 版本切換時只歸零換算；退出製作模式與清勾選在 tab onClick 裡做（D8-5）
  useEffect(() => {
    setTargetText('');
  }, [vIdx]);
  // makeMode 期間把勾選狀態續存 sessionStorage
  useEffect(() => {
    if (makeMode) sessionStorage.setItem(storageKey, JSON.stringify([...checked]));
  }, [checked, makeMode, storageKey]);
  const versions = recipe.versions ?? [];
  const version = versions[vIdx];
  const relatedTasks = tasks.filter((t) => t.recipeId === recipe.id);
  const allTasksDone = relatedTasks.every((t) => t.status === 'done');
  const hasTasks = relatedTasks.length > 0;

  // ── 解析 ingredients → 對應材料 ──────────────────────────────
  const resolved: ResolvedIngredient[] = useMemo(() => {
    if (!version) return [];
    return (version.ingredients ?? []).map((ing) => ({
      ing,
      material: resolveMaterial(ing, materials),
    }));
  }, [version, materials]);

  // ── v3Warnings 與硬上限檢查 ─────────────────────────────────
  const { ceilingWarnings, materialWarnings, pendingMaterials } = useMemo(() => {
    const cw: CeilingWarning[] = [];
    const mw = new Map<string, string>();  // dedupe by warning text
    const pending: Material[] = [];
    // v3Warnings / 待測提醒不該被 totalWeight 擋掉 — 只有比例檢查需要總重
    for (const r of resolved) {
      if (!r.material) continue;
      if (version && version.totalWeight > 0) {
        const ratioPct = (r.ing.amount / version.totalWeight) * 100;
        if (r.material.hardCeiling != null && ratioPct > r.material.hardCeiling) {
          cw.push({ material: r.material, ratioPct, ceilingPct: r.material.hardCeiling });
        }
      }
      for (const w of r.material.v3Warnings ?? []) mw.set(w, r.material.name);
      if ((r.material.testStatus ?? 'pending') === 'pending') {
        if (!pending.some((p) => p.id === r.material!.id)) pending.push(r.material);
      }
    }
    return {
      ceilingWarnings: cw,
      materialWarnings: Array.from(mw.entries()).map(([text, source]) => ({ text, source })),
      pendingMaterials: pending,
    };
  }, [resolved, version]);

  // ── 同物種對照 ─────────────────────────────────────────────
  function similarFor(mat: Material): Material[] {
    const k = mat.speciesGroup;
    if (!k) return [];
    return materials.filter((m) => m.id !== mat.id && m.speciesGroup === k);
  }

  if (!version) return null;

  const isOpen = (k: DrawerKey) => openDrawers.has(k);
  const toggleDrawer = (k: DrawerKey) =>
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });

  // U1 批次換算倍率（factor === 1 表示不換算）
  const parsedTarget = Number(targetText.replace(',', '.'));
  const targetWeight = targetText.trim() && Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : null;
  const factor = scaleFactor(version.totalWeight, targetWeight);

  // U5 製作核對進度
  const totalItems = resolved.length;
  const allChecked = totalItems > 0 && checked.size === totalItems;
  const canMake = totalItems > 0 && version.totalWeight > 0;

  function startMake() {
    const saved = sessionStorage.getItem(storageKey);
    let restored = new Set<string>();
    if (saved) {
      try {
        const arr = JSON.parse(saved) as unknown;
        // 舊格式 key（`${cat}-${i}`）直接忽略；新 key 為材料原始索引
        if (Array.isArray(arr)) {
          restored = new Set(arr.filter((k): k is string => typeof k === 'string' && /^\d+$/.test(k) && Number(k) < totalItems));
        }
      } catch { restored = new Set(); }
    }
    setChecked(restored);
    setMakeMode(true);
  }

  function exitMake() {
    setMakeMode(false);
    setChecked(new Set());
    sessionStorage.removeItem(storageKey);
  }

  function toggleChecked(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleCompleteMake() {
    try {
      await onCreateWeighTask(recipe, targetWeight);
      toast.success('已建立稱量工序');
      exitMake();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleBurnSave(entry: BurnEntry) {
    try {
      await onBurnSaveForRecipe(recipe.id, entry);
      toast.success('試燒紀錄已儲存');
      setBurnOpen(false);
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 比例條：依材料分類加總
  const segs = (Object.keys(ING_CATS) as IngredientCat[])
    .map((cat) => ({
      cat,
      weight: resolved.filter((r) => ingCatOf(r.ing.cat) === cat).reduce((s, r) => s + (r.ing.amount || 0), 0),
    }))
    .filter((s) => s.weight > 0);

  // ── 抽屜摘要 ────────────────────────────────────────────────
  const processFlags = [
    recipe.process?.tincture && '酊劑',
    recipe.process?.ferment && '發酵',
    recipe.process?.wine && '酒媒',
  ].filter(Boolean) as string[];
  const hasProcess = processFlags.length > 0 || !!recipe.process?.notes;

  const tl = recipe.timeline;
  const timelineItems = [
    tl?.makeDate && '製作',
    (tl?.dryDays ?? 0) > 0 && '乾燥',
    (tl?.agingStart || tl?.agingNotes) && '陳化',
  ].filter(Boolean) as string[];

  const burnLog = recipe.burnLog ?? [];
  const lastBurn = burnLog[burnLog.length - 1];
  const burnSummary = lastBurn
    ? (lastBurn.notes ? lastBurn.notes.slice(0, 20) : `${lastBurn.date} · 評分 ${lastBurn.rating}/5`)
    : '';

  const firstTask = relatedTasks[0];
  const taskSummary = firstTask
    ? `${(TASK_TYPES[firstTask.taskType] ?? TASK_TYPES.other).label} · ${TASK_STATUS[firstTask.status].label}`
    : '';

  const hasRuleWarnings = ceilingWarnings.length > 0 || materialWarnings.length > 0;
  const ruleSummary = ceilingWarnings.length > 0
    ? `${ceilingWarnings.length} 項超過硬上限`
    : `${materialWarnings.length} 項規則提醒`;

  const tagsLine = (recipe.tags ?? []).join(' · ');
  const ratingStars = starsFilled(recipe.rating);

  return (
    <div className="max-w-content mx-auto px-5 pt-4 pb-24">
      {/* 頂列 */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="btn-text text-base -ml-3" aria-label="返回上一頁">← 返回</button>
        <div className="relative -mr-3">
          <ActionMenu
            triggerLabel="配方動作"
            title={recipe.name}
            subtitle="配方操作"
            items={[
              { label: '編輯', icon: '✎', onClick: () => onEdit(recipe) },
              { label: '刪除', icon: '×', danger: true, onClick: () => onDelete(recipe.id) },
            ]}
          />
        </div>
      </div>

      {/* Header */}
      <div className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-[13px] text-ink-2 tracking-[0.08em]">
            {recipe.num}{'　'}{FRAG_CATS[recipe.fragCat]?.label ?? recipe.fragCat}
          </p>
          <StatusDot {...recipeStatusDot(recipe.status)} />
        </div>
        <h1 className="font-serif text-3xl font-light tracking-[0.08em] text-ink mt-2">{recipe.name}</h1>
        {(tagsLine || ratingStars) && (
          <p className="text-[13px] text-ink-2 mt-1.5">
            {tagsLine}
            {ratingStars && <span className={`text-accent ${tagsLine ? 'ml-2' : ''}`}>{ratingStars}</span>}
          </p>
        )}
        {hasTasks && allTasksDone && recipe.status !== 'success' && (
          <p className="text-[13px] text-accent mt-2">所有關聯工序已完成，可考慮更新狀態</p>
        )}
      </div>

      {/* Version tabs */}
      {versions.length > 1 && (
        <div className="flex mt-5 border-b border-border overflow-x-auto no-scrollbar" role="tablist" aria-label="版本">
          {versions.map((v, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === vIdx}
              onClick={() => {
                if (i === vIdx) return;
                // 切版本同時退出製作模式並清勾選（不清 storage — 那是別的版本的 key）
                setMakeMode(false);
                setChecked(new Set());
                setVIdx(i);
              }}
              className={`h-11 px-4 text-[13px] whitespace-nowrap -mb-px ${
                i === vIdx ? 'border-b-2 border-ink text-ink' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* 入庫測試／規則警告抽屜 */}
      {(hasRuleWarnings || pendingMaterials.length > 0) && (
        <div className="mt-6 border-b border-border">
          {hasRuleWarnings ? (
            <DrawerRow
              tone="error"
              label="規則警告"
              summary={ruleSummary}
              open={isOpen('tests')}
              onToggle={() => toggleDrawer('tests')}
            >
              <div className="space-y-1.5">
                {ceilingWarnings.map((w, i) => (
                  <p key={i} className="text-[13px] text-error tabular-nums">
                    {w.material.displayShort ?? w.material.name} 比例 {w.ratioPct.toFixed(1)}% 超過硬上限 {w.ceilingPct}%
                  </p>
                ))}
                {materialWarnings.map((w, i) => (
                  <p key={i} className="text-[13px] text-error">
                    {w.text}<span className="text-ink-2">（{w.source}）</span>
                  </p>
                ))}
                {pendingMaterials.length > 0 && (
                  <p className="text-[13px] text-ink-2 pt-1">
                    另有 {pendingMaterials.length} 項材料尚未測試：{pendingMaterials.map((m) => m.displayShort ?? m.name).join('、')}
                  </p>
                )}
              </div>
            </DrawerRow>
          ) : (
            <DrawerRow
              label="入庫測試"
              summary={`${pendingMaterials.length} 項材料尚未測試`}
              open={isOpen('tests')}
              onToggle={() => toggleDrawer('tests')}
            >
              <div className="border-t border-border">
                {pendingMaterials.map((m) => (
                  <div key={m.id} className="h-11 border-b border-border last:border-b-0 flex items-center justify-between gap-3">
                    <span className="text-base text-ink truncate">{m.displayShort ?? m.name}</span>
                    <span className="text-[13px] text-ink-2 shrink-0">未做</span>
                  </div>
                ))}
              </div>
            </DrawerRow>
          )}
        </div>
      )}

      {/* FORMULA 配方組成 */}
      <section className="mt-8">
        <SectionHeader kicker="FORMULA" title="配方組成" />

        {/* 總重＋換算 */}
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-ink-2 tracking-[0.1em]">總重</p>
            <p className="mt-0.5">
              <span className="text-[28px] leading-none tabular-nums text-ink">{fmtAmount(version.totalWeight)}</span>
              <span className="text-[15px] text-ink-2"> g</span>
            </p>
          </div>
          {version.totalWeight > 0 && (
            <div className="text-right">
              <div className="flex items-end gap-2 justify-end">
                <label htmlFor="scale-input" className="text-[13px] text-ink-2 pb-2.5">換算成</label>
                <input
                  id="scale-input"
                  type="text"
                  inputMode="decimal"
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  aria-label="換算目標總重"
                  className="input-underline"
                />
                <span className="text-[13px] text-ink-2 pb-2.5">g</span>
                {targetText && (
                  <button
                    type="button"
                    onClick={() => setTargetText('')}
                    className="min-w-[44px] min-h-[44px] -mr-3 flex items-center justify-center text-ink-2"
                    aria-label="清除換算"
                  >
                    ×
                  </button>
                )}
              </div>
              {factor !== 1 && (
                <p className="text-xs text-ink-2 mt-1 tabular-nums">× {fmtAmount(factor)}</p>
              )}
            </div>
          )}
        </div>

        {/* 比例條 */}
        {version.totalWeight > 0 && segs.length > 0 && (
          <div className="flex h-1.5 w-full mt-4 gap-[2px] overflow-hidden" aria-hidden="true">
            {segs.map(({ cat, weight }) => (
              <div
                key={cat}
                style={{ width: `${(weight / version.totalWeight) * 100}%`, background: ING_CAT_COLORS[cat] }}
                title={`${ING_CATS[cat].label} ${((weight / version.totalWeight) * 100).toFixed(0)}%`}
              />
            ))}
          </div>
        )}

        {/* 材料表（原始順序） */}
        <div className="border-t border-ink mt-1.5">
          {resolved.length === 0 && <p className="type-body text-ink-2 py-6 text-center">尚未加入材料</p>}
          {resolved.map((r, i) => {
            const cat = ingCatOf(r.ing.cat);
            const pct = version.totalWeight ? (r.ing.amount / version.totalWeight) * 100 : 0;
            const overCeiling = r.material?.hardCeiling != null && pct > r.material.hardCeiling;
            const sims = r.material ? similarFor(r.material) : [];
            const showSims = openSimilarFor === i;
            const rowKey = String(i);
            const isChecked = checked.has(rowKey);
            const sub = [
              ING_CATS[cat].label,
              r.material?.supplier ? supplierShort(r.material.supplier) : '',
              !r.material ? '未對應' : '',
            ].filter(Boolean).join(' · ');
            const amountClass = overCeiling ? 'text-error font-medium' : factor !== 1 ? 'text-accent' : 'text-ink';
            return (
              <div key={i} className="border-b border-border">
                <div className={`min-h-14 py-2 flex items-center gap-3 ${makeMode && isChecked ? 'opacity-50' : ''}`}>
                  {makeMode && (
                    <button
                      type="button"
                      onClick={() => toggleChecked(rowKey)}
                      aria-pressed={isChecked}
                      aria-label={`已稱 ${ingredientDisplay(r.ing, r.material)}`}
                      className="shrink-0 w-11 h-11 -ml-3 flex items-center justify-center"
                    >
                      <span
                        className="w-5 h-5 flex items-center justify-center"
                        style={isChecked ? { background: '#1A1A18' } : { border: `2px solid ${ING_CAT_COLORS[cat]}` }}
                      >
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                            <path d="M2 6 L5 9 L10 3" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  )}
                  <span aria-hidden="true" className="w-2 h-2 shrink-0" style={{ background: ING_CAT_COLORS[cat] }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-base text-ink truncate ${makeMode && isChecked ? 'line-through' : ''}`}>
                      {ingredientDisplay(r.ing, r.material)}
                    </p>
                    <p className="text-[13px] text-ink-2">
                      {sub}
                      {sims.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setOpenSimilarFor(showSims ? null : i)}
                          aria-expanded={showSims}
                          className="text-accent ml-2 py-2 -my-2"
                          aria-label={`查看同物種（${sims.length}）`}
                        >
                          同種 ×{sims.length}
                        </button>
                      )}
                    </p>
                  </div>
                  <span className="w-9 shrink-0 text-right text-ink-2 tabular-nums">
                    {factor === 1
                      ? (pct > 0 && <span className="text-[13px]">{pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%</span>)
                      : <span className="text-xs whitespace-nowrap">原 {fmtAmount(r.ing.amount)}</span>}
                  </span>
                  <span className="shrink-0 text-right whitespace-nowrap">
                    <span className={`inline-block w-[54px] text-xl tabular-nums ${amountClass}`}>
                      {fmtAmount(r.ing.amount * factor)}
                    </span>
                    <span className="text-[13px] text-ink-2"> {r.ing.unit}</span>
                  </span>
                </div>
                {showSims && sims.length > 0 && (
                  <div className="mb-3 ml-5 pl-3 border-l border-border space-y-0.5">
                    {sims.map((sm) => (
                      <p key={sm.id} className="text-[13px] text-ink-2">
                        {sm.displayShort ?? sm.name}
                        {sm.supplier && <span> ({sm.supplier})</span>}
                        {sm.qualityNote && <span> — {sm.qualityNote.slice(0, 30)}</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 按鈕區 */}
        <div className="pt-3.5 flex flex-col gap-1">
          {canMake && !makeMode && (
            <button type="button" onClick={startMake} className="btn-primary w-full tracking-[0.12em]">
              開始製作
            </button>
          )}
          {makeMode && (
            <>
              <button
                type="button"
                onClick={handleCompleteMake}
                disabled={!allChecked}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allChecked ? '完成稱料，建立工序' : `已稱 ${checked.size}/${totalItems}`}
              </button>
              <button type="button" onClick={exitMake} className="btn w-full">結束</button>
            </>
          )}
          <button type="button" onClick={() => setBurnOpen(true)} className="btn-text self-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5 C8.5 4 11.5 5.5 11.5 9.5 A3.5 3.5 0 0 1 4.5 9.5 C4.5 7.5 5.5 6.5 6.5 5.5 C6.5 7 7.2 7.8 8 8 C8 6 7.2 4 8 1.5 Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
            </svg>
            記一筆試燒
          </button>
        </div>
      </section>

      {/* 抽屜區 */}
      <div className="mt-7 border-b border-border">
        {version.notes && (
          <DrawerRow label="版本備註" open={isOpen('notes')} onToggle={() => toggleDrawer('notes')}>
            <p className="text-base text-ink leading-[1.75] whitespace-pre-wrap">{version.notes}</p>
            {(version.comments?.length ?? 0) > 0 && (
              <div className="mt-2 space-y-0.5">
                {version.comments.map((c, i) => (
                  <p key={i} className="text-xs text-ink-2">{c}</p>
                ))}
              </div>
            )}
          </DrawerRow>
        )}

        {hasProcess && (
          <DrawerRow
            label="工序標記"
            summary={processFlags.join('、')}
            open={isOpen('process')}
            onToggle={() => toggleDrawer('process')}
          >
            {processFlags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {processFlags.map((f) => (
                  <span key={f} className="border border-border text-[13px] text-ink px-2 py-0.5">{f}</span>
                ))}
              </div>
            )}
            {recipe.process?.notes && <p className="text-base text-ink whitespace-pre-wrap">{recipe.process.notes}</p>}
          </DrawerRow>
        )}

        {timelineItems.length > 0 && (
          <DrawerRow
            label="時間軸"
            summary={timelineItems.join('、')}
            open={isOpen('timeline')}
            onToggle={() => toggleDrawer('timeline')}
          >
            <div className="grid grid-cols-2 border-t border-border">
              {tl?.makeDate && <TimelineCell label="製作日期" value={tl.makeDate} />}
              {(tl?.dryDays ?? 0) > 0 && <TimelineCell label="乾燥天數" value={`${tl.dryDays} 天`} />}
              {tl?.agingStart && <TimelineCell label="陳化開始" value={tl.agingStart} />}
              {tl?.agingNotes && <TimelineCell label="陳化備註" value={tl.agingNotes} wide />}
            </div>
          </DrawerRow>
        )}

        {burnLog.length > 0 && (
          <DrawerRow
            label="試燒紀錄"
            count={burnLog.length}
            summary={burnSummary}
            open={isOpen('burn')}
            onToggle={() => toggleDrawer('burn')}
          >
            <BurnLog burnLog={burnLog} />
          </DrawerRow>
        )}

        {relatedTasks.length > 0 && (
          <DrawerRow
            label="相關工序"
            count={relatedTasks.length}
            summary={taskSummary}
            open={isOpen('tasks')}
            onToggle={() => toggleDrawer('tasks')}
          >
            <RelatedTasks recipeId={recipe.id} tasks={tasks} onTaskClick={onTaskTab} />
          </DrawerRow>
        )}
      </div>

      {burnOpen && <BurnForm onSave={handleBurnSave} onCancel={() => setBurnOpen(false)} />}
    </div>
  );
}

function TimelineCell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`py-3 border-b border-border ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className="text-base text-ink tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
