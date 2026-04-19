import type { Material, IngredientCat } from '../../types';
import { ING_CATS, ING_CAT_COLORS } from '../../utils/constants';
import { SectionHeader } from '../shared/SectionHeader';

interface Props {
  materials: Material[];
  onOpen: () => void;
}

export function MaterialOverviewSection({ materials, onOpen }: Props) {
  if (materials.length === 0) return null;

  const countByCat: Record<string, number> = {};
  for (const m of materials) countByCat[m.cat] = (countByCat[m.cat] ?? 0) + 1;

  return (
    <div className="mb-6">
      <SectionHeader title="材料庫概況" count={materials.length} onMore={onOpen} />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(ING_CATS) as IngredientCat[]).map((cat) => {
          const count = countByCat[cat] ?? 0;
          if (count === 0) return null;
          const catColor = ING_CAT_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={onOpen}
              className="flex items-center justify-between bg-card border border-border px-3 py-2.5 hover:border-ink-2 transition-colors"
              style={{ borderLeftWidth: 3, borderLeftColor: catColor }}
              aria-label={`${ING_CATS[cat].label}：${count} 項`}
            >
              <p className="text-xs font-light" style={{ color: catColor }}>{ING_CATS[cat].label}</p>
              <p className="type-name" style={{ color: catColor }}>{count}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
