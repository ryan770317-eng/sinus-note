import { describe, it, expect } from 'vitest';
import { recipeStatusDot } from '../status';
import type { RecipeStatus } from '../../types';

describe('recipeStatusDot', () => {
  it('待製為空心', () => {
    expect(recipeStatusDot('pending')).toMatchObject({ label: '待製', outlined: true });
  });
  it('成功為實心暖棕', () => {
    expect(recipeStatusDot('success')).toEqual({ color: '#8B6F52', label: '成功', outlined: false });
  });
  it('未知狀態（髒資料）回落待製', () => {
    expect(recipeStatusDot('weird' as RecipeStatus)).toMatchObject({ label: '待製', outlined: true });
  });
});
