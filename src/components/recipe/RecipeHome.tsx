import { useState, useRef } from 'react';
import type { Recipe, FragCat } from '../../types';
import { FRAG_CATS, FRAG_CAT_COLORS } from '../../utils/constants';

interface Props {
  recipes: Recipe[];
  catImagesMap: Record<string, string>;
  catOrder: FragCat[] | null;
  onCatClick: (cat: FragCat) => void;
  onSaveCatImage: (catId: string, base64: string) => Promise<void>;
  onSaveCatOrder: (order: FragCat[]) => Promise<void>;
}

const DEFAULT_ORDER = Object.keys(FRAG_CATS) as FragCat[];

export function RecipeHome({ recipes, catImagesMap, catOrder, onCatClick, onSaveCatImage, onSaveCatOrder }: Props) {
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
      <h1 className="font-serif text-xl text-ink tracking-wide mb-5">配方</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋配方名稱、編號、標籤..."
        className="input-field mb-6"
      />

      {/* Search results */}
      {filtered && (
        <div className="space-y-2 mb-6">
          {filtered.length === 0 && <p className="text-sm text-ink-3 font-light">無結果</p>}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => onCatClick(r.fragCat)}
              className="w-full text-left bg-card border border-border px-4 py-3 hover:border-ink-2 transition-colors"
            >
              <p className="font-serif text-sm text-ink">{r.name}</p>
              <p className="text-xs text-ink-2 font-light">{r.num} · {FRAG_CATS[r.fragCat]?.label ?? r.fragCat}</p>
            </button>
          ))}
        </div>
      )}

      {/* Category grid */}
      {!filtered && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {order.map((cat) => (
            <div
              key={cat}
              draggable
              onDragStart={() => handleDragStart(cat)}
              onDragOver={(e) => handleDragOver(e, cat)}
              onDrop={handleDrop}
              onClick={() => onCatClick(cat)}
              className="relative bg-card border cursor-pointer hover:border-ink-2 transition-colors overflow-hidden"
              style={{
                aspectRatio: '4/3',
                borderColor: FRAG_CAT_COLORS[cat].border,
                borderLeftWidth: 3,
              }}
            >
              {catImagesMap[cat] ? (
                <>
                  <img src={catImagesMap[cat]} alt={cat} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
                </>
              ) : (
                <div className="absolute inset-0" style={{ background: FRAG_CAT_COLORS[cat].bg }} />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-3">
                <p className="font-serif text-sm relative z-10" style={{ color: catImagesMap[cat] ? '#fff' : FRAG_CAT_COLORS[cat].text }}>{FRAG_CATS[cat].label}</p>
                <p className="text-xs font-light relative z-10" style={{ color: catImagesMap[cat] ? 'rgba(255,255,255,0.8)' : FRAG_CAT_COLORS[cat].text, opacity: catImagesMap[cat] ? 1 : 0.7 }}>{countByCat(cat)} 個配方</p>
              </div>
              <button
                onClick={(e) => handleImgClick(cat, e)}
                className="absolute top-2 right-2 w-9 h-9 bg-bg/70 flex items-center justify-center text-ink-2 text-xs z-20"
                title="上傳封面圖"
                aria-label={`為「${FRAG_CATS[cat].label}」上傳封面圖`}
              >
                ▲
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
