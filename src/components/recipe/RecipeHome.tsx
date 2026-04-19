import { useState, useRef } from 'react';
import type { Recipe, FragCat } from '../../types';
import { FRAG_CATS, FRAG_CAT_COLORS } from '../../utils/constants';
import { SearchField } from '../shared/SearchField';

interface Props {
  recipes: Recipe[];
  catImagesMap: Record<string, string>;
  catOrder: FragCat[] | null;
  onCatClick: (cat: FragCat) => void;
  onSaveCatImage: (catId: string, base64: string) => Promise<void>;
  onSaveCatOrder: (order: FragCat[]) => Promise<void>;
}

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
  onSaveCatImage,
  onSaveCatOrder,
}: Props) {
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<FragCat | null>(null);
  const [order, setOrder] = useState<FragCat[]>(catOrder ?? DEFAULT_ORDER);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCat, setUploadCat] = useState<FragCat | null>(null);

  const countByCat = (cat: FragCat) => recipes.filter((r) => r.fragCat === cat).length;

  const filtered = search
    ? recipes.filter(
        (r) =>
          r.name.includes(search) ||
          r.num.includes(search) ||
          (r.tags ?? []).some((t) => t.includes(search)),
      )
    : null;

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
    if (!file || !uploadCat) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      await onSaveCatImage(uploadCat, base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h1 className="type-title shrink-0">配方</h1>
        <div className="flex items-center gap-3 min-w-0">
          <p className="font-mono type-micro tracking-wider uppercase hidden sm:block whitespace-nowrap">
            {order.length} cats · {recipes.length} formulae
          </p>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="配方名稱、編號、標籤"
            resultCount={filtered?.length}
            className="w-full sm:w-[320px]"
          />
        </div>
      </div>

      {/* Search results */}
      {filtered && (
        <div className="space-y-2 mb-6">
          {filtered.length === 0 && (
            <p className="type-body text-ink-3">無結果</p>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => onCatClick(r.fragCat)}
              className="w-full text-left bg-card border border-border px-4 py-3 hover:border-ink-2 transition-colors"
            >
              <p className="type-name">{r.name}</p>
              <p className="type-meta">
                {r.num} · {FRAG_CATS[r.fragCat]?.label ?? r.fragCat}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Category grid · Layout 05 — 3×4 留一格空 */}
      {!filtered && (
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
                  className="absolute bottom-2 left-0 right-0 text-center font-mono text-[9px] tracking-wider uppercase z-10"
                  style={{
                    color: hasImg ? 'rgba(255,255,255,0.8)' : '#6B6459',
                  }}
                >
                  {String(count).padStart(2, '0')} formulae
                </p>

                {/* 上傳封面按鈕（右下角，避開右上角點） */}
                <button
                  onClick={(e) => handleImgClick(cat, e)}
                  className="absolute bottom-2 right-2 w-7 h-7 bg-bg/70 flex items-center justify-center text-ink-2 type-micro z-20 hover:bg-bg transition-colors"
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
    </div>
  );
}
