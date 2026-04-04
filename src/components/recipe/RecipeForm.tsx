import { useState } from 'react';
import type { Recipe, FragCat, RecipeStatus, IngredientCat, Ingredient, Version } from '../../types';
import { FRAG_CATS, ING_CATS, RECIPE_STATUS } from '../../utils/constants';
import { todayISO } from '../../utils/date';

interface Props {
  initial?: Recipe;
  nextId: number;
  materialNames: string[];
  fragCat?: FragCat;
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

function emptyVersion(): Version {
  return { label: '主版', totalWeight: 20, ingredients: [], notes: '', comments: [] };
}

function emptyRecipe(nextId: number, fragCat: FragCat = 'test'): Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    num: `V-${String.fromCharCode(64 + (nextId % 26 || 26))}`,
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

export function RecipeForm({ initial, nextId, materialNames, fragCat, onSave, onCancel }: Props) {
  const raw = initial ?? emptyRecipe(nextId, fragCat);
  const init = {
    ...raw,
    tags: raw.tags ?? [],
    timeline: raw.timeline ?? { makeDate: '', dryDays: 0, agingStart: '', agingNotes: '' },
    process: raw.process ?? { tincture: false, ferment: false, wine: false, notes: '' },
    versions: raw.versions?.length ? raw.versions : [emptyVersion()],
    burnLog: raw.burnLog ?? [],
  };
  const [form, setForm] = useState<Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>>(init);
  const [vIdx, setVIdx] = useState(0);
  const [tagInput, setTagInput] = useState((init.tags ?? []).join(', '));
  const [matSuggestions, setMatSuggestions] = useState<string[]>([]);
  const [activeIngIdx, setActiveIngIdx] = useState<number | null>(null);

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
    updateIngredient(i, { name: val });
    setActiveIngIdx(i);
    if (val.length < 1) { setMatSuggestions([]); return; }
    setMatSuggestions(materialNames.filter((n) => n.includes(val)).slice(0, 5));
  }

  function addVersion() {
    setF('versions', [...form.versions, { ...emptyVersion(), label: `版本 ${form.versions.length + 1}` }]);
    setVIdx(form.versions.length);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave({ ...form, tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean) });
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-ink-2 text-sm font-light">← 返回</button>
        <h1 className="font-serif text-xl text-ink">{initial ? '編輯配方' : '新增配方'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1">編號</label>
            <input value={form.num} onChange={(e) => setF('num', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="section-label block mb-1">名稱 *</label>
            <input required value={form.name} onChange={(e) => setF('name', e.target.value)} className="input-field" />
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
                    onBlur={() => setTimeout(() => setMatSuggestions([]), 150)}
                    placeholder="材料名"
                    className="input-field text-xs w-full"
                  />
                  {activeIngIdx === i && matSuggestions.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 top-full bg-bg border border-border">
                      {matSuggestions.map((s) => (
                        <button key={s} type="button" onMouseDown={() => { updateIngredient(i, { name: s }); setMatSuggestions([]); }} className="w-full text-left px-2 py-1.5 text-xs font-light hover:bg-card">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" value={ing.amount} onChange={(e) => updateIngredient(i, { amount: Number(e.target.value) })} placeholder="用量" className="input-field text-xs" step="0.1" />
                <input value={ing.unit} onChange={(e) => updateIngredient(i, { unit: e.target.value })} placeholder="g" className="input-field text-xs" />
                <button type="button" onClick={() => removeIngredient(i)} className="text-ink-4 hover:text-error text-sm">×</button>
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
          <button type="button" onClick={onCancel} className="btn text-xs">取消</button>
          <button type="submit" className="btn-primary text-xs">儲存</button>
        </div>
      </form>
    </div>
  );
}
