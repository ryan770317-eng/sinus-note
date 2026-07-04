import { describe, it, expect } from 'vitest';
import { mergePatch } from '../export';
import type { Recipe, Material, Task } from '../../types';

function recipe(id: number, name: string): Recipe {
  return {
    id, num: `V-${id}`, name, fragCat: 'test', status: 'pending', rating: 0, tags: [],
    process: { tincture: false, ferment: false, wine: false, notes: '' },
    timeline: { makeDate: '', dryDays: 0, agingStart: '', agingNotes: '' },
    versions: [], burnLog: [], createdAt: '', updatedAt: '',
  };
}

function material(id: string, name: string): Material {
  return { id, cat: 'base', name, origin: '', supplier: '', note: '', stock: { qty: 0, unit: 'g', note: '' } };
}

function task(id: string, title: string, startDate: string): Task {
  return {
    id, title, material: '', recipeId: null, taskType: 'other', status: 'waiting',
    startDate, dueDate: null, completedDate: null, notes: '', checkpoints: [], createdAt: '', updatedAt: '',
  };
}

describe('mergePatch', () => {
  it('同名配方跳過、新配方重新編號避免撞現有 id', () => {
    const existing = { recipes: [recipe(201, '既有配方')], materials: [], tasks: [] };
    // patch 內的配方 id=201 與現有配方撞號，但名稱不同 → 必須追加且改 id
    const patch = { recipes: [recipe(201, '新配方'), recipe(202, '既有配方')] };
    const merged = mergePatch(existing, patch, 202);

    expect(merged.added.recipes).toBe(1);
    expect(merged.recipes).toHaveLength(2);
    const added = merged.recipes.find((r) => r.name === '新配方')!;
    expect(added.id).not.toBe(201); // 不可覆蓋既有 id
    expect(added.id).toBeGreaterThanOrEqual(202);
    expect(merged.nextId).toBeGreaterThan(added.id);
  });

  it('材料以 cat+name 去重，id 撞號時重生', () => {
    const existing = { recipes: [], materials: [material('mu1', '乳香')], tasks: [] };
    const patch = { materials: [material('mu1', '沒藥'), material('mu2', '乳香')] };
    const merged = mergePatch(existing, patch, 200);

    expect(merged.added.materials).toBe(1);
    const added = merged.materials.find((m) => m.name === '沒藥')!;
    expect(added.id).not.toBe('mu1');
  });

  it('工序以 title+startDate 去重', () => {
    const existing = { recipes: [], materials: [], tasks: [task('tk1', '酊劑', '2026-01-01')] };
    const patch = { tasks: [task('tk9', '酊劑', '2026-01-01'), task('tk1', '發酵', '2026-02-01')] };
    const merged = mergePatch(existing, patch, 200);

    expect(merged.added.tasks).toBe(1);
    const added = merged.tasks.find((t) => t.title === '發酵')!;
    expect(added.id).not.toBe('tk1'); // 撞 id 需重生
  });

  it('空 patch 不動任何東西', () => {
    const existing = { recipes: [recipe(201, 'A')], materials: [], tasks: [] };
    const merged = mergePatch(existing, {}, 202);
    expect(merged.recipes).toHaveLength(1);
    expect(merged.added).toEqual({ recipes: 0, materials: 0, tasks: 0 });
  });
});
