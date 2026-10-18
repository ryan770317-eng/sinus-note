import { useState, useMemo } from 'react';
import type { Material, IngredientCat } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { speciesGroupLabel } from '../../utils/species';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useToast } from '../shared/useToast';
import { SearchField } from '../shared/SearchField';
import { MaterialTestSopModal } from './MaterialTestSopModal';
import { MaterialForm } from './MaterialForm';

interface Props {
  materials: Material[];
  /** 全域搜尋跳轉帶入的初始搜尋詞（搜尋詞非空時忽略分類篩選） */
  initialSearch?: string;
  /** 新增材料 — 必須回傳建立後的 Material 以便觸發 SOP modal */
  onAdd: (mat: Omit<Material, 'id'>) => Promise<Material>;
  onUpdate: (id: string, updates: Partial<Material>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore?: (mat: Material) => Promise<void>;
}

const CATS = Object.keys(ING_CATS) as IngredientCat[];

type SubTab = 'all' | 'group' | 'pending' | 'lowStock';
type CatFilter = 'all' | IngredientCat;

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

export function MaterialList({ materials, initialSearch, onAdd, onUpdate, onDelete, onRestore }: Props) {
  const toast = useToast();
  const [activeCat, setActiveCat] = useState<CatFilter>('all');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [search, setSearch] = useState(initialSearch ?? '');
  /** 表單 sheet：undefined = 關閉；null = 新增；Material = 編輯 */
  const [formTarget, setFormTarget] = useState<Material | null | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const searching = search.trim().length > 0;

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

    // 搜尋詞非空時忽略分類篩選（等同舊版的跨類搜尋）
    if (!search && activeCat !== 'all') {
      list = list.filter((m) => m.cat === activeCat);
    }

    // 副 tab 篩選
    if (subTab === 'pending') {
      list = list.filter((m) => (m.testStatus ?? 'pending') === 'pending');
    } else if (subTab === 'lowStock') {
      list = list.filter((m) => (m.stock?.qty ?? 0) === 0);
    }

    return list;
  }, [materials, search, activeCat, subTab]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => prev === id ? null : id);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-content mx-auto px-5 pt-7 pb-24">
      <h1 className="type-title h-11 flex items-center">材料庫</h1>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="搜尋材料、供應商"
        resultCount={searching ? filtered.length : undefined}
        persistent
        className="mt-3"
      />

      {/* 分類列（橫向捲動） */}
      <div className="mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="材料分類">
        <button
          type="button"
          onClick={() => setActiveCat('all')}
          aria-pressed={activeCat === 'all'}
          className={`h-11 px-3.5 shrink-0 text-[13px] whitespace-nowrap ${
            activeCat === 'all' ? 'bg-ink text-white font-medium' : 'border-[1.5px] border-border text-ink'
          }`}
        >
          全部
        </button>
        {CATS.map((cat) => {
          const catColor = ING_CAT_COLORS[cat];
          const isActive = activeCat === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              aria-pressed={isActive}
              className="h-11 px-3.5 shrink-0 text-[13px] text-ink whitespace-nowrap border-[1.5px] flex items-center gap-1.5"
              style={{ borderColor: isActive ? catColor : '#D6CFC4' }}
            >
              <span aria-hidden="true" className="inline-block w-1.5 h-1.5 shrink-0" style={{ background: catColor }} />
              {ING_CATS[cat].label}
            </button>
          );
        })}
      </div>

      {/* 副篩選列 */}
      <div className="mt-1 flex gap-[18px] text-[13px] text-ink-2 overflow-x-auto no-scrollbar" role="group" aria-label="檢視">
        {([
          ['all', '全部'],
          ['group', '按物種分組'],
          ['pending', '待測試'],
          ['lowStock', '庫存 0'],
        ] as [SubTab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            aria-pressed={subTab === id}
            className={`h-11 whitespace-nowrap ${subTab === id ? 'text-ink underline underline-offset-4' : 'hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List — 有兩種模式：flat / by group */}
      <div className="mt-3">
        {subTab === 'group' ? (
          <ByGroupList
            materials={filtered}
            onExpand={toggleExpand}
            expandedId={expandedId}
            onEdit={(m) => setFormTarget(m)}
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
            onEdit={(m) => setFormTarget(m)}
            onDelete={(id) => setDeleteId(id)}
            onRunSop={(m) => setSopMaterial(m)}
            showCatLabel={searching}
          />
        )}
      </div>

      {formTarget !== undefined && (
        <MaterialForm
          key={formTarget?.id ?? 'new'}
          editing={formTarget}
          defaultCat={activeCat === 'all' ? 'base' : activeCat}
          materials={materials}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onClose={() => setFormTarget(undefined)}
          onCreated={(created) => {
            // 新增後自動跳入庫測試 SOP（pending 狀態才彈，已測試/驗證的不彈）
            if ((created.testStatus ?? 'pending') === 'pending') setSopMaterial(created);
          }}
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
      {formTarget === undefined && (
        <button
          type="button"
          onClick={() => setFormTarget(null)}
          className="fixed right-5 w-14 h-14 bg-ink text-white text-2xl flex items-center justify-center z-40 hover:bg-ink-2 transition-colors"
          style={{ bottom: 'calc(3.5rem + 1rem + env(safe-area-inset-bottom))' }}
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
        <p className="type-body text-ink-2 py-8 text-center">無材料</p>
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
        <p className="type-body text-ink-2 py-8 text-center">無材料</p>
      )}
      {groups.sorted.map(([key, members]) => (
        <div key={key}>
          <p className="section-label mb-2">
            {speciesGroupLabel(key)}
            <span className="ml-2 type-micro tabular-nums">×{members.length}</span>
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
          <p className="section-label mb-2">未分組 <span className="ml-2 type-micro tabular-nums">×{groups.orphans.length}</span></p>
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
  const isPending = (mat.testStatus ?? 'pending') === 'pending';
  const hasWarnings = (mat.v3Warnings?.length ?? 0) > 0;
  const sub = [mat.supplier && mat.supplier !== '—' ? mat.supplier : '', mat.origin].filter(Boolean).join(' · ');
  const name = displayName(mat);

  return (
    <div
      className="bg-card border-l-[3px] cursor-pointer"
      style={{ borderLeftColor: ING_CAT_COLORS[mat.cat] }}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${name}${showCatLabel ? `（${ING_CATS[mat.cat].label}）` : ''}`}
    >
      {/* Header */}
      <div className="min-h-16 pl-3.5 flex items-center gap-2">
        <div className="flex-1 min-w-0 py-2.5">
          {showCatLabel && (
            <p className="text-xs text-ink-2 tracking-[0.1em]">{ING_CATS[mat.cat].label}</p>
          )}
          <p className="text-base text-ink truncate">{name}</p>
          {sub && <p className="text-[13px] text-ink-2 truncate">{sub}</p>}
        </div>
        {isPending && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRunSop(); }}
            className="shrink-0 h-11 flex items-center"
            aria-label={`跑 ${mat.name} 入庫測試 SOP`}
          >
            <span className="text-xs text-ink border border-ink-2 px-[7px] py-[3px]">待測</span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          aria-label={`${isExpanded ? '收合' : '展開'} ${name}`}
          aria-expanded={isExpanded}
          className="shrink-0 w-11 h-11 flex items-center justify-center text-ink-2"
        >
          <span aria-hidden="true" className="inline-block text-base transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▸</span>
        </button>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="px-3.5 pb-4 border-t border-border pt-3 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
          {/* 完整名稱 */}
          {mat.name !== name && (
            <Field label="完整名稱">{mat.name}</Field>
          )}

          {/* 產地 / 供應商 / 品級 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mat.origin && <Field label="產地">{mat.origin}</Field>}
            {mat.supplier && <Field label="供應商">{mat.supplier}</Field>}
            {mat.grade && <Field label="品級">{mat.grade}</Field>}
            {mat.species && <Field label="學名"><span className="italic">{mat.species}</span></Field>}
            {mat.speciesGroup && <Field label="物種分組">{speciesGroupLabel(mat.speciesGroup)}</Field>}
            {mat.hardCeiling != null && <Field label="線香硬上限"><span className="tabular-nums">≤ {mat.hardCeiling}%</span></Field>}
          </div>

          {mat.note && <Field label="特性備註">{mat.note}</Field>}
          {mat.qualityNote && <Field label="品質筆記"><span className="whitespace-pre-wrap">{mat.qualityNote}</span></Field>}

          {/* v3Warnings */}
          {hasWarnings && (
            <div>
              <p className="text-xs text-error tracking-[0.1em]">v3.0 警告</p>
              <ul className="mt-1 space-y-0.5">
                {mat.v3Warnings!.map((w, i) => (
                  <li key={i} className="text-[13px] text-error">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {(mat.aliases?.length ?? 0) > 0 && <Field label="別名">{mat.aliases!.join('、')}</Field>}

          {/* stock */}
          {(mat.stock.qty > 0 || mat.stock.note) && (
            <Field label="庫存">
              {mat.stock.qty > 0 && <span className="tabular-nums">{mat.stock.qty} {mat.stock.unit}</span>}
              {mat.stock.qty > 0 && mat.stock.note && ' · '}
              {mat.stock.note}
            </Field>
          )}

          {/* 同物種 */}
          {similarMembers.length > 0 && (
            <div>
              <p className="text-xs text-ink-2 tracking-[0.1em]">
                同物種其他條目{!groupKnown && similarCount >= 2 && <span className="tabular-nums"> ×{similarCount}</span>}
              </p>
              <div className="mt-1 space-y-1">
                {similarMembers.map((sm) => (
                  <div key={sm.id} className="flex items-center gap-2 text-[13px]">
                    <span
                      aria-hidden="true"
                      className="inline-block w-1.5 h-1.5 shrink-0"
                      style={{ background: ING_CAT_COLORS[sm.cat] }}
                    />
                    <span className="text-ink">{displayName(sm)}</span>
                    {sm.supplier && <span className="text-ink-2">· {sm.supplier}</span>}
                    {sm.qualityNote && <span className="text-ink-2 truncate">{sm.qualityNote.slice(0, 30)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
            <button type="button" onClick={onEdit} className="btn" aria-label={`編輯 ${mat.name}`}>編輯</button>
            {isPending && (
              <button type="button" onClick={onRunSop} className="btn" aria-label={`跑 ${mat.name} 入庫測試 SOP`}>
                入庫測試 SOP
              </button>
            )}
            <button type="button" onClick={onDelete} className="btn text-error border-error" aria-label={`刪除 ${mat.name}`}>刪除</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-2 tracking-[0.1em]">{label}</p>
      <p className="text-[13px] text-ink mt-0.5">{children}</p>
    </div>
  );
}
