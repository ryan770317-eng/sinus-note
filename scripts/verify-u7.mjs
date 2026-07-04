/**
 * U7 驗證：Claude API 雲端代理 fallback 鏈。
 * 前置：dev server 於 :5199。 node scripts/verify-u7.mjs
 * dev 無 /api → 代理判定不可用 → fallback 直呼（假 key）→ 錯誤浮出。
 * 目的：證明「代理 404 → fallback → 錯誤 toast」整條鏈不炸（無 pageerror）。
 * 代理本體無法在本環境實測，需部署後以真帳號實測。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  // 先在設定選單存一個假 API key（fallback 直呼會用到）
  await page.locator('button[aria-label="開啟設定選單"]:visible').first().click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder('sk-ant-...').fill('sk-ant-fake-key-for-verify');
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  await page.waitForTimeout(300);
  // 確認新提示文字存在
  assert(await page.getByText('已部署雲端代理時此欄可留空').count() > 0, 'MenuOverlay 顯示「已部署雲端代理時此欄可留空」提示');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 到隨手記對示範筆記按 AI 解析
  await page.getByRole('tab', { name: '切換到隨手記分頁' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '以 AI 解析此筆記' }).first().click();

  let toastText = '';
  for (let i = 0; i < 70; i++) {
    const loc = page.getByText(/失敗/);
    if (await loc.count()) { toastText = await loc.first().innerText(); break; }
    await page.waitForTimeout(300);
  }
  assert(/失敗/.test(toastText), `AI 解析經 fallback 後浮出錯誤 toast（實際："${toastText.trim()}"）`);

  assert(pageErrors.length === 0, 'no pageerror — fallback 鏈不炸 (' + pageErrors.join(' | ') + ')');
  console.log('\nU7 VERIFY OK (代理本體未驗證：需部署後以真帳號實測)');
} finally {
  await browser.close();
}
