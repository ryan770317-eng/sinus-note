/**
 * D3 驗證：配方首頁（FormulasV2）。
 * 前置：dev server 於 :5199。 node scripts/verify-d3.mjs
 * 預設清單檢視（FORMULAE＋4 筆清單列、無圖格）；篩選面板有「進行中」分段鈕；
 * 清單第一列進詳情、「← 返回」回清單；切圖格出現 SHRINE，重新整理後仍為圖格。無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  await page.getByRole('tab', { name: '切換到配方分頁' }).first().click();
  await page.waitForTimeout(400);

  let body = await page.locator('body').innerText();
  assert(body.includes('FORMULAE'), '配方分頁出現「FORMULAE」kicker');
  const rows = page.getByRole('button', { name: /^開啟配方 / });
  assert(await rows.count() === 4, `預設清單 4 筆（實際 ${await rows.count()}）`);
  assert(await page.getByRole('button', { name: '開啟配方 沉木供香（假）' }).count() === 1, '清單含「沉木供香（假）」');
  assert(!/\d\d FORMULAE/.test(body), '清單檢視不出現「01 FORMULAE」圖格');

  // 篩選面板
  await page.getByRole('button', { name: '篩選' }).click();
  await page.waitForTimeout(200);
  assert(await page.getByRole('group', { name: '狀態篩選' }).getByRole('button', { name: /進行中/ }).count() === 1, '篩選面板出現「進行中」分段鈕');
  await page.getByRole('button', { name: '篩選' }).click();

  // 第一列 → 詳情 → 返回
  await rows.first().click();
  await page.waitForTimeout(400);
  assert(await page.getByText('配方組成').count() > 0, '點清單第一列進入詳情');
  await page.getByRole('button', { name: '返回上一頁' }).click();
  await page.waitForTimeout(400);
  body = await page.locator('body').innerText();
  assert(body.includes('FORMULAE') && await rows.count() === 4, '「← 返回」回到配方清單');

  // 圖格檢視 + localStorage 記憶
  await page.getByRole('button', { name: '圖格檢視' }).click();
  await page.waitForTimeout(300);
  assert((await page.locator('body').innerText()).includes('SHRINE'), '切到圖格檢視出現「SHRINE」');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('tab', { name: '切換到配方分頁' }).first().click();
  await page.waitForTimeout(400);
  assert((await page.locator('body').innerText()).includes('SHRINE'), '重新整理後仍為圖格檢視（localStorage）');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nD3 VERIFY OK');
} finally {
  await browser.close();
}
