/**
 * U4 驗證：總覽頁全域搜尋。
 * 前置：dev server 於 :5199。 node scripts/verify-u4.mjs
 * 總覽搜「乳香」→ 面板同時出現配方/材料區塊；點材料結果 → 切到材料分頁、
 * 搜尋框帶入「乳香」、結果卡片帶分類小標「樹脂」（搜尋時忽略分類篩選）；
 * 回總覽搜「沉木」點配方結果 → 進入詳情。無 pageerror。
 * （D9：搜尋框已常駐，不再點「展開搜尋」；跨類搜尋開關已移除。）
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  // 總覽（預設分頁）全域搜尋（常駐）
  await page.getByPlaceholder('搜尋配方、材料、筆記').fill('乳香');
  await page.waitForTimeout(400);

  const panel = page.locator('.mt-2.bg-card');
  assert(await panel.getByText('配方', { exact: true }).count() > 0, '面板出現「配方」區塊');
  assert(await panel.getByText('材料', { exact: true }).count() > 0, '面板出現「材料」區塊');
  const matResult = panel.getByRole('button').filter({ hasText: '乳香' });
  assert(await matResult.count() > 0, '面板出現材料結果「乳香」');

  // 點材料結果 → 切到材料分頁
  await matResult.first().click();
  await page.waitForTimeout(500);
  assert(await page.getByText('材料庫').count() > 0, '已切到材料分頁（含「材料庫」）');
  const matSearchVal = await page.getByPlaceholder('搜尋材料、供應商').inputValue();
  assert(matSearchVal === '乳香', `材料搜尋框帶入「乳香」（實際："${matSearchVal}"）`);
  const card = page.locator('[role="button"][aria-expanded]').filter({ hasText: '乳香' }).first();
  assert((await card.innerText()).includes('樹脂'), '搜尋結果卡片帶分類小標「樹脂」');

  // 回總覽 → 搜「沉木」→ 點配方結果 → 進入詳情
  await page.getByRole('tab', { name: '切換到總覽分頁' }).first().click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder('搜尋配方、材料、筆記').fill('沉木');
  await page.waitForTimeout(400);
  const panel2 = page.locator('.mt-2.bg-card');
  await panel2.getByText('沉木供香（假）').first().click();
  await page.waitForTimeout(500);
  assert(await page.getByText('配方組成').count() > 0, '點配方結果進入詳情頁（含「配方組成」）');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU4 VERIFY OK');
} finally {
  await browser.close();
}
