/** 三段式組合：空段落以 '—' 佔位，保證輸出永遠是合法三段式 */
export function composeMaterialName(product: string, supplier: string, gradeOrOrigin: string): string {
  const seg = (s: string) => s.trim() || '—';
  return `${seg(product)}｜${seg(supplier)}｜${seg(gradeOrOrigin)}`;
}

/** 拆解：恰好 3 段 → 各段 trim、'—' 還原為 ''；否則整串當品名 */
export function splitMaterialName(name: string): { product: string; supplier: string; gradeOrOrigin: string; isThreeSeg: boolean } {
  const parts = name.split('｜');
  if (parts.length === 3) {
    const clean = (s: string) => { const t = s.trim(); return t === '—' ? '' : t; };
    return { product: clean(parts[0]), supplier: clean(parts[1]), gradeOrOrigin: clean(parts[2]), isThreeSeg: true };
  }
  return { product: name.trim(), supplier: '', gradeOrOrigin: '', isThreeSeg: false };
}
