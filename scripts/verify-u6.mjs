/**
 * U6 驗證：備份提醒（反向驗證）。
 * 前置：dev server 於 :5199。 node scripts/verify-u6.mjs
 * smoke 環境永遠是 mock 模式 → 不算 backupDue，總覽與設定選單都不應出現備份提醒字樣。
 * （D2 起示範資料說明與備份提醒移進設定選單。）
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
  // 確認確實是 mock 模式：設定選單內有示範資料說明、沒有備份提醒
  await page.getByRole('button', { name: '設定（示範資料）' }).click();
  await page.waitForTimeout(300);
  const menu = await page.getByRole('dialog', { name: '設定選單' }).innerText();
  assert(menu.includes('示範資料'), '確認處於示範（mock）模式（設定選單有說明）');
  assert(!menu.includes('距上次備份') && !menu.includes('尚未備份'), 'mock 模式設定選單不出現備份提醒');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU6 VERIFY OK');
} finally {
  await browser.close();
}
