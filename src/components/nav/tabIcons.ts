import type { TabId } from './BottomNav';
import {
  IconOverview,
  IconRecipe,
  IconTask,
  IconMaterial,
  IconNotes,
} from './NavIcons';

type IconProps = {
  className?: string;
  size?: number;
};

export const TAB_ICONS: Record<TabId, (p: IconProps) => React.JSX.Element> = {
  overview: IconOverview,
  recipe:   IconRecipe,
  task:     IconTask,
  material: IconMaterial,
  notes:    IconNotes,
};
