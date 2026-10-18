/**
 * D2 驗證：總覽（OverviewV2）。
 * 前置：dev server 於 :5199（見 smoke.mjs 頂部說明）。 node scripts/verify-d2.mjs
 * 總覽含「下一步」kicker 與「處理」；需要注意區塊有「其餘」抽屜，點開後列數增加；
 * 「近期配方」抽屜展開後點第一列進詳情（含「配方組成」）；
 * 頁面不含「示範資料」，開設定選單後才有。無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  const body = await page.locator('body').innerText();
  assert(/NEXT\s*下一步/.test(body), '總覽出現「NEXT 下一步」kicker');
  assert(await page.getByRole('button', { name: '處理', exact: true }).count() === 1, '下一步卡有一顆「處理」按鈕');
  assert(!body.includes('示範資料'), '總覽頁面本身不含「示範資料」字樣');

  // 需要注意：其餘抽屜
  const rest = page.getByRole('button', { name: /其餘 \d+ 項/ });
  assert(await rest.count() === 1, '需要注意區塊出現「其餘 N 項」抽屜');
  const before = await page.locator('button[aria-label*=" — "]').count();
  await rest.click();
  await page.waitForTimeout(200);
  const after = await page.locator('button[aria-label*=" — "]').count();
  assert(after > before, `點開「其餘」後列數增加（${before} → ${after}）`);

  // 近期配方抽屜 → 第一列 → 詳情
  await page.getByRole('button', { name: /^近期配方/ }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^開啟配方 / }).first().click();
  await page.waitForTimeout(400);
  assert(await page.getByText('配方組成').count() > 0, '近期配方第一列進入詳情（含「配方組成」）');

  // 回總覽 → 開設定選單 → 含「示範資料」
  await page.getByRole('tab', { name: '切換到總覽分頁' }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '設定（示範資料）' }).click();
  await page.waitForTimeout(300);
  const menu = await page.getByRole('dialog', { name: '設定選單' }).innerText();
  assert(menu.includes('示範資料'), '設定選單內含「示範資料」說明');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nD2 VERIFY OK');
} finally {
  await browser.close();
}
