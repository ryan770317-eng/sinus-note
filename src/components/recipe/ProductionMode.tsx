import { useEffect, useRef, useState } from 'react';
import type { Recipe, Version, IngredientCat } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { fmtAmount } from '../../utils/format';
import { ingredientDisplay } from '../../utils/ingredient';
import { useWakeLock } from '../../hooks/useWakeLock';
import { DrawerRow } from '../shared/DrawerRow';
import type { ResolvedIngredient } from './RecipeDetail';

interface Props {
  recipe: Recipe;
  version: Version;
  /** 依材料原始順序解析後的清單 */
  resolved: ResolvedIngredient[];
  /** 換算倍率（1 = 原量） */
  factor: number;
  /** 換算目標總重；null = 原量 */
  targetWeight: number | null;
  /** 已勾選的材料原始索引（字串） */
  checked: Set<string>;
  onToggle: (key: string) => void;
  /** 結束（回詳情） */
  onExit: () => void;
  /** 完成稱料，建立工序（成功由呼叫端退出；失敗留在本畫面） */
  onComplete: () => Promise<void>;
}

const BODY_CLASS = 'production-mode';

const catOf = (cat: IngredientCat): IngredientCat => (cat in ING_CATS ? cat : 'herb');

/** 製作核對（ProductionV2）：全螢幕蓋過底部導覽，一次只看「這一步」。 */
export function ProductionMode({ recipe, version, resolved, factor, targetWeight, checked, onToggle, onExit, onComplete }: Props) {
  const { active: wakeActive, supported: wakeSupported } = useWakeLock();
  const rootRef = useRef<HTMLDivElement>(null);
  const [doneOpenState, setDoneOpenState] = useState<boolean | null>(null);
  const [completing, setCompleting] = useState(false);

  // 捲動鎖＋隱藏底部導覽＋初始焦點
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add(BODY_CLASS);
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);

  // Esc ＝ 結束
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit]);

  const items = resolved.map((r, i) => {
    const cat = catOf(r.ing.cat);
    return {
      key: String(i),
      name: ingredientDisplay(r.ing, r.material),
      cat,
      color: ING_CAT_COLORS[cat],
      amount: fmtAmount(r.ing.amount * factor),
      original: fmtAmount(r.ing.amount),
      unit: r.ing.unit,
    };
  });
  const done = items.filter((it) => checked.has(it.key));
  const todo = items.filter((it) => !checked.has(it.key));
  const now = todo[0];
  const upcoming = todo.slice(1);
  const allChecked = items.length > 0 && todo.length === 0;
  const doneOpen = doneOpenState ?? allChecked;

  const batchLabel = targetWeight != null && factor !== 1
    ? `${fmtAmount(targetWeight)} g 批次`
    : `${fmtAmount(version.totalWeight)} g 原量`;

  async function handleComplete() {
    if (completing) return;
    setCompleting(true);
    try {
      await onComplete();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="製作核對"
      className="fixed inset-0 z-[80] bg-bg flex flex-col outline-none"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* 頂列 */}
      <div className="h-14 px-5 shrink-0 flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="btn border border-border px-4">結束</button>
        <div className="min-w-0 text-center">
          <p className="font-serif text-base tracking-[0.06em] text-ink truncate">{recipe.name}</p>
          <p className="text-xs text-ink-2 tabular-nums">{batchLabel}</p>
        </div>
        <p className="shrink-0 tabular-nums" aria-label={`已稱 ${done.length} / ${items.length}`}>
          <span className="text-xl text-ink">{done.length}</span>
          <span className="text-[15px] text-ink-2"> / {items.length}</span>
        </p>
      </div>

      {/* 進度 */}
      <div
        className="grid gap-[3px] px-5 pt-1 shrink-0"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-label="稱料進度"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done.length}
      >
        {items.map((it, i) => (
          <span key={it.key} className={`h-[3px] ${i < done.length ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      {/* 主體 */}
      <div className="px-5 pt-4 pb-6 flex-grow overflow-y-auto">
        {done.length > 0 && (
          <div className="border-b border-border">
            <DrawerRow
              icon={<CheckBadge />}
              label="已稱"
              count={done.length}
              summary={done.map((it) => `${it.name} ${it.amount} ${it.unit}`).join('、')}
              open={doneOpen}
              onToggle={() => setDoneOpenState(!doneOpen)}
            >
              <div className="border-t border-border">
                {done.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => onToggle(it.key)}
                    aria-pressed={true}
                    aria-label={`取消已稱 ${it.name}`}
                    className="w-full h-14 border-b border-border last:border-b-0 flex items-center justify-between gap-3 text-left"
                  >
                    <span className="text-base text-ink-2 line-through truncate">{it.name}</span>
                    <span className="text-base text-ink tabular-nums shrink-0">{it.amount} {it.unit}</span>
                  </button>
                ))}
              </div>
            </DrawerRow>
          </div>
        )}

        {/* NOW 這一步 */}
        <h2 className="kicker pt-6 pb-2.5">NOW<span className="ml-2.5 tracking-[0.1em]">這一步</span></h2>
        {now ? (
          <div className="h-[120px] bg-card border-l-[3px] flex items-center gap-4 px-4" style={{ borderLeftColor: now.color }}>
            <button
              type="button"
              onClick={() => onToggle(now.key)}
              aria-pressed={false}
              aria-label={`已稱 ${now.name}`}
              className="w-14 h-14 shrink-0 bg-bg border-2"
              style={{ borderColor: now.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-2xl tracking-[0.04em] text-ink truncate">{now.name}</p>
              <p className="text-[13px] text-ink-2 mt-0.5">{ING_CATS[now.cat].label}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap">
                <span className="text-[40px] leading-none tabular-nums text-ink">{now.amount}</span>
                <span className="text-base text-ink-2"> {now.unit}</span>
              </p>
              {factor !== 1 && <p className="text-xs text-ink-2 mt-1 tabular-nums">原 {now.original} {now.unit}</p>}
            </div>
          </div>
        ) : (
          <div className="bg-card px-4 py-5">
            <p className="text-base text-ink">全部稱好了</p>
            <p className="text-[13px] text-ink-2 mt-1">按下方按鈕建立稱量工序</p>
          </div>
        )}

        {/* NEXT 接下來 */}
        {upcoming.length > 0 && (
          <>
            <h2 className="kicker pt-7 pb-1">NEXT<span className="ml-2.5 tracking-[0.1em]">接下來</span></h2>
            <div className="border-t border-border">
              {upcoming.map((it) => (
                <div key={it.key} className="h-[88px] border-b border-border flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onToggle(it.key)}
                    aria-pressed={false}
                    aria-label={`已稱 ${it.name}`}
                    className="w-12 h-12 shrink-0 bg-bg border-2"
                    style={{ borderColor: it.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-xl text-ink truncate">{it.name}</p>
                    <p className="text-[13px] text-ink-2">{ING_CATS[it.cat].label}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="whitespace-nowrap">
                      <span className="text-[32px] leading-none tabular-nums text-ink">{it.amount}</span>
                      <span className="text-[15px] text-ink-2"> {it.unit}</span>
                    </p>
                    {factor !== 1 && <p className="text-xs text-ink-2 mt-1 tabular-nums">原 {it.original} {it.unit}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 底列 */}
      <div className="shrink-0 border-t border-border px-5 pb-[env(safe-area-inset-bottom)]">
        <div className="h-[72px] flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] text-ink-2">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 shrink-0"
              style={{ background: wakeSupported && wakeActive ? '#5f7a5f' : '#D6CFC4' }}
            />
            {wakeSupported ? '螢幕保持常亮' : '無法保持常亮'}
          </p>
          {allChecked ? (
            <button type="button" onClick={handleComplete} disabled={completing} className="btn-primary disabled:opacity-50">
              {completing ? '建立中…' : '完成稱料，建立工序'}
            </button>
          ) : (
            <button type="button" disabled className="h-12 px-5 bg-border text-ink-2 font-medium tabular-nums cursor-not-allowed">
              還有 {todo.length} 項
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <span className="w-5 h-5 flex items-center justify-center bg-ink" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M2 6 L5 9 L10 3" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
