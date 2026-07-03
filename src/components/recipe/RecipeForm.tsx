import { useState, useRef, useEffect } from 'react';
import type { Recipe, FragCat, RecipeStatus, IngredientCat, Ingredient, Version, Material } from '../../types';
import { FRAG_CATS, ING_CATS, RECIPE_STATUS } from '../../utils/constants';
import { speciesGroupLabel } from '../../utils/species';
import { todayISO } from '../../utils/date';
import { versionTag } from '../../utils/id';
import { useToast } from '../shared/Toast';

interface Props {
  initial?: Recipe;
  nextId: number;
  /** v2.1: 整個 Material[] 用於 autocomplete + materialId 寫回 */
  materials: Material[];
  fragCat?: FragCat;
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

interface Suggestion {
  material: Material;
  score: number;
  hitField: 'name' | 'displayShort' | 'alias' | 'species';
}

function scoreSuggestion(query: string, mat: Material): Suggestion | null {
  const q = query.trim();
  if (!q) return null;
  const lo = q.toLowerCase();

  // 完全相符 / startsWith / 子字串 三層分數
  function compare(src: string | undefined, tag: Suggestion['hitField']): Suggestion | null {
    if (!src) return null;
    const s = src.toLowerCase();
    if (s === lo) return { material: mat, score: 100, hitField: tag };
    if (s.startsWith(lo)) return { material: mat, score: 80, hitField: tag };
    if (s.includes(lo)) return { material: mat, score: 60, hitField: tag };
    return null;
  }

  // 試各欄位，取最高分
  const candidates = [
    compare(mat.name, 'name'),
    compare(mat.displayShort, 'displayShort'),
    compare(mat.species, 'species'),
    ...(mat.aliases ?? []).map((a) => compare(a, 'alias')),
  ].filter((c): c is Suggestion => c !== null);
  if (!candidates.length) return null;

  // 取最高分；同分時 alias 略低於 displayShort/name
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function emptyVersion(): Version {
  return { label: '主版', totalWeight: 20, ingredients: [], notes: '', comments: [] };
}

function emptyRecipe(nextId: number, fragCat: FragCat = 'test'): Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    num: versionTag(nextId),
    name: '',
    fragCat,
    status: 'pending',
    rating: 0,
    tags: [],
    process: { tincture: false, ferment: false, wine: false, notes: '' },
    timeline: { makeDate: todayISO(), dryDays: 5, agingStart: '', agingNotes: '' },
    versions: [emptyVersion()],
    burnLog: [],
  };
}

export function RecipeForm({ initial, nextId, materials, fragCat, onSave, onCancel }: Props) {
  const raw = initial ?? emptyRecipe(nextId, fragCat);
  const init = {
    ...raw,
    tags: raw.tags ?? [],
    timeline: raw.timeline ?? { makeDate: '', dryDays: 0, agingStart: '', agingNotes: '' },
    process: raw.process ?? { tincture: false, ferment: false, wine: false, notes: '' },
    versions: raw.versions?.length ? raw.versions : [emptyVersion()],
    burnLog: raw.burnLog ?? [],
  };
  const toast = useToast();
  const [form, setForm] = useState<Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>>(init);
  const [vIdx, setVIdx] = useState(0);
  const [tagInput, setTagInput] = useState((init.tags ?? []).join(', '));
  const [matSuggestions, setMatSuggestions] = useState<Suggestion[]>([]);
  const [activeIngIdx, setActiveIngIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (blurTimerRef.current != null) {
      clearTimeout(blurTimerRef.current);
    }
  }, []);

  const version = form.versions[vIdx];

  function setF<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setVersion(updates: Partial<Version>) {
    const versions = form.versions.map((v, i) => i === vIdx ? { ...v, ...updates } : v);
    setF('versions', versions);
  }

  function addIngredient() {
    const ing: Ingredient = { cat: 'base', name: '', amount: 0, unit: 'g' };
    setVersion({ ingredients: [...version.ingredients, ing] });
  }

  function updateIngredient(i: number, updates: Partial<Ingredient>) {
    const ingredients = version.ingredients.map((ing, idx) => idx === i ? { ...ing, ...updates } : ing);
    setVersion({ ingredients });
  }

  function removeIngredient(i: number) {
    setVersion({ ingredients: version.ingredients.filter((_, idx) => idx !== i) });
  }

  function handleIngNameInput(i: number, val: string) {
    // 用戶手打名稱 → 清掉舊 materialId（除非選到候選才設回）
    updateIngredient(i, { name: val, materialId: undefined });
    setActiveIngIdx(i);
    if (val.trim().length < 1) { setMatSuggestions([]); return; }
    const list = materials
      .map((m) => scoreSuggestion(val, m))
      .filter((s): s is Suggestion => s !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    setMatSuggestions(list);
  }

  function pickSuggestion(i: number, sug: Suggestion) {
    updateIngredient(i, {
      materialId: sug.material.id,
      name: sug.material.name,           // 用 material 的完整三段式名（snapshot）
      cat: sug.material.cat,             // 自動同步 cat
    });
    setMatSuggestions([]);
  }

  function addVersion() {
    setF('versions', [...form.versions, { ...emptyVersion(), label: `版本 ${form.versions.length + 1}` }]);
    setVIdx(form.versions.length);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.name.trim()) {
      setNameError(true);
      toast.error('請填寫配方名稱');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ ...form, tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean) });
      toast.success(initial ? '配方已更新' : '配方已新增');
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="type-meta py-2 -ml-2 px-2"
          aria-label="返回上一頁"
        >
          ← 返回
        </button>
        <h1 className="type-title">{initial ? '編輯配方' : '新增配方'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1">編號</label>
            <input value={form.num} onChange={(e) => setF('num', e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="recipe-name" className="section-label block mb-1">名稱 *</label>
            <input
              id="recipe-name"
              required
              aria-required="true"
              aria-invalid={nameError}
              value={form.name}
              onChange={(e) => { setF('name', e.target.value); if (nameError && e.target.value.trim()) setNameError(false); }}
              className={`input-field ${nameError ? 'border-error' : ''}`}
            />
            {nameError && (
              <p className="text-xs text-error font-light mt-1">請填寫配方名稱</p>
            )}
          </div>
          <div>
            <label className="section-label block mb-1">香氣分類</label>
            <select value={form.fragCat} onChange={(e) => setF('fragCat', e.target.value as FragCat)} className="input-field">
              {(Object.keys(FRAG_CATS) as FragCat[]).map((k) => (
                <option key={k} value={k}>{FRAG_CATS[k].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="section-label block mb-1">狀態</label>
            <select value={form.status} onChange={(e) => setF('status', e.target.value as RecipeStatus)} className="input-field">
              {(Object.keys(RECIPE_STATUS) as RecipeStatus[]).map((k) => (
                <option key={k} value={k}>{RECIPE_STATUS[k].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="section-label block mb-1">標籤（逗號分隔）</label>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="input-field" placeholder="例：供香, 試驗" />
        </div>

        {/* Timeline */}
        <div className="border-t border-border pt-4">
          <p className="section-label mb-3">時間軸</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">製作日期</label>
              <input type="date" value={form.timeline.makeDate} onChange={(e) => setF('timeline', { ...form.timeline, makeDate: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">乾燥天數</label>
              <input type="number" value={form.timeline.dryDays} onChange={(e) => setF('timeline', { ...form.timeline, dryDays: Number(e.target.value) })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">陳化開始</label>
              <input type="date" value={form.timeline.agingStart} onChange={(e) => setF('timeline', { ...form.timeline, agingStart: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">陳化備注</label>
              <input value={form.timeline.agingNotes} onChange={(e) => setF('timeline', { ...form.timeline, agingNotes: e.target.value })} className="input-field" />
            </div>
          </div>
        </div>

        {/* Process */}
        <div className="border-t border-border pt-4">
          <p className="section-label mb-3">工序標記</p>
          <div className="flex gap-4 mb-2">
            {(['tincture', 'ferment', 'wine'] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5 text-xs text-ink-2 cursor-pointer">
                <input type="checkbox" checked={form.process[k]} onChange={(e) => setF('process', { ...form.process, [k]: e.target.checked })} className="accent-accent" />
                {k === 'tincture' ? '酊劑' : k === 'ferment' ? '發酵' : '酒媒'}
              </label>
            ))}
          </div>
          <textarea value={form.process.notes} onChange={(e) => setF('process', { ...form.process, notes: e.target.value })} className="input-field h-16 resize-none" placeholder="工序備注" />
        </div>

        {/* Versions */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 mb-3">
            <p className="section-label">版本</p>
            <button type="button" onClick={addVersion} className="btn text-xs">+ 新版本</button>
          </div>

          {form.versions.length > 1 && (
            <div className="flex gap-0 mb-4 border-b border-border overflow-x-auto">
              {form.versions.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVIdx(i)}
                  className={`px-3 py-2 text-xs font-light tracking-label whitespace-nowrap ${i === vIdx ? 'border-b-2 border-ink text-ink -mb-px' : 'text-ink-2'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="section-label block mb-1">版本標題</label>
              <input value={version.label} onChange={(e) => setVersion({ label: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">總重 (g)</label>
              <input type="number" value={version.totalWeight} onChange={(e) => setVersion({ totalWeight: Number(e.target.value) })} className="input-field" />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2 mb-3">
            {version.ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_80px_60px_28px] gap-2 items-start">
                <select value={ing.cat} onChange={(e) => updateIngredient(i, { cat: e.target.value as IngredientCat })} className="input-field text-xs">
                  {(Object.keys(ING_CATS) as IngredientCat[]).map((c) => <option key={c} value={c}>{ING_CATS[c].label}</option>)}
                </select>
                <div className="relative">
                  <input
                    value={ing.name}
                    onChange={(e) => handleIngNameInput(i, e.target.value)}
                    onFocus={() => setActiveIngIdx(i)}
                    onBlur={() => {
                      if (blurTimerRef.current != null) clearTimeout(blurTimerRef.current);
                      blurTimerRef.current = window.setTimeout(() => {
                        setMatSuggestions([]);
                        blurTimerRef.current = null;
                      }, 150);
                    }}
                    placeholder="材料名"
                    className="input-field text-xs w-full"
                    aria-label={`材料 ${i + 1} 名稱`}
                  />
                  {ing.materialId && (
                    <span
                      className="absolute right-1 top-1/2 -translate-y-1/2 type-micro text-accent pointer-events-none"
                      title={`已對應 ${ing.materialId}`}
                    >
                      ✓
                    </span>
                  )}
                  {activeIngIdx === i && matSuggestions.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 top-full bg-bg border border-border max-h-64 overflow-y-auto">
                      {matSuggestions.map((s) => (
                        <button
                          key={s.material.id}
                          type="button"
                          onMouseDown={() => pickSuggestion(i, s)}
                          className="w-full text-left px-2 py-1.5 hover:bg-card border-b border-border/50 last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="type-micro text-ink-3">{s.material.id}</span>
                            <span className="text-xs font-light text-ink truncate">
                              {s.material.displayShort ?? s.material.name}
                            </span>
                            {s.material.supplier && (
                              <span className="type-micro text-ink-3 ml-auto shrink-0">{s.material.supplier}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.material.species && (
                              <span className="type-micro text-ink-3 italic truncate">{s.material.species}</span>
                            )}
                            {s.material.speciesGroup && (
                              <span className="type-micro text-ink-3">· {speciesGroupLabel(s.material.speciesGroup)}</span>
                            )}
                            {(s.material.testStatus ?? 'pending') === 'pending' && (
                              <span className="type-micro text-error">· 待測</span>
                            )}
                            {s.hitField !== 'name' && s.hitField !== 'displayShort' && (
                              <span className="type-micro text-accent ml-auto shrink-0">
                                {s.hitField === 'alias' ? '別名' : '學名'}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      <p className="type-micro text-ink-3 px-2 py-1 bg-card">
                        找不到？打完整名稱直接送出，新材料請先到材料庫建立
                      </p>
                    </div>
                  )}
                </div>
                <input type="number" value={ing.amount} onChange={(e) => updateIngredient(i, { amount: Number(e.target.value) })} placeholder="用量" className="input-field text-xs" step="0.1" />
                <input value={ing.unit} onChange={(e) => updateIngredient(i, { unit: e.target.value })} placeholder="g" className="input-field text-xs" />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="text-ink-4 hover:text-error text-sm min-w-[28px] min-h-[28px]"
                  aria-label={`移除第 ${i + 1} 項材料`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addIngredient} className="btn text-xs mb-4">+ 新增材料</button>

          <div>
            <label className="section-label block mb-1">版本備注</label>
            <textarea value={version.notes} onChange={(e) => setVersion({ notes: e.target.value })} className="input-field h-20 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="btn text-xs disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  );
}
