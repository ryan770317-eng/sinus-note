import { describe, it, expect } from 'vitest';
import { stars, starsFilled, supplierShort, fmtAmount, scaleFactor } from '../format';
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

describe('fmtAmount', () => {
  it('四捨五入到 2 位並去尾零', () => {
    expect(fmtAmount(21.749999)).toBe('21.75');
    expect(fmtAmount(3)).toBe('3');
    expect(fmtAmount(2.5)).toBe('2.5');
    expect(fmtAmount(10.001)).toBe('10');
  });
});

describe('scaleFactor', () => {
  it('正常換算', () => {
    expect(scaleFactor(20, 50)).toBe(2.5);
  });
  it('totalWeight<=0 或 target 無效時回 1', () => {
    expect(scaleFactor(0, 50)).toBe(1);
    expect(scaleFactor(20, null)).toBe(1);
    expect(scaleFactor(20, -5)).toBe(1);
    expect(scaleFactor(20, 0)).toBe(1);
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
