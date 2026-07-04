import { describe, it, expect } from 'vitest';
import { searchRecipes, searchMaterials, searchNotes } from '../globalSearch';
import type { Recipe, Material, Note } from '../../types';

function recipe(over: Partial<Recipe>): Recipe {
  return {
    id: 1, num: 'V-A', name: '配方', fragCat: 'shrine', status: 'pending', rating: 0,
    tags: [], process: { tincture: false, ferment: false, wine: false, notes: '' },
    timeline: { makeDate: '', dryDays: 0, agingStart: '', agingNotes: '' },
    versions: [], burnLog: [], createdAt: '', updatedAt: '', ...over,
  };
}
function material(over: Partial<Material>): Material {
  return { id: 'm1', cat: 'base', name: '材料', origin: '', supplier: '', note: '', stock: { qty: 0, unit: 'g', note: '' }, ...over };
}
function note(over: Partial<Note>): Note {
  return { id: 'n1', text: '', ts: 0, ...over };
}

describe('searchRecipes', () => {
  const recipes = [
    recipe({ id: 1, name: '沉木供香', tags: ['供香'] }),
    recipe({ id: 2, num: 'V-Z', name: '草本' }),
  ];
  it('命中 name/num/tags', () => {
    expect(searchRecipes(recipes, '沉木').map((r) => r.id)).toEqual([1]);
    expect(searchRecipes(recipes, '供香').map((r) => r.id)).toEqual([1]);
    expect(searchRecipes(recipes, 'v-z').map((r) => r.id)).toEqual([2]);
  });
  it('大小寫不敏感', () => {
    expect(searchRecipes([recipe({ id: 3, name: 'Amber' })], 'amber').length).toBe(1);
  });
  it('limit 截斷', () => {
    const many = Array.from({ length: 8 }, (_, i) => recipe({ id: i, name: '木' }));
    expect(searchRecipes(many, '木', 5).length).toBe(5);
  });
  it('空 query 回空', () => {
    expect(searchRecipes(recipes, '  ')).toEqual([]);
  });
});

describe('searchMaterials', () => {
  const materials = [
    material({ id: 'a', name: '乳香', displayShort: '乳', species: 'Boswellia', origin: '阿曼', supplier: '晶衍', aliases: ['frankincense'] }),
    material({ id: 'b', name: '沒藥' }),
  ];
  it('命中各欄位', () => {
    expect(searchMaterials(materials, '乳香').map((m) => m.id)).toEqual(['a']);
    expect(searchMaterials(materials, 'boswellia').map((m) => m.id)).toEqual(['a']);
    expect(searchMaterials(materials, '阿曼').map((m) => m.id)).toEqual(['a']);
    expect(searchMaterials(materials, '晶衍').map((m) => m.id)).toEqual(['a']);
    expect(searchMaterials(materials, 'frankincense').map((m) => m.id)).toEqual(['a']);
  });
  it('大小寫不敏感', () => {
    expect(searchMaterials(materials, 'BOSWELLIA').length).toBe(1);
  });
  it('limit 截斷', () => {
    const many = Array.from({ length: 8 }, (_, i) => material({ id: String(i), name: '香' }));
    expect(searchMaterials(many, '香', 5).length).toBe(5);
  });
  it('空 query 回空', () => {
    expect(searchMaterials(materials, '')).toEqual([]);
  });
});

describe('searchNotes', () => {
  const notes = [
    note({ id: 'n1', text: '今天試聞了沉木供香' }),
    note({ id: 'n2', text: '艾草酊劑觀察' }),
  ];
  it('命中 text', () => {
    expect(searchNotes(notes, '沉木').map((n) => n.id)).toEqual(['n1']);
  });
  it('大小寫不敏感', () => {
    expect(searchNotes([note({ id: 'x', text: 'Frankincense note' })], 'FRANK').length).toBe(1);
  });
  it('limit 截斷（預設 3）', () => {
    const many = Array.from({ length: 6 }, (_, i) => note({ id: String(i), text: '香' }));
    expect(searchNotes(many, '香').length).toBe(3);
  });
  it('空 query 回空', () => {
    expect(searchNotes(notes, '   ')).toEqual([]);
  });
});
