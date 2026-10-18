/**
 * U1 驗證：配方批次換算器。
 * 前置：dev server 於 :5199。 node scripts/verify-u1.mjs
 * 走配方清單 → 沉木供香（假）詳情，填換算 40（總重 20 → ×2），
 * 斷言沉香粉 10 → 20 g 主顯示 + 「原 10」+ 倍率「× 2」；清除後回原量。無 pageerror。
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
  // D3 起配方首頁預設清單檢視：直接點清單列
  await page.getByRole('button', { name: '開啟配方 沉木供香（假）' }).click();
  await page.waitForTimeout(400);

  assert(await page.getByText('配方組成').count() > 0, '進入配方詳情（含「配方組成」）');

  // 填換算目標總重 40（總重 20 → 倍率 ×2）
  await page.getByLabel('換算目標總重').fill('40');
  await page.waitForTimeout(300);

  const body1 = await page.locator('body').innerText();
  assert(body1.includes('× 2'), '總重下方顯示倍率「× 2」');
  assert(body1.includes('原 10'), '沉香粉顯示原量「原 10」');
  const row = page.locator('div.min-h-14').filter({ hasText: '沉香粉' }).first();
  assert(/20\s*g/.test(await row.innerText()), '沉香粉換算後主用量顯示「20 g」');

  // 清除換算
  await page.getByLabel('清除換算').click();
  await page.waitForTimeout(300);
  const body2 = await page.locator('body').innerText();
  assert(!body2.includes('原 10'), '清除後不再顯示「原 10」（回原量）');
  assert(!body2.includes('× 2'), '清除後不再顯示倍率「× 2」');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nU1 VERIFY OK');
} finally {
  await browser.close();
}
