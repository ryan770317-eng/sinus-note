export type TaskStatus = 'prep' | 'processing' | 'waiting' | 'ready' | 'done';

export type TaskType =
  | 'harvest' | 'dry' | 'grind' | 'tincture' | 'ferment'
  | 'enzyme' | 'paoZhi' | 'honey' | 'aging'
  | 'weigh' | 'shape'
  | 'stickDry' | 'cellar' | 'burn'
  | 'other';

export interface Checkpoint {
  date: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  material: string;
  recipeId: number | null;
  taskType: TaskType;
  status: TaskStatus;
  startDate: string;
  dueDate: string | null;
  completedDate: string | null;
  notes: string;
  checkpoints: Checkpoint[];
  createdAt: string;
  updatedAt: string;
}
