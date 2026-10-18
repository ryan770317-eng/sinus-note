import { describe, it, expect } from 'vitest';
import { ingredientDisplay } from '../ingredient';
import type { Ingredient, Material } from '../../types';

const ing: Ingredient = { cat: 'resin', name: '乳香｜晶衍｜阿曼', amount: 1, unit: 'g' };
const mat = (displayShort?: string): Material => ({
  id: 'm', cat: 'resin', name: ing.name, origin: '', supplier: '', note: '', stock: { qty: 0, unit: 'g', note: '' }, displayShort,
});

describe('ingredientDisplay', () => {
  it('優先 displayShort', () => expect(ingredientDisplay(ing, mat('乳香'))).toBe('乳香'));
  it('沒有簡稱或未對應時用快照名', () => {
    expect(ingredientDisplay(ing, mat())).toBe(ing.name);
    expect(ingredientDisplay(ing, null)).toBe(ing.name);
  });
});
