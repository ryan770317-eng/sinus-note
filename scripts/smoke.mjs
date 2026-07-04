/**
 * UI 煙霧測試基礎腳本（無需真實 Supabase 憑證）。
 *
 * 前置：
 *   1. 建立假環境檔（勿 commit，.gitignore 已涵蓋 *.local）：
 *      printf 'VITE_SUPABASE_URL=https://fake-project.supabase.co\nVITE_SUPABASE_ANON_KEY=fake-anon-key\n' > .env.local
 *   2. 啟動 dev server：npm run dev -- --port 5199
 *   3. node scripts/smoke.mjs
 *
 * 原理：偽造 localStorage 的 supabase session（getSession 只驗本地過期時間），
 * app 會進入登入後畫面；資料 fetch 全部失敗 → 四 store 皆空 → 示範資料模式。
 * 對假 Supabase 的網路錯誤是「預期中」的，只有 pageerror（JS 例外）才算失敗。
 *
 * CHROMIUM 環境變數可覆寫瀏覽器路徑（預設為本 remote 容器的 /opt/pw-browsers/chromium）。
 */
import { chromium } from 'playwright-core';

const executablePath = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium';
const BASE = process.env.SMOKE_URL ?? 'http://localhost:5199/';

export async function launchApp(path = '') {
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const session = {
    access_token: 'fake.jwt.token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fake-refresh',
    user: {
      id: '00000000-0000-4000-8000-000000000000', aud: 'authenticated',
      email: 'smoke@test.dev', role: 'authenticated',
      app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
    },
  };
  await page.addInitScript((s) => {
    window.localStorage.setItem('sb-fake-project-auth-token', JSON.stringify(s));
  }, session);
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  return { browser, page, pageErrors };
}

// 直接執行時：開機 + 五分頁巡檢
const isMain = import.meta.url.endsWith(process.argv[1]?.split('/').pop() ?? '');
if (isMain) {
  const { browser, page, pageErrors } = await launchApp();
  const results = [];
  for (const tab of ['配方', '工序', '材料', '隨手記', '總覽']) {
    const btn = page.getByRole('tab', { name: `切換到${tab}分頁` });
    if (await btn.count()) { await btn.first().click(); await page.waitForTimeout(400); }
    const body = await page.locator('body').innerText();
    results.push(`${tab}: ${body.length > 50 ? 'rendered' : 'EMPTY?'}`);
  }
  console.log(results.join('\n'));
  console.log('PAGE ERRORS:', pageErrors.length ? pageErrors.join('\n') : 'none');
  await browser.close();
  process.exit(pageErrors.length ? 1 : 0);
}
