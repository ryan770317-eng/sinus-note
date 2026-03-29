import { RECIPE_STATUS } from '../../utils/constants';
import type { RecipeStatus } from '../../types';

interface Props {
  status: RecipeStatus;
}

export function StatusBadge({ status }: Props) {
  const s = RECIPE_STATUS[status];
  return (
    <span
      className="text-xs tracking-label border px-2 py-0.5 font-light"
      style={{ borderColor: s.color, color: s.color }}
    >
      {s.label}
    </span>
  );
}
