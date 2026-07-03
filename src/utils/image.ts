/** 把上傳圖片縮到 maxDim 內再轉 dataURL。
 *  分類封面存在 user_config 的 jsonb 裡，每次 config 同步都會整包帶著 —
 *  手機原圖動輒數 MB base64，不縮圖會拖垮每一次設定寫入與 realtime 推送。 */
export async function fileToResizedDataUrl(file: File, maxDim = 800, quality = 0.8): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('讀取圖片失敗'));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('圖片格式無法解析'));
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  // 已經夠小就不重壓（避免 PNG 轉 JPEG 反而變糊）
  if (scale === 1 && file.size < 300 * 1024) return dataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
