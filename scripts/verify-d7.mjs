/**
 * D7 驗證：工序編輯表單改為 bottom sheet（修掉「編輯表單在畫面外」）。
 * 前置：dev server 於 :5199。 node scripts/verify-d7.mjs
 * 工序頁最後一張卡「⋯」→「編輯」→ role=dialog「編輯工序」出現且在視窗內（boundingBox y ≥ 0）。無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

const { browser, page, pageErrors } = await launchApp();
try {
  await page.getByRole('tab', { name: '切換到工序分頁' }).first().click();
  await page.waitForTimeout(400);

  const triggers = page.getByRole('button', { name: /更多動作$/ });
  const n = await triggers.count();
  assert(n > 0, `工序頁有卡片動作選單（${n} 張）`);
  const last = triggers.nth(n - 1);
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: /編輯/ }).click();
  await page.waitForTimeout(400);

  const dialog = page.getByRole('dialog', { name: '編輯工序' });
  assert(await dialog.count() === 1, '出現 role=dialog「編輯工序」');
  const box = await dialog.boundingBox();
  const vh = page.viewportSize().height;
  assert(box && box.y >= 0 && box.y < vh, `編輯工序 sheet 在視窗內（y=${box?.y?.toFixed(0)}, 視窗高 ${vh}）`);
  assert(await dialog.getByRole('button', { name: '儲存' }).isVisible(), 'sheet 底部「儲存」可見');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nD7 VERIFY OK');
} finally {
  await browser.close();
}
