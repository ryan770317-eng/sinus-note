/**
 * U3 驗證：全域快速記錄 + PWA 深連結。
 * 前置：dev server 於 :5199。 node scripts/verify-u3.mjs
 * (1) 點「快速記錄」→ sheet 出現、textarea 聚焦 → 輸入 → 記錄 → 預期「新增筆記失敗」
 *     錯誤 toast（smoke 環境）且 sheet 未關。
 * (2) launchApp('?quick=note') 直開 → sheet 自動打開、網址 query 已清除。
 * 無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

// ── (1) 手動開 sheet 並送出 ──────────────────────────────────
{
  const { browser, page, pageErrors } = await launchApp();
  try {
    await page.locator('button[aria-label="快速記錄"]:visible').first().click();
    await page.waitForTimeout(400);

    assert(await page.getByText('快速記錄').count() > 0, 'sheet 出現（含「快速記錄」）');
    const focusTag = await page.evaluate(() => document.activeElement?.tagName);
    assert(focusTag === 'TEXTAREA', `textarea 自動聚焦（activeElement=${focusTag}）`);

    await page.getByPlaceholder('記下這一刻...').fill('U3 快速記錄測試');
    await page.getByRole('button', { name: '記錄', exact: true }).click();

    let toastText = '';
    for (let i = 0; i < 40; i++) {
      const loc = page.getByText(/失敗/);
      if (await loc.count()) { toastText = await loc.first().innerText(); break; }
      await page.waitForTimeout(300);
    }
    assert(/失敗/.test(toastText), `送出後出現錯誤 toast（實際："${toastText.trim()}"）`);
    assert(await page.getByText('快速記錄').count() > 0, '失敗後 sheet 未關閉');

    assert(pageErrors.length === 0, '(1) no pageerror (' + pageErrors.join(' | ') + ')');
  } finally {
    await browser.close();
  }
}

// ── (2) 深連結直開 ──────────────────────────────────────────
{
  const { browser, page, pageErrors } = await launchApp('?quick=note');
  try {
    await page.waitForTimeout(500);
    assert(await page.getByText('快速記錄').count() > 0, '?quick=note 直開 → sheet 自動打開');
    const search = await page.evaluate(() => window.location.search);
    assert(search === '', `網址 query 已清除（實際："${search}"）`);
    assert(pageErrors.length === 0, '(2) no pageerror (' + pageErrors.join(' | ') + ')');
  } finally {
    await browser.close();
  }
}

console.log('\nU3 VERIFY OK');
