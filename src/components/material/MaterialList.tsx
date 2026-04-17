import { useState, useMemo } from 'react';
import type { Material, IngredientCat } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useToast } from '../shared/Toast';

interface Props {
  materials: Material[];
  onAdd: (mat: Omit<Material, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Material>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATS = Object.keys(ING_CATS) as IngredientCat[];

const emptyForm = (): Omit<Material, 'id'> => ({
  cat: 'base',
  name: '',
  origin: '',
  supplier: '',
  note: '',
  stock: { qty: 0, unit: 'g', note: '' },
});

// ── Similar-group synonym table ──────────────────────────────────
// Each entry: [groupLabel, ...keywords] — first match wins per keyword
const SYNONYM_TABLE: [string, ...string[]][] = [
  ['乳香膠', '乳香膠', 'Mastic', 'mastic', 'Pistacia', 'pistacia', '熏陸'],
  ['乳香', '乳香', 'Frankincense', 'frankincense', 'Boswellia', 'boswellia'],
  ['沒藥', '沒藥', 'Myrrh', 'myrrh'],
  ['蘇合香', '蘇合香', 'Styrax', 'styrax', '楓香樹脂'],
  ['安息香', '安息香', '!金安息香'],
  ['降真香', '降真香'],
  ['檀香', '檀香', '老山檀', '新山檀'],
  ['沉香', '沉香'],
  ['薰衣草', '薰衣草'],
  ['佛手柑', '佛手柑'],
  ['阿勒頗松', '阿勒頗松'],
  ['杜松', '杜松'],
  ['檸檬', '檸檬'],
  ['綠檀', '綠檀'],
  ['玫瑰', '玫瑰'],
  ['桂花', '桂花'],
  ['藍蓮花', '藍蓮花'],
  ['紫檀', '紫檀'],
  ['崖柏', '崖柏', '肖楠', '香柏'],
];

function getGroups(name: string): string[] {
  const groups: string[] = [];
  for (const [label, ...keywords] of SYNONYM_TABLE) {
    // Keywords starting with "!" are exclusions — if any exclusion matches, skip this group
    const excludes = keywords.filter((kw) => kw.startsWith('!'));
    const includes = keywords.filter((kw) => !kw.startsWith('!'));
    if (excludes.some((kw) => name.includes(kw.slice(1)))) continue;
    if (includes.some((kw) => name.includes(kw))) {
      groups.push(label);
    }
  }
  return groups;
}

// ── Component ─────────────────────────────────────────────────────

export function MaterialList({ materials, onAdd, onUpdate, onDelete }: Props) {
  const toast = useToast();
  const [activeCat, setActiveCat] = useState<IngredientCat>('base');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Material, 'id'>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGroupFor, setShowGroupFor] = useState<string | null>(null); // materialId showing group list
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);

  // ── Precompute similar groups ───────────────────────────────────
  const { matGroups, groupMembers } = useMemo(() => {
    const mg = new Map<string, string[]>(); // materialId → groupLabels
    const gm = new Map<string, Material[]>(); // groupLabel → materials

    for (const m of materials) {
      const groups = getGroups(m.name);
      mg.set(m.id, groups);
      for (const g of groups) {
        const arr = gm.get(g) ?? [];
        arr.push(m);
        gm.set(g, arr);
      }
    }
    return { matGroups: mg, groupMembers: gm };
  }, [materials]);

  function getSimilarCount(mat: Material): number {
    const groups = matGroups.get(mat.id) ?? [];
    let max = 0;
    for (const g of groups) {
      const count = groupMembers.get(g)?.length ?? 0;
      if (count > max) max = count;
    }
    return max;
  }

  function getSimilarMaterials(mat: Material): Material[] {
    const groups = matGroups.get(mat.id) ?? [];
    const seen = new Set<string>();
    const result: Material[] = [];
    for (const g of groups) {
      for (const m of groupMembers.get(g) ?? []) {
        if (m.id !== mat.id && !seen.has(m.id)) {
          seen.add(m.id);
          result.push(m);
        }
      }
    }
    return result;
  }

  const filtered = materials.filter(
    (m) =>
      m.cat === activeCat &&
      (!search || m.name.includes(search) || m.origin.includes(search) || m.supplier.includes(search)),
  );

  function startEdit(mat: Material) {
    setEditId(mat.id);
    setForm({ cat: mat.cat, name: mat.name, origin: mat.origin, supplier: mat.supplier, note: mat.note, stock: { ...mat.stock } });
    setShowForm(true);
  }

  function startAdd() {
    setEditId(null);
    setForm({ ...emptyForm(), cat: activeCat });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.name.trim()) {
      setNameError(true);
      toast.error('請填寫材料名稱');
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await onUpdate(editId, form);
        toast.success('材料已更新');
      } else {
        await onAdd(form);
        toast.success('材料已新增');
      }
      setShowForm(false);
      setEditId(null);
      setNameError(false);
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  function setF<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => prev === id ? null : id);
    setShowGroupFor(null);
  }

  function handleGroupClick(e: React.MouseEvent, matId: string) {
    e.stopPropagation();
    setExpandedId(matId);
    setShowGroupFor((prev) => prev === matId ? null : matId);
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <h1 className="font-serif text-xl text-ink tracking-wide mb-5">材料庫</h1>

      {/* Category tabs */}
      <div className="flex gap-0 mb-4 border-b border-border overflow-x-auto">
        {CATS.map((cat) => {
          const catColor = ING_CAT_COLORS[cat];
          const isActive = activeCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className="px-3 py-2 text-xs font-light tracking-label whitespace-nowrap transition-colors flex items-center gap-1 -mb-px"
              style={{
                borderBottom: isActive ? `2px solid ${catColor}` : '2px solid transparent',
                color: isActive ? catColor : undefined,
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: catColor, opacity: isActive ? 1 : 0.4 }}
              />
              {ING_CATS[cat].label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋材料..."
        className="input-field mb-4"
      />

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border p-4 mb-4 space-y-3">
          <p className="section-label">{editId ? '編輯材料' : '新增材料'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">分類</label>
              <select value={form.cat} onChange={(e) => setF('cat', e.target.value as IngredientCat)} className="input-field">
                {CATS.map((c) => <option key={c} value={c}>{ING_CATS[c].label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mat-name" className="section-label block mb-1">名稱 *</label>
              <input
                id="mat-name"
                required
                aria-required="true"
                aria-invalid={nameError}
                value={form.name}
                onChange={(e) => { setF('name', e.target.value); if (nameError && e.target.value.trim()) setNameError(false); }}
                className={`input-field ${nameError ? 'border-error' : ''}`}
              />
              {nameError && <p className="text-xs text-error font-light mt-1">請填寫名稱</p>}
            </div>
            <div>
              <label className="section-label block mb-1">產地</label>
              <input value={form.origin} onChange={(e) => setF('origin', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">供應商</label>
              <input value={form.supplier} onChange={(e) => setF('supplier', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">特性備注</label>
            <textarea value={form.note} onChange={(e) => setF('note', e.target.value)} className="input-field h-16 resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="section-label block mb-1">庫存量</label>
              <input type="number" value={form.stock.qty} onChange={(e) => setF('stock', { ...form.stock, qty: Number(e.target.value) })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">單位</label>
              <input value={form.stock.unit} onChange={(e) => setF('stock', { ...form.stock, unit: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">庫存備注</label>
              <input value={form.stock.note} onChange={(e) => setF('stock', { ...form.stock, note: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); setNameError(false); }}
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
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-ink-3 font-light py-8 text-center">無材料</p>
        )}
        {filtered.map((mat) => {
          const isExpanded = expandedId === mat.id;
          const similarCount = getSimilarCount(mat);
          const showingGroup = showGroupFor === mat.id;

          return (
            <div
              key={mat.id}
              className="bg-card border border-border cursor-pointer transition-colors hover:border-ink-3"
              style={{ borderLeftWidth: 3, borderLeftColor: ING_CAT_COLORS[mat.cat] }}
              onClick={() => toggleExpand(mat.id)}
            >
              {/* Collapsed header — always visible */}
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-ink">{mat.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {mat.origin && (
                        <span className="text-xs text-ink-2 font-light">產地：{mat.origin}</span>
                      )}
                      {mat.supplier && (
                        <span className="text-xs text-ink-2 font-light">{mat.origin ? '· ' : ''}供應商：{mat.supplier}</span>
                      )}
                      {similarCount >= 2 && (
                        <button
                          onClick={(e) => handleGroupClick(e, mat.id)}
                          aria-label={`查看 ${mat.name} 的同類材料（${similarCount} 項）`}
                          aria-expanded={showingGroup}
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-light transition-colors"
                          style={{
                            background: showingGroup ? 'rgba(139,111,82,0.25)' : 'rgba(139,111,82,0.12)',
                            color: '#8B6F52',
                          }}
                        >
                          同種 ×{similarCount}
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-ink-3 text-xs shrink-0">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {mat.note && (
                    <div>
                      <span className="text-[10px] text-ink-3 tracking-label">備注</span>
                      <p className="text-xs text-ink font-light mt-0.5">{mat.note}</p>
                    </div>
                  )}
                  {(mat.stock.qty > 0 || mat.stock.note) && (
                    <div>
                      <span className="text-[10px] text-ink-3 tracking-label">庫存</span>
                      <p className="text-xs text-ink font-light mt-0.5">
                        {mat.stock.qty > 0 && <>{mat.stock.qty} {mat.stock.unit}</>}
                        {mat.stock.qty > 0 && mat.stock.note && ' · '}
                        {mat.stock.note}
                      </p>
                    </div>
                  )}

                  {/* Similar group list */}
                  {showingGroup && (
                    <div>
                      <span className="text-[10px] text-ink-3 tracking-label">同種材料</span>
                      <div className="mt-1 space-y-1">
                        {getSimilarMaterials(mat).map((sm) => (
                          <div key={sm.id} className="flex items-center gap-2 text-xs font-light">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: ING_CAT_COLORS[sm.cat] }}
                            />
                            <span className="text-ink">{sm.name}</span>
                            {sm.supplier && <span className="text-ink-3">({sm.supplier})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => startEdit(mat)}
                      className="btn text-xs"
                      aria-label={`編輯 ${mat.name}`}
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => setDeleteId(mat.id)}
                      className="btn text-xs text-error border-error"
                      aria-label={`刪除 ${mat.name}`}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      {!showForm && (
        <button
          onClick={startAdd}
          className="fixed right-5 w-14 h-14 bg-ink text-bg text-2xl flex items-center justify-center z-40 shadow-sm hover:bg-ink-2 transition-colors"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
          aria-label="新增材料"
        >
          ＋
        </button>
      )}

      {deleteId && (
        <ConfirmDialog
          message={`確定要刪除「${materials.find((m) => m.id === deleteId)?.name}」？\n此操作無法復原。`}
          confirmLabel="刪除"
          tone="danger"
          onConfirm={async () => {
            const id = deleteId;
            setDeleteId(null);
            try {
              await onDelete(id);
              toast.success('材料已刪除');
            } catch (err) {
              toast.error(`刪除失敗：${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
