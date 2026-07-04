/**
 * U1 驗證：配方批次換算器。
 * 前置：dev server 於 :5199。 node scripts/verify-u1.mjs
 * 走配方 → 供香分類 → 沉木供香（假）詳情，填換算 40（總重 20 → ×2），
 * 斷言沉香粉 10g → 20g 主顯示 + 「原 10」+ 總重「×2」；清除後回原量。無 pageerror。
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
  await page.getByText('供香', { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('沉木供香（假）').first().click();
  await page.waitForTimeout(400);

  assert(await page.getByText('配方組成').count() > 0, '進入配方詳情（含「配方組成」）');

  // 填換算目標總重 40（總重 20 → 倍率 ×2）
  await page.getByLabel('換算目標總重').fill('40');
  await page.waitForTimeout(300);

  const body1 = await page.locator('body').innerText();
  assert(body1.includes('×2'), '總重列顯示倍率「×2」');
  assert(body1.includes('原 10'), '沉香粉顯示原量「原 10」');
  assert(body1.includes('20g'), '沉香粉換算後顯示「20g」主用量');

  // 清除換算
  await page.getByLabel('清除換算').click();
  await page.waitForTimeout(300);
  const body2 = await page.locator('body').innerText();
  assert(!body2.includes('原 10'), '清除後不再顯示「原 10」（回原量）');
  assert(!body2.includes('×2'), '清除後不再顯示倍率「×2」');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU1 VERIFY OK');
} finally {
  await browser.close();
}
