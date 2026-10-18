import { useEffect, useState, useRef } from 'react';
import type { Recipe, FragCat, RecipeStatus } from '../../types';
import { FRAG_CATS, FRAG_CAT_COLORS, RECIPE_STATUS } from '../../utils/constants';
import { searchRecipes } from '../../utils/globalSearch';
import { RecipeRow } from '../shared/RecipeRow';
import { fileToResizedDataUrl } from '../../utils/image';
import { SearchField } from '../shared/SearchField';
import { useToast } from '../shared/useToast';

interface Props {
  recipes: Recipe[];
  catImagesMap: Record<string, string>;
  catOrder: FragCat[] | null;
  onCatClick: (cat: FragCat) => void;
  /** 搜尋結果點擊 → 直接進配方詳情 */
  onRecipeClick: (id: number) => void;
  onSaveCatImage: (catId: string, base64: string) => Promise<void>;
  onSaveCatOrder: (order: FragCat[]) => Promise<void>;
  /** FAB 新增配方（有選分類篩選時帶入該分類） */
  onNew: (cat?: FragCat) => void;
}

type View = 'list' | 'grid';
type StatusFilter = 'all' | RecipeStatus;

const VIEW_KEY = 'sinus_recipe_view';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

const STATUS_FILTERS: StatusFilter[] = ['all', 'progress', 'pending', 'success', 'fail'];

const DEFAULT_ORDER = Object.keys(FRAG_CATS) as FragCat[];

/** 每個分類的拉丁對照（大寫 uppercase 當主標） */
const FRAG_CAT_LATIN: Record<FragCat, string> = {
  shrine:   'SHRINE',
  improve:  'IMPROVE',
  green:    'GREEN',
  wood:     'WOOD',
  floral:   'FLORAL',
  resin:    'RESIN',
  western:  'WESTERN',
  special:  'SPECIAL',
  tincture: 'TINCTURE',
  test:     'TEST',
};

export function RecipeHome({
  recipes,
  catImagesMap,
  catOrder,
  onCatClick,
  onRecipeClick,
  onSaveCatImage,
  onSaveCatOrder,
  onNew,
}: Props) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>(readView);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [catFilter, setCatFilter] = useState<FragCat | null>(null);
  const [dragging, setDragging] = useState<FragCat | null>(null);
  const [order, setOrder] = useState<FragCat[]>(catOrder ?? DEFAULT_ORDER);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCat, setUploadCat] = useState<FragCat | null>(null);

  // catOrder 是非同步載入（也可能被其他裝置改動）；
  // 非拖曳中時跟隨最新的伺服器值，否則首次載入會停在預設排序
  useEffect(() => {
    if (!dragging) setOrder(catOrder ?? DEFAULT_ORDER);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只跟 catOrder 同步
  }, [catOrder]);

  function changeView(v: View) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* 私密模式等寫入失敗：只影響記憶 */ }
  }

  const countByCat = (cat: FragCat) => recipes.filter((r) => r.fragCat === cat).length;
  const countByStatus = (st: StatusFilter) => (st === 'all' ? recipes.length : recipes.filter((r) => r.status === st).length);
  const statusOptions: StatusFilter[] = recipes.some((r) => r.status === 'order') ? [...STATUS_FILTERS, 'order'] : STATUS_FILTERS;
  const catOptions = (Object.keys(FRAG_CATS) as FragCat[]).filter((c) => countByCat(c) > 0);

  const searched = search.trim() ? searchRecipes(recipes, search, Infinity) : recipes;
  const listed = searched
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .filter((r) => !catFilter || r.fragCat === catFilter)
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0));

  const condLabel = [
    statusFilter !== 'all' ? RECIPE_STATUS[statusFilter].label : null,
    catFilter ? FRAG_CATS[catFilter].label : null,
  ].filter(Boolean).join(' · ') || '全部';

  // 圖格是第二檢視；有搜尋或篩選時一律顯示清單結果
  const showGrid = view === 'grid' && !search.trim() && statusFilter === 'all' && !catFilter;

  function handleDragStart(cat: FragCat) {
    setDragging(cat);
  }

  function handleDragOver(e: React.DragEvent, cat: FragCat) {
    e.preventDefault();
    if (!dragging || dragging === cat) return;
    const newOrder = [...order];
    const from = newOrder.indexOf(dragging);
    const to = newOrder.indexOf(cat);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragging);
    setOrder(newOrder);
  }

  async function handleDrop() {
    if (dragging) {
      await onSaveCatOrder(order);
    }
    setDragging(null);
  }

  function handleImgClick(cat: FragCat, e: React.MouseEvent) {
    e.stopPropagation();
    setUploadCat(cat);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadCat) return;
    try {
      // 縮圖後再存 — 原圖 base64 會塞爆 user_config，拖垮每次設定同步
      const base64 = await fileToResizedDataUrl(file);
      await onSaveCatImage(uploadCat, base64);
      toast.success('封面已更新');
    } catch (err) {
      toast.error(`封面上傳失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="max-w-content mx-auto px-5 pt-7 pb-24">
      {/* Header */}
      <p className="kicker">FORMULAE</p>
      <h1 className="type-display mt-1">配方</h1>

      {/* 搜尋＋篩選 */}
      <div className="mt-5 flex gap-2 items-start">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="搜尋配方、材料"
          persistent
          className="flex-grow min-w-0"
        />
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
          className={`h-12 px-3.5 shrink-0 border flex items-center gap-2 text-[15px] text-ink ${
            filterOpen || statusFilter !== 'all' || catFilter ? 'border-ink' : 'border-border'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 3 H14 L9.5 8.5 V13 L6.5 14.5 V8.5 Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          </svg>
          篩選
        </button>
      </div>

      {/* 篩選面板 */}
      {filterOpen && (
        <div className="mt-3 space-y-2">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${statusOptions.length}, minmax(0, 1fr))` }}
            role="group"
            aria-label="狀態篩選"
          >
            {statusOptions.map((st, i) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  aria-pressed={active}
                  className={`h-11 text-[13px] flex items-center justify-center gap-1 border-[1.5px] ${
                    i > 0 ? '-ml-[1.5px]' : ''
                  } ${active ? 'bg-ink text-white border-ink relative z-10' : 'border-ink-2 text-ink'}`}
                >
                  {st === 'all' ? '全部' : RECIPE_STATUS[st].label}
                  <span className="tabular-nums">{countByStatus(st)}</span>
                </button>
              );
            })}
          </div>
          {catOptions.length > 0 && (
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="分類篩選">
              {catOptions.map((c) => {
                const active = catFilter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(active ? null : c)}
                    aria-pressed={active}
                    className={`h-11 bg-card border flex items-center justify-center gap-1.5 text-[13px] text-ink ${
                      active ? 'border-ink' : 'border-border'
                    }`}
                  >
                    <span aria-hidden="true" className="w-1.5 h-1.5 shrink-0" style={{ background: FRAG_CAT_COLORS[c].border }} />
                    {FRAG_CATS[c].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 清單標題列 */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-2">
          {condLabel} · <span className="tabular-nums">{showGrid ? recipes.length : listed.length}</span> 款
        </p>
        <div className="flex items-center -mr-3">
          <button
            type="button"
            onClick={() => changeView('list')}
            aria-pressed={view === 'list'}
            aria-label="清單檢視"
            className={`w-11 h-11 flex items-center justify-center ${view === 'list' ? 'text-ink' : 'text-ink-2'}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 4.5 H16 M2 9 H16 M2 13.5 H16" stroke="currentColor" strokeWidth="1.25" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => changeView('grid')}
            aria-pressed={view === 'grid'}
            aria-label="圖格檢視"
            className={`w-11 h-11 flex items-center justify-center ${view === 'grid' ? 'text-ink' : 'text-ink-2'}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1.25" />
              <rect x="10" y="2.5" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1.25" />
              <rect x="2.5" y="10" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1.25" />
              <rect x="10" y="10" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* 清單檢視（預設） */}
      {!showGrid && (
        <div className="mt-1 border-t border-ink">
          {listed.length === 0 && <p className="type-body text-ink-2 py-8 text-center">無結果</p>}
          {listed.map((r) => (
            <RecipeRow key={r.id} recipe={r} onClick={() => onRecipeClick(r.id)} />
          ))}
        </div>
      )}

      {/* 圖格檢視 · Layout 05 — 分類格（拖曳排序、封面上傳） */}
      {showGrid && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-0">
          {order.map((cat, i) => {
            const colors = FRAG_CAT_COLORS[cat];
            const count = countByCat(cat);
            const hasImg = !!catImagesMap[cat];

            return (
              <div
                key={cat}
                draggable
                onDragStart={() => handleDragStart(cat)}
                onDragOver={(e) => handleDragOver(e, cat)}
                onDrop={handleDrop}
                onClick={() => onCatClick(cat)}
                className="relative bg-bg border border-border cursor-pointer overflow-hidden transition-colors hover:border-ink-2"
                style={{
                  aspectRatio: '4/3',
                  borderLeftWidth: 6,
                  borderLeftColor: colors.border,
                  // 單色淡染底 — 方案 A
                  backgroundColor: hasImg ? undefined : colors.bg,
                }}
              >
                {/* 圖片覆蓋（若有上傳） */}
                {hasImg && (
                  <>
                    <img
                      src={catImagesMap[cat]}
                      alt={cat}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                      }}
                    />
                  </>
                )}

                {/* 編號（左上） */}
                <span
                  className="absolute top-3 left-3 font-mono text-[13px] tracking-wide z-10"
                  style={{
                    color: hasImg ? 'rgba(255,255,255,0.85)' : '#6B6459',
                  }}
                >
                  § {String(i + 1).padStart(2, '0')}
                </span>

                {/* 分類色點（右上） */}
                <span
                  className="absolute top-4 right-3 w-1.5 h-1.5 z-10"
                  style={{
                    backgroundColor: hasImg ? '#fff' : colors.border,
                  }}
                />

                {/* 主標英文 + 副標中文（置中） */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 z-10">
                  <p
                    className="font-sans text-[13px] font-normal tracking-[0.32em] uppercase"
                    style={{
                      color: hasImg ? '#fff' : '#1A1A18',
                    }}
                  >
                    {FRAG_CAT_LATIN[cat]}
                  </p>
                  <p
                    className="font-serif text-lg font-medium tracking-wider"
                    style={{
                      color: hasImg ? '#fff' : '#1A1A18',
                    }}
                  >
                    {FRAG_CATS[cat].label}
                  </p>
                </div>

                {/* 底部配方數 */}
                <p
                  className="absolute bottom-2 left-0 right-0 text-center font-mono text-xs tracking-wider tabular-nums uppercase z-10"
                  style={{
                    color: hasImg ? 'rgba(255,255,255,0.8)' : '#6B6459',
                  }}
                >
                  {String(count).padStart(2, '0')} formulae
                </p>

                {/* 上傳封面按鈕（右下角，避開右上角點） */}
                <button
                  onClick={(e) => handleImgClick(cat, e)}
                  className="absolute bottom-0 right-0 min-w-[44px] min-h-[44px] bg-bg/70 flex items-center justify-center text-ink-2 type-micro z-20 hover:bg-bg transition-colors"
                  title="上傳封面圖"
                  aria-label={`為「${FRAG_CATS[cat].label}」上傳封面圖`}
                >
                  ▲
                </button>
              </div>
            );
          })}

          {/* 兩個空槽（vacant slots）— 斜線紋路，暗示擴充位 */}
          {[0, 1].map((i) => (
            <div
              key={`vacant-${i}`}
              className="relative border border-border flex items-center justify-center"
              style={{
                aspectRatio: '4/3',
                background:
                  'repeating-linear-gradient(-45deg, transparent 0 8px, rgba(154,144,128,0.15) 8px 9px)',
              }}
            >
              <span className="font-mono type-micro tracking-wider uppercase">
                — vacant —
              </span>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* FAB */}
      <button
        type="button"
        onClick={() => onNew(catFilter ?? undefined)}
        className="fixed right-5 w-14 h-14 bg-ink text-white text-2xl flex items-center justify-center z-40 hover:bg-ink-2 transition-colors"
        style={{ bottom: 'calc(3.5rem + 1rem + env(safe-area-inset-bottom))' }}
        aria-label="新增配方"
      >
        ＋
      </button>
    </div>
  );
}
