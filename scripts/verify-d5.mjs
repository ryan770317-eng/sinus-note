/**
 * D5 驗證：製作核對模式（ProductionV2）。
 * 前置：dev server 於 :5199。 node scripts/verify-d5.mjs
 * 進示範配方詳情 → 開始製作 → 「這一步」「接下來」「還有 5 項」、底部導覽隱藏；
 * 勾兩項 → 「已稱」抽屜出現且 2 / 5；重新整理再進 → 仍 2 / 5（sessionStorage）；
 * 全勾 → 「完成稱料」→ 預期錯誤 toast（smoke 環境寫入必失敗）；「結束」回詳情、導覽恢復。無 pageerror。
 */
import { launchApp } from './smoke.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

async function openProduction(page) {
  await page.getByRole('tab', { name: '切換到配方分頁' }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '開啟配方 沉木供香（假）' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '開始製作' }).click();
  await page.waitForTimeout(300);
}

async function navVisible(page) {
  const tablists = page.getByRole('tablist');
  const n = await tablists.count();
  for (let i = 0; i < n; i++) if (await tablists.nth(i).isVisible()) return true;
  return false;
}

const { browser, page, pageErrors } = await launchApp();
try {
  await openProduction(page);
  const dlg = page.getByRole('dialog', { name: '製作核對' });
  let text = await dlg.innerText();
  assert(text.includes('這一步') && text.includes('接下來'), '出現「這一步」與「接下來」');
  assert(text.includes('還有 5 項'), '底部按鈕顯示「還有 5 項」');
  assert(!(await navVisible(page)), '底部導覽已隱藏');

  // 勾兩項（第一個是「這一步」，第二個在「接下來」）
  await page.getByRole('button', { name: '已稱 沉香粉', exact: true }).click();
  await page.getByRole('button', { name: '已稱 白檀粉', exact: true }).click();
  await page.waitForTimeout(200);
  text = await dlg.innerText();
  assert(await page.getByRole('button', { name: /^已稱\s*2/ }).count() === 1, '「已稱」抽屜出現（計數 2）');
  assert(await page.getByLabel('已稱 2 / 5').count() === 1, '頂列進度為「2 / 5」');

  // 重新整理 → 續存
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await openProduction(page);
  assert(await page.getByLabel('已稱 2 / 5').count() === 1, '重新整理後仍為「2 / 5」（sessionStorage 續存）');

  // 全勾
  for (const name of ['已稱 乳香', '已稱 丁香', '已稱 楠木粉']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  await page.waitForTimeout(200);
  text = await dlg.innerText();
  assert(text.includes('全部稱好了'), '全勾後顯示「全部稱好了」');
  const doneBtn = page.getByRole('button', { name: /完成稱料/ });
  assert(await doneBtn.count() === 1, '出現「完成稱料，建立工序」按鈕');
  await doneBtn.click();
  let toastText = '';
  for (let i = 0; i < 40; i++) {
    const loc = page.getByText(/失敗/);
    if (await loc.count()) { toastText = await loc.first().innerText(); break; }
    await page.waitForTimeout(300);
  }
  assert(/新增工序失敗|失敗/.test(toastText), `完成稱料後出現錯誤 toast（實際："${toastText.trim()}"）`);
  assert(await dlg.count() === 1, '失敗時留在製作模式');

  // 結束 → 回詳情、導覽恢復
  await page.getByRole('button', { name: '結束', exact: true }).click();
  await page.waitForTimeout(300);
  assert(await dlg.count() === 0, '按「結束」關閉製作模式');
  assert(await page.getByText('配方組成').count() > 0, '回到配方詳情');
  assert(await navVisible(page), '底部導覽恢復');

  assert(pageErrors.length === 0, 'no pageerror (' + pageErrors.join(' | ') + ')');
  console.log('\nD5 VERIFY OK');
} finally {
  await browser.close();
}
