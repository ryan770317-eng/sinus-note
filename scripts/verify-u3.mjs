/**
 * U3 驗證（2026-07-04 修訂版）：快速記錄浮層 + PWA 深連結。
 *
 * 設計變更：app 內的「快速記錄」按鈕已移除（與隨手記分頁功能重複，
 * 使用者回饋 nav 過擠）。浮層唯一入口是 PWA 捷徑 ?quick=note。
 *
 * 前置：dev server 於 :5199。 node scripts/verify-u3.mjs
 * (1) 導航列不應再有「快速記錄」按鈕；手機列恰為 5 個分頁。
 * (2) launchApp('?quick=note') 直開 → sheet 自動打開、textarea 聚焦、
 *     網址 query 已清除；送出 → 預期「新增筆記失敗」錯誤 toast（smoke 環境）
 *     且 sheet 未關。
 * 無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

// ── (1) 導航列無快速記錄按鈕、手機列 5 格 ─────────────────────
{
  const { browser, page, pageErrors } = await launchApp();
  try {
    const quickBtns = await page.locator('nav button[aria-label="快速記錄"]').count();
    assert(quickBtns === 0, `導航列已無「快速記錄」按鈕（found=${quickBtns}）`);
    const mobileSlots = await page.locator('nav.md\\:hidden button').count();
    assert(mobileSlots === 5, `手機導航列恰為 5 個分頁（found=${mobileSlots}）`);
    assert(pageErrors.length === 0, '(1) no pageerror (' + pageErrors.join(' | ') + ')');
  } finally {
    await browser.close();
  }
}

// ── (2) 深連結直開 sheet 並送出 ──────────────────────────────
{
  const { browser, page, pageErrors } = await launchApp('?quick=note');
  try {
    await page.waitForTimeout(500);
    assert(await page.getByText('快速記錄').count() > 0, '?quick=note 直開 → sheet 自動打開');
    const focusTag = await page.evaluate(() => document.activeElement?.tagName);
    assert(focusTag === 'TEXTAREA', `textarea 自動聚焦（activeElement=${focusTag}）`);
    const search = await page.evaluate(() => window.location.search);
    assert(search === '', `網址 query 已清除（實際："${search}"）`);

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
    assert(pageErrors.length === 0, '(2) no pageerror (' + pageErrors.join(' | ') + ')');
  } finally {
    await browser.close();
  }
}

console.log('\nU3 VERIFY OK');
