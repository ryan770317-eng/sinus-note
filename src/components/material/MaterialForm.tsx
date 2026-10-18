import { useEffect, useRef, useState } from 'react';
import type { Material, IngredientCat, MaterialTestStatus } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { SPECIES_GROUP_OPTIONS } from '../../utils/species';
import { composeMaterialName, splitMaterialName } from '../../utils/materialName';
import { useToast } from '../shared/useToast';
import { BottomSheet } from '../shared/BottomSheet';
import { DrawerRow } from '../shared/DrawerRow';

interface Props {
  /** 編輯中的材料；null = 新增 */
  editing: Material | null;
  /** 新增時預設分類 */
  defaultCat: IngredientCat;
  /** 全部材料（供應商建議列用） */
  materials: Material[];
  onAdd: (mat: Omit<Material, 'id'>) => Promise<Material>;
  onUpdate: (id: string, updates: Partial<Material>) => Promise<void>;
  onClose: () => void;
  /** 新增成功（父層據此決定是否彈入庫測試 SOP） */
  onCreated: (mat: Material) => void;
}

const CATS = Object.keys(ING_CATS) as IngredientCat[];
const UNIT_OPTIONS = ['g', 'kg', 'ml', '滴', '顆'];
const FORM_ID = 'material-form';

type FormState = Omit<Material, 'id'>;

const emptyForm = (cat: IngredientCat): FormState => ({
  cat,
  name: '',
  origin: '',
  supplier: '',
  note: '',
  stock: { qty: 0, unit: 'g', note: '' },
  displayShort: '',
  species: '',
  speciesGroup: '',
  grade: '',
  qualityNote: '',
  aliases: [],
  v3Warnings: [],
  hardCeiling: undefined,
  testStatus: 'pending',
});

function formFromMaterial(mat: Material): FormState {
  return {
    cat: mat.cat,
    name: mat.name,
    origin: mat.origin,
    supplier: mat.supplier,
    note: mat.note,
    stock: { ...mat.stock },
    displayShort: mat.displayShort ?? '',
    species: mat.species ?? '',
    speciesGroup: mat.speciesGroup ?? '',
    grade: mat.grade ?? '',
    qualityNote: mat.qualityNote ?? '',
    aliases: mat.aliases ?? [],
    v3Warnings: mat.v3Warnings ?? [],
    hardCeiling: mat.hardCeiling,
    testStatus: mat.testStatus ?? 'pending',
    // 帶回原值，否則儲存時會把首次入庫時間洗成 null
    addedAt: mat.addedAt,
  };
}

const labelClass = 'block text-[13px] text-ink-2 mb-1.5';

/** 新增／編輯材料（Materials 畫板 bottom sheet）：主要五欄＋「更多欄位」抽屜。 */
export function MaterialForm({ editing, defaultCat, materials, onAdd, onUpdate, onClose, onCreated }: Props) {
  const toast = useToast();
  const editId = editing?.id ?? null;
  const [form, setForm] = useState<FormState>(() => (editing ? formFromMaterial(editing) : emptyForm(defaultCat)));
  // 品名（三段式名稱由品名＋供應商＋品級/產地自動組合）
  const [productName, setProductName] = useState(() => (editing ? splitMaterialName(editing.name).product : ''));
  const [aliasesText, setAliasesText] = useState(() => (editing?.aliases ?? []).join('\n'));
  const [warningsText, setWarningsText] = useState(() => (editing?.v3Warnings ?? []).join('\n'));
  // 數字欄位用字串編輯，送出時才轉數字（避免 type=number 的 0 與游標問題）
  const [qtyText, setQtyText] = useState(() => (editing && editing.stock.qty ? String(editing.stock.qty) : ''));
  const [ceilingText, setCeilingText] = useState(() => (editing?.hardCeiling != null ? String(editing.hardCeiling) : ''));
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [supplierFocus, setSupplierFocus] = useState(false);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (blurTimerRef.current != null) clearTimeout(blurTimerRef.current);
  }, []);

  function setF<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // 供應商建議：去重＋使用次數，含輸入字的前 5 筆
  const supplierTerm = form.supplier.trim().toLowerCase();
  const supplierCounts = new Map<string, number>();
  for (const m of materials) {
    if (m.supplier && m.supplier !== '—') supplierCounts.set(m.supplier, (supplierCounts.get(m.supplier) ?? 0) + 1);
  }
  const supplierSuggestions = supplierTerm
    ? Array.from(supplierCounts.entries())
        .filter(([s]) => s.toLowerCase().includes(supplierTerm) && s !== form.supplier)
        .slice(0, 5)
    : [];

  const unitOptions = UNIT_OPTIONS.includes(form.stock.unit) || !form.stock.unit
    ? UNIT_OPTIONS
    : [...UNIT_OPTIONS, form.stock.unit];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // 驗證：品名不空
    if (!productName.trim()) {
      setNameError('請填寫品名');
      toast.error('請填寫品名');
      return;
    }

    // 三段式名稱自動組合（第三段：grade 優先，沒 grade 用 origin — 定案）
    const composedName = composeMaterialName(productName, form.supplier, form.grade?.trim() || form.origin);

    // 整理 aliases / v3Warnings 從 textarea 拆行
    const aliases = aliasesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const v3Warnings = warningsText.split('\n').map((s) => s.trim()).filter(Boolean);

    // 編輯改名保護：舊 name 加進 aliases，否則配方鬼影靠 name/aliases 比對回連會斷鏈
    // （見 RecipeDetail.resolveMaterial）
    if (editId && composedName !== form.name && form.name.trim() && !aliases.includes(form.name)) {
      aliases.push(form.name);
    }

    const ceilingNum = ceilingText.trim() === '' ? undefined : Number(ceilingText.replace(',', '.'));

    const payload: Omit<Material, 'id'> = {
      ...form,
      name: composedName,
      stock: { ...form.stock, qty: Number(qtyText.replace(',', '.')) || 0 },
      // 把空字串轉 undefined（清空時不要寫入空字串）
      displayShort: form.displayShort?.trim() || undefined,
      species:      form.species?.trim() || undefined,
      speciesGroup: form.speciesGroup?.trim() || undefined,
      grade:        form.grade?.trim() || undefined,
      qualityNote:  form.qualityNote?.trim() || undefined,
      aliases:      aliases.length ? aliases : undefined,
      v3Warnings:   v3Warnings.length ? v3Warnings : undefined,
      hardCeiling:  (ceilingNum != null && !Number.isNaN(ceilingNum) ? ceilingNum : undefined) || undefined,
      testStatus:   form.testStatus ?? 'pending',
      updatedAt:    new Date().toISOString(),
      addedAt:      editId ? form.addedAt : new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (editId) {
        await onUpdate(editId, payload);
        toast.success('材料已更新');
        onClose();
      } else {
        const created = await onAdd(payload);
        toast.success('材料已新增');
        onClose();
        onCreated(created);
      }
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      title={editId ? '編輯材料' : '新增材料'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn disabled:opacity-50">取消</button>
          <button type="submit" form={FORM_ID} disabled={submitting} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? '儲存中…' : '儲存'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* 1. 分類 */}
        <div>
          <label htmlFor="mat-cat" className={labelClass}>分類</label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 pointer-events-none"
              style={{ background: ING_CAT_COLORS[form.cat] }}
            />
            <select
              id="mat-cat"
              value={form.cat}
              onChange={(e) => setF('cat', e.target.value as IngredientCat)}
              className="input-field pl-[34px] pr-9 appearance-none"
            >
              {CATS.map((c) => <option key={c} value={c}>{ING_CATS[c].label}</option>)}
            </select>
            <span aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-2 pointer-events-none">▾</span>
          </div>
        </div>

        {/* 2. 品名 */}
        <div>
          <label htmlFor="mat-name" className={labelClass}>品名 *</label>
          <input
            id="mat-name"
            required
            aria-required="true"
            aria-invalid={!!nameError}
            value={productName}
            onChange={(e) => { setProductName(e.target.value); if (nameError) setNameError(''); }}
            placeholder="例：沉香粉"
            className={`input-field ${nameError ? 'border-error' : ''}`}
          />
          {nameError && <p className="text-[13px] text-error mt-1">{nameError}</p>}
        </div>

        {/* 3. 供應商（自製建議列） */}
        <div className="relative">
          <label htmlFor="mat-supplier" className={labelClass}>供應商</label>
          <input
            id="mat-supplier"
            value={form.supplier}
            onChange={(e) => setF('supplier', e.target.value)}
            onFocus={() => setSupplierFocus(true)}
            onBlur={() => {
              if (blurTimerRef.current != null) clearTimeout(blurTimerRef.current);
              blurTimerRef.current = window.setTimeout(() => {
                setSupplierFocus(false);
                blurTimerRef.current = null;
              }, 150);
            }}
            autoComplete="off"
            className="input-field"
          />
          {supplierFocus && supplierSuggestions.length > 0 && (
            <div className="border-[1.5px] border-ink border-t-0 bg-card" role="listbox" aria-label="供應商建議">
              {supplierSuggestions.map(([s, n]) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => { setF('supplier', s); setSupplierFocus(false); }}
                  className="w-full h-10 px-3.5 flex items-center justify-between gap-3 text-left text-base text-ink hover:bg-bg"
                >
                  <span className="truncate">{s}</span>
                  <span className="text-xs text-ink-2 shrink-0 tabular-nums">已用 {n} 次</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. 產地或品級 */}
        <div>
          <label htmlFor="mat-origin" className={labelClass}>產地或品級</label>
          <input
            id="mat-origin"
            value={form.origin}
            onChange={(e) => setF('origin', e.target.value)}
            placeholder="例：越南、A 級"
            className="input-field"
          />
        </div>

        {/* 5. 庫存量 */}
        <div>
          <label htmlFor="mat-qty" className={labelClass}>庫存量</label>
          <div className="flex gap-2">
            <input
              id="mat-qty"
              type="text"
              inputMode="decimal"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              className="input-field text-lg tabular-nums"
            />
            <select
              aria-label="庫存單位"
              value={form.stock.unit}
              onChange={(e) => setF('stock', { ...form.stock, unit: e.target.value })}
              className="input-field w-24 shrink-0"
            >
              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* 更多欄位 */}
        <div className="border-b border-border">
          <DrawerRow
            label="更多欄位"
            summary="顯示簡稱、學名、物種分組、品級、別名、警告、硬上限、測試狀態、備註"
            open={moreOpen}
            onToggle={() => setMoreOpen((o) => !o)}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="mat-short" className={labelClass}>顯示簡稱</label>
                <input
                  id="mat-short"
                  value={form.displayShort ?? ''}
                  onChange={(e) => setF('displayShort', e.target.value)}
                  placeholder="≤ 6 字（配方表用）"
                  maxLength={12}
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="mat-species" className={labelClass}>學名</label>
                <input
                  id="mat-species"
                  value={form.species ?? ''}
                  onChange={(e) => setF('species', e.target.value)}
                  placeholder="例：Boswellia sacra"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="mat-group" className={labelClass}>物種分組</label>
                <input
                  id="mat-group"
                  value={form.speciesGroup ?? ''}
                  onChange={(e) => setF('speciesGroup', e.target.value)}
                  placeholder="例：frankincense"
                  list="species-group-options"
                  className="input-field"
                />
                <datalist id="species-group-options">
                  {SPECIES_GROUP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="mat-grade" className={labelClass}>品級</label>
                <input
                  id="mat-grade"
                  value={form.grade ?? ''}
                  onChange={(e) => setF('grade', e.target.value)}
                  placeholder="例：皇家綠 / 黑原脂"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="mat-note" className={labelClass}>特性備註</label>
                <textarea id="mat-note" value={form.note} onChange={(e) => setF('note', e.target.value)} className="input-field h-20 resize-none" />
              </div>
              <div>
                <label htmlFor="mat-quality" className={labelClass}>品質筆記（含評分）</label>
                <textarea
                  id="mat-quality"
                  value={form.qualityNote ?? ''}
                  onChange={(e) => setF('qualityNote', e.target.value)}
                  placeholder="例：8/10 — 開瓶有奶油氣息..."
                  className="input-field h-20 resize-none"
                />
              </div>
              <div>
                <label htmlFor="mat-aliases" className={labelClass}>別名（每行一個）</label>
                <textarea
                  id="mat-aliases"
                  value={aliasesText}
                  onChange={(e) => setAliasesText(e.target.value)}
                  placeholder={'例：\n阿曼乳香\n綠乳香'}
                  className="input-field h-24 resize-none"
                />
              </div>
              <div>
                <label htmlFor="mat-warnings" className={labelClass}>v3.0 警告（每行一個）</label>
                <textarea
                  id="mat-warnings"
                  value={warningsText}
                  onChange={(e) => setWarningsText(e.target.value)}
                  placeholder={'例：\n線香 ≤ 0.5%\n最後加入避免揮發'}
                  className="input-field h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mat-ceiling" className={labelClass}>線香硬上限 %</label>
                  <input
                    id="mat-ceiling"
                    type="text"
                    inputMode="decimal"
                    value={ceilingText}
                    onChange={(e) => setCeilingText(e.target.value)}
                    placeholder="留空＝無上限"
                    className="input-field tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="mat-test" className={labelClass}>測試狀態</label>
                  <select
                    id="mat-test"
                    value={form.testStatus ?? 'pending'}
                    onChange={(e) => setF('testStatus', e.target.value as MaterialTestStatus)}
                    className="input-field"
                  >
                    <option value="pending">未測試</option>
                    <option value="tested">已測試</option>
                    <option value="verified">已驗證</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="mat-stock-note" className={labelClass}>庫存備註</label>
                <input
                  id="mat-stock-note"
                  value={form.stock.note}
                  onChange={(e) => setF('stock', { ...form.stock, note: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </DrawerRow>
        </div>
      </form>
    </BottomSheet>
  );
}
