import { describe, it, expect } from 'vitest';
import { parseRecipes, parseMaterials, parseTasks } from '../index';

describe('parseRecipes', () => {
  it('缺 id 的配方整筆丟棄，其他欄位缺失用 fallback 補', () => {
    const parsed = parseRecipes([
      { name: '沒有 id' },
      { id: 201, name: '正常', fragCat: 'wood' },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(201);
    expect(parsed[0].status).toBe('pending');
    expect(parsed[0].versions).toEqual([]);
  });

  it('legacy botanical cat 轉為 herb', () => {
    const parsed = parseRecipes([{
      id: 1,
      versions: [{ label: 'v', totalWeight: 10, ingredients: [{ cat: 'botanical', name: 'x', amount: 1, unit: 'g' }], notes: '', comments: [] }],
    }]);
    expect(parsed[0].versions[0].ingredients[0].cat).toBe('herb');
  });

  it('非陣列輸入回空陣列', () => {
    expect(parseRecipes(null)).toEqual([]);
    expect(parseRecipes('oops')).toEqual([]);
  });
});

describe('parseMaterials', () => {
  it('v2.1 選填欄位缺失不影響解析', () => {
    const parsed = parseMaterials([{ id: 'mu1', cat: 'base', name: '沉香' }]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].stock).toEqual({ qty: 0, unit: 'g', note: '' });
    expect(parsed[0].speciesGroup).toBeUndefined();
  });

  it('未知 testStatus 落回 pending', () => {
    const parsed = parseMaterials([{ id: 'mu1', cat: 'base', name: 'x', testStatus: 'weird' }]);
    expect(parsed[0].testStatus).toBe('pending');
  });
});

describe('parseTasks', () => {
  it('未知 taskType / status 落回安全值', () => {
    const parsed = parseTasks([{ id: 'tk1', taskType: 'unknown', status: 'unknown' }]);
    expect(parsed[0].taskType).toBe('other');
    expect(parsed[0].status).toBe('waiting');
  });
});
