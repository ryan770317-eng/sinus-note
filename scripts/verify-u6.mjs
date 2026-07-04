/**
 * U6 驗證：備份提醒（反向驗證）。
 * 前置：dev server 於 :5199。 node scripts/verify-u6.mjs
 * smoke 環境永遠是 mock 模式 → BackupReminder 不渲染，總覽頁不應出現提醒橫幅字樣。
 * 正向顯示邏輯由單元測試涵蓋（需真資料帳號才能於瀏覽器實測）。無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  // 停在總覽（預設分頁）
  await page.waitForTimeout(300);
  const body = await page.locator('body').innerText();

  assert(!body.includes('尚未匯出過備份'), 'mock 模式不出現「尚未匯出過備份」提醒');
  assert(!body.includes('距上次備份'), 'mock 模式不出現「距上次備份」提醒');
  // 確認確實在總覽（示範資料橫幅在，證明是 mock 模式）
  assert(body.includes('示範資料'), '確認處於示範（mock）模式');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU6 VERIFY OK');
} finally {
  await browser.close();
}
