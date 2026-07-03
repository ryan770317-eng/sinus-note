import { describe, it, expect } from 'vitest';
import { stars, starsFilled, supplierShort } from '../format';
import { versionTag } from '../id';

describe('stars', () => {
  it('正常區間', () => {
    expect(stars(3)).toBe('★★★☆☆');
    expect(stars(0)).toBe('☆☆☆☆☆');
    expect(stars(5)).toBe('★★★★★');
  });

  it('髒資料不炸（rating > 5 以前會 RangeError）', () => {
    expect(stars(7)).toBe('★★★★★');
    expect(stars(-2)).toBe('☆☆☆☆☆');
    expect(stars(NaN)).toBe('☆☆☆☆☆');
  });

  it('starsFilled 只出實心', () => {
    expect(starsFilled(2)).toBe('★★');
    expect(starsFilled(9)).toBe('★★★★★');
  });
});

describe('supplierShort', () => {
  it('4 字以內全顯，超過取前 2 字', () => {
    expect(supplierShort('晶衍')).toBe('晶衍');
    expect(supplierShort('香華天國際')).toBe('香華');
    expect(supplierShort('')).toBe('');
  });
});

describe('versionTag', () => {
  it('進位不撞號', () => {
    expect(versionTag(1)).toBe('V-A');
    expect(versionTag(26)).toBe('V-Z');
    expect(versionTag(27)).toBe('V-AA');
    expect(versionTag(0)).toBe('V-A');
  });
});
