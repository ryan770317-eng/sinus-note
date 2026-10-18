/**
 * U2 驗證：材料名稱三段式拆欄（D6 起表單改為 bottom sheet）。
 * 前置：dev server 於 :5199（見 smoke.mjs 頂部說明）。
 *   node scripts/verify-u2.mjs
 * 預期：點 FAB → role=dialog 含「新增材料」「品名」、無「三段式」字樣；
 *   填品名／供應商／產地送出 → smoke 環境寫入必失敗 → 「新增材料失敗」錯誤 toast；無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  await page.getByRole('tab', { name: '切換到材料分頁' }).first().click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: '新增材料' }).click();
  await page.waitForTimeout(300);

  const dialog = page.getByRole('dialog', { name: '新增材料' });
  assert(await dialog.count() === 1, '點 FAB 後出現 role=dialog「新增材料」');
  const text = await dialog.innerText();
  assert(text.includes('品名'), 'sheet 內出現「品名」');
  assert(!text.includes('三段式'), 'sheet 內不出現「三段式」字樣');

  await page.locator('#mat-name').fill('U2測試品名');
  await page.locator('#mat-supplier').fill('U2供應商');
  await page.locator('#mat-origin').fill('越南');

  await dialog.getByRole('button', { name: '儲存' }).click();

  let toastText = '';
  for (let i = 0; i < 40; i++) {
    const loc = page.getByText(/新增材料失敗/);
    if (await loc.count()) { toastText = await loc.first().innerText(); break; }
    await page.waitForTimeout(300);
  }
  assert(/新增材料失敗/.test(toastText), `送出後出現「新增材料失敗」錯誤 toast（實際："${toastText.trim()}"）`);

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU2 VERIFY OK');
} finally {
  await browser.close();
}
