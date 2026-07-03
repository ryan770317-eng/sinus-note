/** 星等顯示：★★★☆☆。rating 超出 0–5（髒資料）時 clamp，
 *  否則 '☆'.repeat(5 - rating) 會因負數丟 RangeError 讓整頁掛掉。 */
export function stars(rating: number, max = 5): string {
  const r = Math.min(max, Math.max(0, Math.round(rating || 0)));
  return '★'.repeat(r) + '☆'.repeat(max - r);
}

/** 只有實心星（列表用）：rating ≤ 0 回傳空字串 */
export function starsFilled(rating: number, max = 5): string {
  const r = Math.min(max, Math.max(0, Math.round(rating || 0)));
  return '★'.repeat(r);
}

/** 供應商簡稱（≤4 字全顯，否則取前 2 字） */
export function supplierShort(supplier: string): string {
  if (!supplier) return '';
  return supplier.length <= 4 ? supplier : supplier.slice(0, 2);
}
