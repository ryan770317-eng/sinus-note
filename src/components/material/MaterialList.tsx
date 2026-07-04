import { useState, useMemo } from 'react';
import type { Material, IngredientCat, MaterialTestStatus } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { SPECIES_GROUP_OPTIONS, speciesGroupLabel } from '../../utils/species';
import { supplierShort } from '../../utils/format';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useToast } from '../shared/Toast';
import { SearchField } from '../shared/SearchField';
import { MaterialTestSopModal } from './MaterialTestSopModal';

interface Props {
  materials: Material[];
  /** 新增材料 — 必須回傳建立後的 Material 以便觸發 SOP modal */
  onAdd: (mat: Omit<Material, 'id'>) => Promise<Material>;
  onUpdate: (id: string, updates: Partial<Material>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore?: (mat: Material) => Promise<void>;
}

const CATS = Object.keys(ING_CATS) as IngredientCat[];

type SubTab = 'all' | 'group' | 'pending' | 'lowStock';

const emptyForm = (): Omit<Material, 'id'> => ({
  cat: 'base',
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

const THREE_SEG_RE = /^[^｜]+｜[^｜]+｜[^｜]+$/;

// ── Legacy synonym fallback（v2.1 前的相容性）─────────────────────
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

function legacyGroupKeys(name: string): string[] {
  const groups: string[] = [];
  for (const [label, ...keywords] of SYNONYM_TABLE) {
    const excludes = keywords.filter((kw) => kw.startsWith('!'));
    const includes = keywords.filter((kw) => !kw.startsWith('!'));
    if (excludes.some((kw) => name.includes(kw.slice(1)))) continue;
    if (includes.some((kw) => name.includes(kw))) groups.push(label);
  }
  return groups;
}

/** 取材料的物種分組鍵：優先 speciesGroup，回落到 legacy name 比對 */
function speciesKey(m: Material): string | null {
  if (m.speciesGroup) return m.speciesGroup;
  const legacy = legacyGroupKeys(m.name);
  return legacy[0] ?? null;
}

/** 顯示用簡稱：優先 displayShort，回落取 name 第一段，再回落整個 name */
function displayName(m: Material): string {
  if (m.displayShort) return m.displayShort;
  const firstSeg = m.name.split('｜')[0]?.trim();
  return firstSeg || m.name;
}


// ── Component ─────────────────────────────────────────────────────

export function MaterialList({ materials, onAdd, onUpdate, onDelete, onRestore }: Props) {
  const toast = useToast();
  const [activeCat, setActiveCat] = useState<IngredientCat>('base');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [search, setSearch] = useState('');
  const [crossCat, setCrossCat] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Material, 'id'>>(emptyForm());
  const [aliasesText, setAliasesText] = useState('');     // 表單裡 aliases 用換行字串編輯
  const [warningsText, setWarningsText] = useState('');   // v3Warnings 同
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  /** 跑 SOP 測試的目標材料 — null 表示不顯示 modal */
  const [sopMaterial, setSopMaterial] = useState<Material | null>(null);

  // ── Group index by speciesGroup ───────────────────────────────
  const { groupMembers } = useMemo(() => {
    const gm = new Map<string, Material[]>();
    for (const m of materials) {
      const k = speciesKey(m);
      if (!k) continue;
      const arr = gm.get(k) ?? [];
      arr.push(m);
      gm.set(k, arr);
    }
    return { groupMembers: gm };
  }, [materials]);

  function getSimilarCount(mat: Material): number {
    const k = speciesKey(mat);
    if (!k) return 0;
    return groupMembers.get(k)?.length ?? 0;
  }

  function getSimilarMaterials(mat: Material): Material[] {
    const k = speciesKey(mat);
    if (!k) return [];
    return (groupMembers.get(k) ?? []).filter((m) => m.id !== mat.id);
  }

  // ── Filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = materials;

    // 搜尋（含 displayShort, species, aliases）
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => {
        if (m.name.toLowerCase().includes(q)) return true;
        if (m.origin.toLowerCase().includes(q)) return true;
        if (m.supplier.toLowerCase().includes(q)) return true;
        if (m.displayShort?.toLowerCase().includes(q)) return true;
        if (m.species?.toLowerCase().includes(q)) return true;
        if (m.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // 跨類：搜尋詞下才生效
    if (!(search && crossCat)) {
      list = list.filter((m) => m.cat === activeCat);
    }

    // 副 tab 篩選
    if (subTab === 'pending') {
      list = list.filter((m) => (m.testStatus ?? 'pending') === 'pending');
    } else if (subTab === 'lowStock') {
      list = list.filter((m) => (m.stock?.qty ?? 0) === 0);
    }

    return list;
  }, [materials, search, crossCat, activeCat, subTab]);

  // ── Form handlers ─────────────────────────────────────────────
  function startEdit(mat: Material) {
    setEditId(mat.id);
    setForm({
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
    });
    setAliasesText((mat.aliases ?? []).join('\n'));
    setWarningsText((mat.v3Warnings ?? []).join('\n'));
    setNameError('');
    setShowForm(true);
  }

  function startAdd() {
    setEditId(null);
    setForm({ ...emptyForm(), cat: activeCat });
    setAliasesText('');
    setWarningsText('');
    setNameError('');
    setShowForm(true);
  }

  function setF<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // 驗證：name 不空
    if (!form.name.trim()) {
      setNameError('請填寫名稱');
      toast.error('請填寫材料名稱');
      return;
    }

    // 驗證：name 三段式（編輯舊材料時，若原本就不合規則允許保留；新增強制）
    const isThreeSeg = THREE_SEG_RE.test(form.name);
    if (!editId && !isThreeSeg) {
      setNameError('需要三段式格式：[品名]｜[供應商]｜[產地或品級]');
      toast.error('名稱需符合三段式格式');
      return;
    }

    // 整理 aliases / v3Warnings 從 textarea 拆行
    const aliases = aliasesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const v3Warnings = warningsText.split('\n').map((s) => s.trim()).filter(Boolean);

    const payload: Omit<Material, 'id'> = {
      ...form,
      // 把空字串轉 undefined（清空時不要寫入空字串）
      displayShort: form.displayShort?.trim() || undefined,
      species:      form.species?.trim() || undefined,
      speciesGroup: form.speciesGroup?.trim() || undefined,
      grade:        form.grade?.trim() || undefined,
      qualityNote:  form.qualityNote?.trim() || undefined,
      aliases:      aliases.length ? aliases : undefined,
      v3Warnings:   v3Warnings.length ? v3Warnings : undefined,
      hardCeiling:  form.hardCeiling || undefined,
      testStatus:   form.testStatus ?? 'pending',
      updatedAt:    new Date().toISOString(),
      addedAt:      editId ? form.addedAt : new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (editId) {
        await onUpdate(editId, payload);
        toast.success('材料已更新');
        setShowForm(false);
        setEditId(null);
        setNameError('');
      } else {
        const created = await onAdd(payload);
        toast.success('材料已新增');
        setShowForm(false);
        setEditId(null);
        setNameError('');
        // 新增後自動跳入庫測試 SOP（pending 狀態才彈，已測試/驗證的不彈）
        if ((created.testStatus ?? 'pending') === 'pending') {
          setSopMaterial(created);
        }
      }
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => prev === id ? null : id);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h1 className="type-title shrink-0">材料庫</h1>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="名稱、學名、別名、產地、供應商"
          resultCount={filtered.length}
          crossCategory={crossCat}
          onCrossCategoryChange={setCrossCat}
          className="w-full sm:w-[320px]"
        />
      </div>

      {/* 主 tab — 分類 */}
      <div className="flex gap-0 mb-2 border-b border-border overflow-x-auto">
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

      {/* 副 tab — 視圖 */}
      <div className="flex gap-0 mb-4 -mt-px overflow-x-auto">
        {([
          ['all', '全部'],
          ['group', '按物種分組'],
          ['pending', '待測試'],
          ['lowStock', '庫存 0'],
        ] as [SubTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-3 py-1.5 type-micro tracking-label whitespace-nowrap transition-colors ${
              subTab === id ? 'text-ink border-b border-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border p-4 mb-4 space-y-3">
          <p className="section-label">{editId ? '編輯材料' : '新增材料'}</p>

          {/* 分類 + 名稱 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">分類</label>
              <select value={form.cat} onChange={(e) => setF('cat', e.target.value as IngredientCat)} className="input-field">
                {CATS.map((c) => <option key={c} value={c}>{ING_CATS[c].label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mat-name" className="section-label block mb-1">名稱（三段式 *）</label>
              <input
                id="mat-name"
                required
                aria-required="true"
                aria-invalid={!!nameError}
                value={form.name}
                onChange={(e) => { setF('name', e.target.value); if (nameError) setNameError(''); }}
                placeholder="[品名]｜[供應商]｜[產地或品級]"
                className={`input-field ${nameError ? 'border-error' : ''}`}
              />
              {nameError && <p className="text-xs text-error font-light mt-1">{nameError}</p>}
            </div>
          </div>

          {/* displayShort + species + speciesGroup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="section-label block mb-1">顯示簡稱</label>
              <input
                value={form.displayShort ?? ''}
                onChange={(e) => setF('displayShort', e.target.value)}
                placeholder="≤ 6 字（配方表用）"
                maxLength={12}
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label block mb-1">學名 species</label>
              <input
                value={form.species ?? ''}
                onChange={(e) => setF('species', e.target.value)}
                placeholder="例：Boswellia sacra"
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label block mb-1">物種分組</label>
              <input
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
          </div>

          {/* origin + supplier + grade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="section-label block mb-1">產地</label>
              <input value={form.origin} onChange={(e) => setF('origin', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">供應商</label>
              <input value={form.supplier} onChange={(e) => setF('supplier', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">品級 grade</label>
              <input
                value={form.grade ?? ''}
                onChange={(e) => setF('grade', e.target.value)}
                placeholder="例：皇家綠 / 黑原脂"
                className="input-field"
              />
            </div>
          </div>

          {/* note */}
          <div>
            <label className="section-label block mb-1">特性備註</label>
            <textarea value={form.note} onChange={(e) => setF('note', e.target.value)} className="input-field h-16 resize-none" />
          </div>

          {/* qualityNote */}
          <div>
            <label className="section-label block mb-1">品質筆記（含評分）</label>
            <textarea
              value={form.qualityNote ?? ''}
              onChange={(e) => setF('qualityNote', e.target.value)}
              placeholder="例：8/10 — 開瓶有奶油氣息..."
              className="input-field h-16 resize-none"
            />
          </div>

          {/* aliases + v3Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">別名（每行一個）</label>
              <textarea
                value={aliasesText}
                onChange={(e) => setAliasesText(e.target.value)}
                placeholder="例：&#10;阿曼乳香&#10;綠乳香"
                className="input-field h-20 resize-none"
              />
            </div>
            <div>
              <label className="section-label block mb-1">v3.0 警告（每行一個）</label>
              <textarea
                value={warningsText}
                onChange={(e) => setWarningsText(e.target.value)}
                placeholder="例：&#10;線香 ≤ 0.5%&#10;最後加入避免揮發"
                className="input-field h-20 resize-none"
              />
            </div>
          </div>

          {/* hardCeiling + testStatus */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="section-label block mb-1">線香硬上限 %</label>
              <input
                type="number"
                step="0.1"
                value={form.hardCeiling ?? ''}
                onChange={(e) => setF('hardCeiling', e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder="留空表示無上限"
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label block mb-1">測試狀態</label>
              <select
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

          {/* stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="section-label block mb-1">庫存量</label>
              <input type="number" step="0.01" value={form.stock.qty} onChange={(e) => setF('stock', { ...form.stock, qty: Number(e.target.value) })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">單位</label>
              <input value={form.stock.unit} onChange={(e) => setF('stock', { ...form.stock, unit: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">庫存備註</label>
              <input value={form.stock.note} onChange={(e) => setF('stock', { ...form.stock, note: e.target.value })} className="input-field" />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); setNameError(''); }}
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

      {/* List — 有兩種模式：flat / by group */}
      {subTab === 'group' ? (
        <ByGroupList
          materials={filtered}
          onExpand={toggleExpand}
          expandedId={expandedId}
          onEdit={startEdit}
          onDelete={(id) => setDeleteId(id)}
          onRunSop={(m) => setSopMaterial(m)}
        />
      ) : (
        <FlatList
          materials={filtered}
          getSimilarCount={getSimilarCount}
          getSimilarMaterials={getSimilarMaterials}
          onExpand={toggleExpand}
          expandedId={expandedId}
          onEdit={startEdit}
          onDelete={(id) => setDeleteId(id)}
          onRunSop={(m) => setSopMaterial(m)}
          showCatLabel={!!(search && crossCat)}
        />
      )}

      {sopMaterial && (
        <MaterialTestSopModal
          material={sopMaterial}
          onSave={onUpdate}
          onClose={() => setSopMaterial(null)}
        />
      )}

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
          message={`確定要刪除「${materials.find((m) => m.id === deleteId)?.name}」？`}
          confirmLabel="刪除"
          tone="danger"
          onConfirm={async () => {
            const mat = materials.find((m) => m.id === deleteId);
            setDeleteId(null);
            if (!mat) return;
            try {
              await onDelete(mat.id);
              if (onRestore) {
                toast.success('材料已刪除', {
                  action: {
                    label: '復原',
                    onClick: async () => {
                      try {
                        await onRestore(mat);
                        toast.info('材料已復原');
                      } catch (err) {
                        toast.error(`復原失敗：${err instanceof Error ? err.message : String(err)}`);
                      }
                    },
                  },
                });
              } else {
                toast.success('材料已刪除');
              }
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

// ── Sub-components ─────────────────────────────────────────────────

interface ListProps {
  materials: Material[];
  onExpand: (id: string) => void;
  expandedId: string | null;
  onEdit: (mat: Material) => void;
  onDelete: (id: string) => void;
  onRunSop: (m: Material) => void;
}

function FlatList({
  materials,
  getSimilarCount,
  getSimilarMaterials,
  onExpand,
  expandedId,
  onEdit,
  onDelete,
  onRunSop,
  showCatLabel,
}: ListProps & {
  getSimilarCount: (m: Material) => number;
  getSimilarMaterials: (m: Material) => Material[];
  showCatLabel: boolean;
}) {
  return (
    <div className="space-y-2">
      {materials.length === 0 && (
        <p className="type-body text-ink-3 py-8 text-center">無材料</p>
      )}
      {materials.map((mat) => (
        <MaterialCard
          key={mat.id}
          mat={mat}
          isExpanded={expandedId === mat.id}
          similarCount={getSimilarCount(mat)}
          similarMembers={getSimilarMaterials(mat)}
          onExpand={() => onExpand(mat.id)}
          onEdit={() => onEdit(mat)}
          onDelete={() => onDelete(mat.id)}
          onRunSop={() => onRunSop(mat)}
          showCatLabel={showCatLabel}
        />
      ))}
    </div>
  );
}

function ByGroupList({
  materials,
  onExpand,
  expandedId,
  onEdit,
  onDelete,
  onRunSop,
}: ListProps) {
  // 按 speciesKey 分組
  const groups = useMemo(() => {
    const map = new Map<string, Material[]>();
    const orphans: Material[] = [];
    for (const m of materials) {
      const k = speciesKey(m);
      if (!k) { orphans.push(m); continue; }
      const arr = map.get(k) ?? [];
      arr.push(m);
      map.set(k, arr);
    }
    // 按組內成員數倒序，多 → 少
    const sorted = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    return { sorted, orphans };
  }, [materials]);

  return (
    <div className="space-y-6">
      {materials.length === 0 && (
        <p className="type-body text-ink-3 py-8 text-center">無材料</p>
      )}
      {groups.sorted.map(([key, members]) => (
        <div key={key}>
          <p className="section-label mb-2">
            {speciesGroupLabel(key)}
            <span className="ml-2 type-micro text-ink-3">×{members.length}</span>
          </p>
          <div className="space-y-2">
            {members.map((mat) => (
              <MaterialCard
                key={mat.id}
                mat={mat}
                isExpanded={expandedId === mat.id}
                similarCount={members.length}
                similarMembers={members.filter((m) => m.id !== mat.id)}
                onExpand={() => onExpand(mat.id)}
                onEdit={() => onEdit(mat)}
                onDelete={() => onDelete(mat.id)}
                onRunSop={() => onRunSop(mat)}
                showCatLabel={false}
                groupKnown
              />
            ))}
          </div>
        </div>
      ))}
      {groups.orphans.length > 0 && (
        <div>
          <p className="section-label mb-2">未分組 <span className="ml-2 type-micro text-ink-3">×{groups.orphans.length}</span></p>
          <div className="space-y-2">
            {groups.orphans.map((mat) => (
              <MaterialCard
                key={mat.id}
                mat={mat}
                isExpanded={expandedId === mat.id}
                similarCount={0}
                similarMembers={[]}
                onExpand={() => onExpand(mat.id)}
                onEdit={() => onEdit(mat)}
                onDelete={() => onDelete(mat.id)}
                onRunSop={() => onRunSop(mat)}
                showCatLabel={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  mat: Material;
  isExpanded: boolean;
  similarCount: number;
  similarMembers: Material[];
  onExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRunSop: () => void;
  showCatLabel: boolean;
  /** 在 by-group 視圖時，標題那邊的同種徽章可隱藏 */
  groupKnown?: boolean;
}

function MaterialCard({
  mat,
  isExpanded,
  similarCount,
  similarMembers,
  onExpand,
  onEdit,
  onDelete,
  onRunSop,
  showCatLabel,
  groupKnown,
}: CardProps) {
  const supShort = supplierShort(mat.supplier);
  const isPending = (mat.testStatus ?? 'pending') === 'pending';
  const hasWarnings = (mat.v3Warnings?.length ?? 0) > 0;

  return (
    <div
      className="bg-card border border-border cursor-pointer transition-colors hover:border-ink-3"
      style={{ borderLeftWidth: 3, borderLeftColor: ING_CAT_COLORS[mat.cat] }}
      onClick={onExpand}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {showCatLabel && (
                <span
                  className="type-micro tracking-label uppercase"
                  style={{ color: ING_CAT_COLORS[mat.cat] }}
                >
                  {ING_CATS[mat.cat].label}
                </span>
              )}
              <p className="type-name">{displayName(mat)}</p>
              {supShort && (
                <span className="type-micro text-ink-3">· {supShort}</span>
              )}
              {hasWarnings && (
                <span className="type-micro px-1.5 py-0.5 border border-error text-error">
                  ⚠
                </span>
              )}
              {mat.hardCeiling != null && (
                <span className="type-micro px-1.5 py-0.5 bg-error/10 text-error">
                  ≤{mat.hardCeiling}%
                </span>
              )}
              {isPending && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRunSop(); }}
                  className="type-micro px-1.5 py-0.5 border border-accent text-accent hover:bg-accent/10 transition-colors"
                  aria-label={`跑 ${mat.name} 入庫測試 SOP`}
                >
                  待測 · 跑 SOP
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap type-meta text-ink-2">
              {mat.species && <span className="italic">{mat.species}</span>}
              {mat.speciesGroup && (
                <span>· {speciesGroupLabel(mat.speciesGroup)}</span>
              )}
              {!groupKnown && similarCount >= 2 && (
                <span
                  className="type-micro px-1.5 py-0.5 ml-1"
                  style={{ background: 'rgba(139,111,82,0.12)', color: '#8B6F52' }}
                >
                  同物種 ×{similarCount}
                </span>
              )}
            </div>
            {/* full name 隱藏在卡片底，hover 才看 */}
            {mat.displayShort && mat.name !== mat.displayShort && (
              <p className="type-micro text-ink-3 mt-0.5 truncate" title={mat.name}>{mat.name}</p>
            )}
          </div>
          <span className="text-ink-3 text-xs shrink-0">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* 完整名稱 */}
          {mat.displayShort && mat.name !== mat.displayShort && (
            <div>
              <span className="type-micro tracking-label">完整名稱</span>
              <p className="type-meta text-ink mt-0.5">{mat.name}</p>
            </div>
          )}

          {/* 產地 / 供應商 / 品級 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mat.origin && (
              <div>
                <span className="type-micro tracking-label">產地</span>
                <p className="type-meta text-ink mt-0.5">{mat.origin}</p>
              </div>
            )}
            {mat.supplier && (
              <div>
                <span className="type-micro tracking-label">供應商</span>
                <p className="type-meta text-ink mt-0.5">{mat.supplier}</p>
              </div>
            )}
            {mat.grade && (
              <div>
                <span className="type-micro tracking-label">品級</span>
                <p className="type-meta text-ink mt-0.5">{mat.grade}</p>
              </div>
            )}
          </div>

          {/* note */}
          {mat.note && (
            <div>
              <span className="type-micro tracking-label">特性備註</span>
              <p className="type-meta text-ink mt-0.5">{mat.note}</p>
            </div>
          )}

          {/* qualityNote */}
          {mat.qualityNote && (
            <div>
              <span className="type-micro tracking-label">品質筆記</span>
              <p className="type-meta text-ink mt-0.5 whitespace-pre-wrap">{mat.qualityNote}</p>
            </div>
          )}

          {/* v3Warnings */}
          {hasWarnings && (
            <div>
              <span className="type-micro tracking-label text-error">v3.0 警告</span>
              <ul className="mt-1 space-y-0.5">
                {mat.v3Warnings!.map((w, i) => (
                  <li key={i} className="type-meta text-error">· {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* aliases */}
          {(mat.aliases?.length ?? 0) > 0 && (
            <div>
              <span className="type-micro tracking-label">別名</span>
              <p className="type-meta text-ink-2 mt-0.5">{mat.aliases!.join('、')}</p>
            </div>
          )}

          {/* stock */}
          {(mat.stock.qty > 0 || mat.stock.note) && (
            <div>
              <span className="type-micro tracking-label">庫存</span>
              <p className="type-meta text-ink mt-0.5">
                {mat.stock.qty > 0 && <>{mat.stock.qty} {mat.stock.unit}</>}
                {mat.stock.qty > 0 && mat.stock.note && ' · '}
                {mat.stock.note}
              </p>
            </div>
          )}

          {/* 同物種 */}
          {similarMembers.length > 0 && (
            <div>
              <span className="type-micro tracking-label">同物種其他條目</span>
              <div className="mt-1 space-y-1">
                {similarMembers.map((sm) => (
                  <div key={sm.id} className="flex items-center gap-2 text-xs font-light">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: ING_CAT_COLORS[sm.cat] }}
                    />
                    <span className="text-ink">{displayName(sm)}</span>
                    {sm.supplier && <span className="text-ink-3">· {sm.supplier}</span>}
                    {sm.qualityNote && <span className="text-ink-3 truncate">{sm.qualityNote.slice(0, 30)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1 flex-wrap">
            <button onClick={onEdit} className="btn text-xs" aria-label={`編輯 ${mat.name}`}>編輯</button>
            {isPending && (
              <button
                onClick={onRunSop}
                className="btn text-xs text-accent border-accent"
                aria-label={`跑 ${mat.name} 入庫測試 SOP`}
              >
                入庫測試 SOP
              </button>
            )}
            <button onClick={onDelete} className="btn text-xs text-error border-error" aria-label={`刪除 ${mat.name}`}>刪除</button>
          </div>
        </div>
      )}
    </div>
  );
}
