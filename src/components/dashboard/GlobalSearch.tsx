import { useState } from 'react';
import type { Recipe, Material, Note } from '../../types';
import { FRAG_CATS } from '../../utils/constants';
import { formatNoteDate } from '../../utils/date';
import { searchRecipes, searchMaterials, searchNotes } from '../../utils/globalSearch';
import { SearchField } from '../shared/SearchField';

interface Props {
  recipes: Recipe[];
  materials: Material[];
  notes: Note[];
  onRecipeClick: (id: number) => void;
  onMaterialClick: (query: string) => void;
  onNoteClick: (query: string) => void;
}

export function GlobalSearch({ recipes, materials, notes, onRecipeClick, onMaterialClick, onNoteClick }: Props) {
  const [q, setQ] = useState('');
  const term = q.trim();

  const recipeHits = searchRecipes(recipes, q);
  const materialHits = searchMaterials(materials, q);
  const noteHits = searchNotes(notes, q);
  const total = recipeHits.length + materialHits.length + noteHits.length;
  const allEmpty = total === 0;

  return (
    <div className="mb-5">
      <SearchField
        value={q}
        onChange={setQ}
        placeholder="搜尋配方、材料、筆記"
        resultCount={total}
        className="w-full"
      />

      {term && (
        <div className="mt-2 bg-card border border-border">
          {allEmpty ? (
            <p className="type-body text-ink-3 px-4 py-4">無結果</p>
          ) : (
            <div className="divide-y divide-border">
              {/* 配方 */}
              <div className="px-4 py-3">
                <p className="section-label mb-2">配方</p>
                <div className="space-y-1">
                  {recipeHits.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onRecipeClick(r.id)}
                      className="block w-full text-left py-1"
                    >
                      <span className="type-name">{r.name}</span>
                      <span className="type-meta ml-2">{r.num} · {FRAG_CATS[r.fragCat]?.label ?? r.fragCat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 材料 */}
              <div className="px-4 py-3">
                <p className="section-label mb-2">材料</p>
                <div className="space-y-1">
                  {materialHits.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onMaterialClick(term)}
                      className="block w-full text-left py-1"
                    >
                      <span className="type-name">{m.displayShort ?? m.name.split('｜')[0]}</span>
                      {m.supplier && <span className="type-meta ml-2">· {m.supplier}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 隨手記 */}
              <div className="px-4 py-3">
                <p className="section-label mb-2">隨手記</p>
                <div className="space-y-1">
                  {noteHits.map((n) => {
                    const { date } = formatNoteDate(n.ts);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onNoteClick(term)}
                        className="block w-full text-left py-1"
                      >
                        <span className="type-meta">{date}</span>
                        <span className="type-body ml-2">{n.text.slice(0, 60)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
