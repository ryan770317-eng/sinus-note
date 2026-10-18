/**
 * D6 驗證：材料庫（Materials 畫板）。
 * 前置：dev server 於 :5199。 node scripts/verify-d6.mjs
 * 「全部」分類下搜尋「乳香」有結果且卡片帶分類小標；新增 sheet 點「更多欄位」出現「學名」；
 * 點材料卡展開鈕出現「完整名稱」或「產地」欄位。無 pageerror。
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

  assert(await page.getByRole('button', { name: '全部', exact: true }).first().getAttribute('aria-pressed') === 'true', '預設分類為「全部」');
  await page.getByPlaceholder('搜尋材料、供應商').fill('乳香');
  await page.waitForTimeout(300);
  const card = page.locator('[role="button"][aria-expanded]').filter({ hasText: '乳香' }).first();
  assert(await card.count() === 1, '搜尋「乳香」出現結果');
  assert((await card.innerText()).includes('樹脂'), '搜尋結果卡片帶分類小標「樹脂」');

  // 展開鈕
  await page.getByRole('button', { name: /^展開 乳香/ }).first().click();
  await page.waitForTimeout(200);
  const expanded = await card.innerText();
  assert(expanded.includes('完整名稱') || expanded.includes('產地'), '展開後出現「完整名稱」或「產地」欄位');

  // 新增 sheet → 更多欄位
  await page.getByPlaceholder('搜尋材料、供應商').fill('');
  await page.getByRole('button', { name: '新增材料' }).click();
  await page.waitForTimeout(300);
  const dialog = page.getByRole('dialog', { name: '新增材料' });
  assert(await dialog.getByLabel('學名').count() === 0, '更多欄位預設收合（沒有「學名」欄位）');
  await dialog.getByRole('button', { name: /^更多欄位/ }).click();
  await page.waitForTimeout(200);
  assert(await dialog.getByLabel('學名').count() === 1, '點「更多欄位」後出現「學名」欄位');
  assert(await page.getByRole('button', { name: '新增材料' }).count() === 0, 'sheet 開著時 FAB 隱藏');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nD6 VERIFY OK');
} finally {
  await browser.close();
}
