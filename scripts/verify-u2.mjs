/**
 * U2 驗證：材料名稱三段式拆欄。
 * 前置：dev server 於 :5199（見 smoke.mjs 頂部說明）。
 *   node scripts/verify-u2.mjs
 * 預期：新增材料表單顯示「品名」欄、無「三段式」字樣；送出後因 smoke 環境
 *   網路必失敗而出現「儲存失敗」錯誤 toast（＝寫入線路接通）；無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  // 切到材料分頁
  await page.getByRole('tab', { name: '切換到材料分頁' }).first().click();
  await page.waitForTimeout(400);

  // 開新增材料表單
  await page.getByRole('button', { name: '新增材料' }).click();
  await page.waitForTimeout(300);

  const hasProductLabel = await page.getByText('品名', { exact: false }).count();
  assert(hasProductLabel > 0, '表單出現「品名」label');

  const hasThreeSeg = await page.getByText('三段式').count();
  assert(hasThreeSeg === 0, '表單不再出現「三段式」字樣');

  // 填品名 + 供應商 + 產地
  await page.locator('#mat-name').fill('U2測試品名');
  await page.locator('input[list="supplier-options"]').fill('U2供應商');
  await page.locator('label:text-is("產地") ~ input').fill('越南');

  // 送出
  await page.locator('button[type="submit"]').click();

  // 等錯誤 toast（smoke 環境對假 Supabase 寫入必失敗）
  let toastText = '';
  for (let i = 0; i < 40; i++) {
    const loc = page.getByText(/失敗/);
    if (await loc.count()) { toastText = await loc.first().innerText(); break; }
    await page.waitForTimeout(300);
  }
  assert(/失敗/.test(toastText), `送出後出現錯誤 toast（實際："${toastText.trim()}"）`);

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU2 VERIFY OK');
} finally {
  await browser.close();
}
