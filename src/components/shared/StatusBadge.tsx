import { RECIPE_STATUS } from '../../utils/constants';
import type { RecipeStatus } from '../../types';

interface Props {
  status: RecipeStatus;
}

export function StatusBadge({ status }: Props) {
  const s = RECIPE_STATUS[status];
  return (
    <span
      className="text-xs tracking-label px-2 py-0.5 font-light"
      style={{ background: s.color, color: '#F5F1EB' }}
    >
      {s.label}
    </span>
  );
}
