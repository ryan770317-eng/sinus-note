/**
 * D4 驗證：配方詳情（FormulaDetailV2）。
 * 前置：dev server 於 :5199。 node scripts/verify-d4.mjs
 * 示範配方詳情含 FORMULA／配方組成／開始製作／記一筆試燒，不含「v3.0 規則檢查」；
 * 「入庫測試」抽屜點開含沉香粉；換算 50 → 「× 2.5」且沉香粉 25；
 * 「⋯」有編輯／刪除；「記一筆試燒」開啟試燒紀錄對話框。無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  await page.getByRole('tab', { name: '切換到配方分頁' }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '開啟配方 沉木供香（假）' }).click();
  await page.waitForTimeout(400);

  const body = await page.locator('body').innerText();
  for (const t of ['FORMULA', '配方組成', '開始製作', '記一筆試燒']) {
    assert(body.includes(t), `詳情頁含「${t}」`);
  }
  assert(!body.includes('v3.0 規則檢查'), '不再出現「v3.0 規則檢查」紅框');

  // 入庫測試抽屜
  const testsRow = page.getByRole('button', { name: /^入庫測試/ });
  assert(await testsRow.count() === 1, '出現「入庫測試」抽屜');
  await testsRow.click();
  await page.waitForTimeout(200);
  const panelId = await testsRow.getAttribute('aria-controls');
  const panelText = await page.locator(`[id="${panelId}"]`).innerText();
  assert(panelText.includes('沉香粉'), '入庫測試抽屜展開後含「沉香粉」');

  // 換算 50（總重 20 → × 2.5；沉香粉 10 → 25）
  await page.getByLabel('換算目標總重').fill('50');
  await page.waitForTimeout(200);
  const body2 = await page.locator('body').innerText();
  assert(body2.includes('× 2.5'), '換算後顯示「× 2.5」');
  const row = page.locator('div.min-h-14').filter({ hasText: '沉香粉' }).first();
  assert((await row.innerText()).includes('25'), '沉香粉換算後顯示 25');

  // ⋯ 選單
  await page.getByRole('button', { name: '配方動作' }).click();
  await page.waitForTimeout(200);
  assert(await page.getByRole('menuitem', { name: /編輯/ }).count() > 0, '「⋯」選單有「編輯」');
  assert(await page.getByRole('menuitem', { name: /刪除/ }).count() > 0, '「⋯」選單有「刪除」');
  await page.getByRole('button', { name: '取消' }).click();
  await page.waitForTimeout(200);

  // 記一筆試燒
  await page.getByRole('button', { name: '記一筆試燒' }).click();
  await page.waitForTimeout(300);
  assert(await page.getByRole('dialog', { name: '試燒紀錄' }).count() === 1, '「記一筆試燒」開啟「試燒紀錄」對話框');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nD4 VERIFY OK');
} finally {
  await browser.close();
}
