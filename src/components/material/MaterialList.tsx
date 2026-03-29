import { useState } from 'react';
import type { Material, IngredientCat } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { ConfirmDialog } from '../shared/ConfirmDialog';

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

export function MaterialList({ materials, onAdd, onUpdate, onDelete }: Props) {
  const [activeCat, setActiveCat] = useState<IngredientCat>('base');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Material, 'id'>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    if (!form.name.trim()) return;
    if (editId) {
      await onUpdate(editId, form);
    } else {
      await onAdd(form);
    }
    setShowForm(false);
    setEditId(null);
  }

  function setF<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
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
              <label className="section-label block mb-1">名稱 *</label>
              <input required value={form.name} onChange={(e) => setF('name', e.target.value)} className="input-field" />
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
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn text-xs">取消</button>
            <button type="submit" className="btn-primary text-xs">儲存</button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-ink-3 font-light py-8 text-center">無材料</p>
        )}
        {filtered.map((mat) => (
          <div
            key={mat.id}
            className="bg-card border border-border p-4"
            style={{ borderLeftWidth: 3, borderLeftColor: ING_CAT_COLORS[mat.cat] }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm text-ink">{mat.name}</p>
                {(mat.origin || mat.supplier) && (
                  <p className="text-xs text-ink-2 font-light mt-0.5">
                    {[mat.origin, mat.supplier].filter(Boolean).join(' · ')}
                  </p>
                )}
                {mat.note && <p className="text-xs text-ink-3 font-light mt-1">{mat.note}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-light text-ink">{mat.stock.qty} {mat.stock.unit}</p>
                {mat.stock.note && <p className="text-xs text-ink-3">{mat.stock.note}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => startEdit(mat)} className="btn text-xs">編輯</button>
              <button onClick={() => setDeleteId(mat.id)} className="btn text-xs text-error border-error">刪除</button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      {!showForm && (
        <button
          onClick={startAdd}
          className="fixed right-5 bottom-16 w-11 h-11 bg-ink text-bg text-xl flex items-center justify-center z-40"
          aria-label="新增材料"
        >
          ＋
        </button>
      )}

      {deleteId && (
        <ConfirmDialog
          message={`確定要刪除「${materials.find((m) => m.id === deleteId)?.name}」？`}
          onConfirm={async () => { await onDelete(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
