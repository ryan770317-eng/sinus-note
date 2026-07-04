/**
 * U5 驗證：製作核對模式。
 * 前置：dev server 於 :5199。 node scripts/verify-u5.mjs
 * 進沉木供香（假）詳情 → 開始製作（已稱 0/5）→ 勾兩項（2/5 + line-through）→
 * 重新整理再進 → 仍 2/5（sessionStorage 續存）→ 全勾 → 完成稱料 → 預期錯誤 toast。
 * 無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

async function gotoRecipeDetail(page) {
  await page.getByRole('tab', { name: '切換到配方分頁' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('供香', { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('沉木供香（假）').first().click();
  await page.waitForTimeout(400);
}

const { browser, page, pageErrors } = await launchApp();
try {
  await gotoRecipeDetail(page);

  await page.getByRole('button', { name: '開始製作' }).click();
  await page.waitForTimeout(300);
  let body = await page.locator('body').innerText();
  assert(body.includes('已稱 0/5'), '開始製作後顯示「已稱 0/5」');

  // 勾兩項
  await page.getByRole('button', { name: '已稱 沉香粉' }).click();
  await page.getByRole('button', { name: '已稱 白檀粉' }).click();
  await page.waitForTimeout(300);
  body = await page.locator('body').innerText();
  assert(body.includes('已稱 2/5'), '勾兩項後顯示「已稱 2/5」');
  const struckCount = await page.locator('p.line-through').count();
  assert(struckCount >= 2, `已勾項目顯示刪除線（line-through 數=${struckCount}）`);

  // 重新整理 → 再進同配方開製作模式 → 續存驗證
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await gotoRecipeDetail(page);
  await page.getByRole('button', { name: '開始製作' }).click();
  await page.waitForTimeout(300);
  body = await page.locator('body').innerText();
  assert(body.includes('已稱 2/5'), '重新整理後仍為「已稱 2/5」（sessionStorage 續存）');

  // 全勾
  for (const name of ['已稱 乳香', '已稱 丁香', '已稱 楠木粉']) {
    await page.getByRole('button', { name }).click();
  }
  await page.waitForTimeout(300);
  body = await page.locator('body').innerText();
  assert(body.includes('已稱 5/5'), '全勾後顯示「已稱 5/5」');

  // 完成稱料 → 預期錯誤 toast（smoke 環境建立工序失敗）
  await page.getByRole('button', { name: /完成稱料/ }).click();
  let toastText = '';
  for (let i = 0; i < 40; i++) {
    const loc = page.getByText(/失敗/);
    if (await loc.count()) { toastText = await loc.first().innerText(); break; }
    await page.waitForTimeout(300);
  }
  assert(/失敗/.test(toastText), `完成稱料後出現錯誤 toast（實際："${toastText.trim()}"）`);

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU5 VERIFY OK');
} finally {
  await browser.close();
}
