import { describe, it, expect } from 'vitest';
import { composeMaterialName, splitMaterialName } from '../materialName';

describe('composeMaterialName', () => {
  it('三段皆有值', () => {
    expect(composeMaterialName('乳香', '晶衍', '皇家綠')).toBe('乳香｜晶衍｜皇家綠');
  });

  it('空段落以 — 佔位', () => {
    expect(composeMaterialName('乳香', '', '')).toBe('乳香｜—｜—');
    expect(composeMaterialName('乳香', '  ', '索馬利亞')).toBe('乳香｜—｜索馬利亞');
  });

  it('前後空白會被 trim', () => {
    expect(composeMaterialName('  沉香粉 ', ' 大然 ', ' 越南 ')).toBe('沉香粉｜大然｜越南');
  });
});

describe('splitMaterialName', () => {
  it('恰好三段 → 拆解且 isThreeSeg=true', () => {
    expect(splitMaterialName('乳香｜晶衍｜皇家綠')).toEqual({
      product: '乳香', supplier: '晶衍', gradeOrOrigin: '皇家綠', isThreeSeg: true,
    });
  });

  it('— 佔位還原為空字串', () => {
    expect(splitMaterialName('乳香｜—｜—')).toEqual({
      product: '乳香', supplier: '', gradeOrOrigin: '', isThreeSeg: true,
    });
  });

  it('非三段式輸入 → 整串當品名，isThreeSeg=false', () => {
    expect(splitMaterialName('沉香粉')).toEqual({
      product: '沉香粉', supplier: '', gradeOrOrigin: '', isThreeSeg: false,
    });
    expect(splitMaterialName('乳香｜晶衍')).toEqual({
      product: '乳香｜晶衍', supplier: '', gradeOrOrigin: '', isThreeSeg: false,
    });
  });

  it('雙向 round-trip：compose → split 還原各段', () => {
    const name = composeMaterialName('乳香', '晶衍', '皇家綠');
    const parts = splitMaterialName(name);
    expect(parts.product).toBe('乳香');
    expect(parts.supplier).toBe('晶衍');
    expect(parts.gradeOrOrigin).toBe('皇家綠');
  });

  it('含空段的 round-trip 還原為空字串', () => {
    const name = composeMaterialName('沉香粉', '', '');
    expect(splitMaterialName(name)).toEqual({
      product: '沉香粉', supplier: '', gradeOrOrigin: '', isThreeSeg: true,
    });
  });
});
