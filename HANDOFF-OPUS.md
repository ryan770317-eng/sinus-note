# HANDOFF-OPUS — sinus-note 批次收尾工作單

> 產生日期：2026-07-03｜產生者：Fable 5 codebase audit session
> 接手者：Opus。以下每項都是「模式已定、照做即可」的工作，不需要重新決策。

## 共通規則（先讀完再動手）

- **Branch**：一律在 `claude/codebase-audit-fable5-jk2gm4` 上繼續，不開新 branch、不碰 main。
- **驗證不自誇**：每項完成後必跑 `npm run build && npm run lint && npm test`，三者全綠才算完成。不能驗證的改動要標「未驗證」，不准寫「應該沒問題」。
- **敏感區（不准動）**：
  - `supabase-schema*.sql`（DB schema）
  - `src/lib/supabase.ts` 的 Row 型別與 row↔app 轉換函式（對外資料契約）
  - `src/hooks/supabase/*` 的錯誤契約（讀取 setError／寫入 throw+回滾）——只能依此契約使用，不能改契約本身
  - `src/components/admin/MigratePage.tsx` 的寫入邏輯（一次性遷移工具，使用者可能還沒跑完）
  - 匯出/匯入格式（`src/utils/export.ts` 的 BackupData 形狀）
- **遇到規格外狀況**：停下來，在本檔該項目下方標註「⚠ 遇到 X，未處理」，不要自行發揮。
- **回報格式**：完成一項就在該項標題後打 `✅`，並附一行驗證證據（例如「build/lint/test 全綠，grep 備注 剩 0 筆」）。

---

## 項目 1：文案統一「備注」→「備註」 ✅

**目標與動機**：UI 文案同時存在「備注」與「備註」（台灣正字為「備註」），同一個 app 裡兩種寫法會顯得粗糙。

**具體做法**：
1. `grep -rn "備注" src/` 列出所有出現點（目前約 20+ 處，分布在 RecipeForm、RecipeDetail、TaskForm、TaskCard、MaterialList、ActionDetail、BatchImport prompt 等）。
2. 全部改為「備註」。**例外**：`src/services/claude.ts` 的 prompt 字串裡的「備注」也一併改，但要保持 JSON 欄位名（`note`、`notes`）不動——只改中文顯示字，不改任何 key。
3. `SINUS_NOTE_*.md` 歷史文件**不要改**（那是歷史紀錄）。

**驗收條件**：`grep -rn "備注" src/` 回傳 0 筆；build/lint/test 全綠。

**禁區**：不改變數名、不改 DB 欄位、不改 markdown 歷史文件。

---

## 項目 2：移除 BatchImport 的冗餘 `suppressSync` prop ✅

**目標與動機**：四個 store hook 的每個寫入函式內部都已自行呼叫 `suppressSync()`。`BatchImport` 收到的 `suppressSync` prop 是從 `noteStore` 傳來的（suppress 錯 store），實際上完全冗餘且誤導後續維護者。

**具體做法**：
1. `src/components/notes/BatchImport.tsx`：從 Props interface 移除 `suppressSync`，移除元件參數與 `confirmAction`／`confirmAll` 內的 `suppressSync(...)` 呼叫。
2. `src/components/dashboard/Dashboard.tsx`：Props 與傳遞一併移除。
3. `src/App.tsx`：`<Dashboard ... suppressSync={noteStore.suppressSync} />` 移除該行。

**驗收條件**：`grep -rn "suppressSync" src/components/` 回傳 0 筆（hooks 內部的保留）；build/lint/test 全綠。

**禁區**：hooks（`src/hooks/supabase/*`）內部的 suppressSync 機制不動。

---

## 項目 3：MaterialCard 鍵盤可及性（照 TaskCard 範本）✅

**目標與動機**：材料卡片整張是 `<div onClick>` 展開，鍵盤使用者無法操作。TaskCard 已經做對了，照抄即可。

**具體做法**：
1. 範本：`src/components/task/TaskCard.tsx` 內容區的做法——`role="button"`、`tabIndex={0}`、`onKeyDown`（Enter/Space 觸發、`e.preventDefault()`）、`aria-expanded`。
2. 套用到 `src/components/material/MaterialList.tsx` 的 `MaterialCard` 根元素（點擊展開的那個 div）。
3. 展開箭頭 `▲/▼` span 加 `aria-hidden="true"`。

**驗收條件**：build/lint/test 全綠；程式碼審視確認 Tab 可聚焦、Enter/Space 可展開（無瀏覽器環境時標「鍵盤行為未實測」）。

**禁區**：不改卡片視覺樣式與展開邏輯。

---

## 項目 4：fast-refresh lint 警告清理（2 個 warning）✅

**目標與動機**：`npm run lint` 剩 2 個 warning，都是「檔案同時 export 元件與非元件」影響 HMR。

**具體做法**：
1. `src/components/nav/NavIcons.tsx:87` — `TAB_ICONS` 常數表搬到新檔 `src/components/nav/tabIcons.ts`（icon 元件們留在原檔），更新 `BottomNav.tsx` 的 import。
2. `src/components/shared/Toast.tsx:33` — `useToast` hook 搬到新檔 `src/components/shared/useToast.ts`，`Toast.tsx` 保留 `ToastProvider` 與 context（context 物件 export 給 hook 用）。**注意**：全專案約 15+ 個檔案 import `useToast`，全部要改 import 路徑；用 `grep -rln "from '.*shared/Toast'"` 找齊。
3. 若第 2 步改動面太大或出現循環 import，允許改為在 eslint.config.js 對這兩檔關閉該規則，並標註原因——擇一即可，不要兩者都做。

**驗收條件**：`npm run lint` 0 error 0 warning；build/test 全綠。

---

## 項目 5：依賴小版本升級（低優先，可跳過）✅

**目標與動機**：依賴健康檢查。只做 patch/minor，**不做 major**。

**具體做法**：
1. `npm outdated` 檢視；只升 `@supabase/supabase-js`、`react`、`react-dom`、`zod`、`vite-plugin-pwa` 的 minor/patch。
2. `vite` 若有 major（6→7）**不要升**。
3. 每升一個跑一次 build+test。

**驗收條件**：build/lint/test 全綠；`npm outdated` 輸出貼在本項下方。

**禁區**：任何 major 升級；`typescript` 版本不動（`~5.7.2` 是 tsc -b 相容錨點）。

**升級後 `npm outdated`（剩餘皆為清單外或僅有 major，依規不升）**：
```
Package               Current   Wanted   Latest
@types/react          19.2.14  19.2.17  19.2.17   （清單外）
@vitejs/plugin-react    4.7.0    4.7.0    6.0.3    （僅 major）
autoprefixer          10.4.27   10.5.2   10.5.2    （清單外）
postcss                 8.5.8   8.5.16   8.5.16    （清單外）
tailwindcss            3.4.19   3.4.19    4.3.2    （僅 major）
typescript              5.7.3    5.7.3    6.0.3    （禁區，不動）
vite                    6.4.1    6.4.3    8.1.3    （清單外，且不升 major）
vite-plugin-pwa        0.21.2   0.21.2    1.3.0    （僅 major，Wanted=Current）
```

---

## 完成回報區

- 項目 1 ✅：`grep -rn "備注" src/` = 0 筆；build 綠、test 23 passed、lint 0 error（2 warning 為項目 4 目標）。commit 3eb44e6。
- 項目 2 ✅：`grep -rn "suppressSync" src/components/` = 0 筆（hooks 內部保留）；build 綠、test 23 passed、lint 0 error。commit c76574e。
- 項目 3 ✅：MaterialCard 根 div 加 role="button"/tabIndex=0/onKeyDown(Enter,Space,preventDefault)/aria-expanded，▲▼ 加 aria-hidden；build 綠、test 23 passed、lint 0 error。鍵盤行為經程式碼審視符合 TaskCard 範本，未於瀏覽器實測。commit 113de41。
- 項目 4 ✅：採檔案拆分方案（非 eslint 豁免）。TAB_ICONS→nav/tabIcons.ts；Toast 拆為 shared/ToastContext.ts（context+型別）與 shared/useToast.ts（hook），Toast.tsx 僅剩 ToastProvider 元件；11 個 useToast import 路徑更新。`npm run lint` = 0 error 0 warning；build 綠、test 23 passed。commit 426c79f。備註：context 依 react-refresh 規則移至獨立檔（規則明示 "Move your React context(s) to a separate file"），非留在 Toast.tsx。
- 項目 5 ✅：升 @supabase/supabase-js 2.101.1→2.110.0、react/react-dom 19.2.4→19.2.7、zod 4.3.6→4.4.3（各自逐一 build+test 驗證全綠）。vite-plugin-pwa 無非 major 更新（0.21.2 已為 Wanted）。全升完 build 綠、lint 0/0、test 23 passed。commit fa72a0e（升級）+ 本 commit（勾銷）。

---
---

# 第二批：U 系列（使用便利性改造）— 2026-07-04 規劃

> 規劃者：Fable 5。**所有設計決策已定案，Opus 只負責執行**，不要重新設計。
> 遇到本文件沒寫到的情況：停下、在該項標註「⚠ 遇到 X，未處理」，做下一項。

## 第二批共通規則（第一批共通規則全部繼續適用，以下為新增）

- **執行順序固定**：U2 → U1 → U4 → U6 → U3 → U5 → U7（由低風險到高風險；U5 依賴 U1；U7 最後）。
- **每項一個 commit**，message 格式 `feat(ux): <英文摘要> (U<n>)`，trailer 同第一批。
- **每項驗證三件套**：`npm run build && npm run lint && npm test` 全綠 ＋ 該項「驗收條件」列出的專屬驗證。
- **瀏覽器實測工具**：`scripts/smoke.mjs` 已就緒（playwright-core 已在 devDependencies）。用法見該檔案頂部註解。各項的 UI 驗證都基於它的 `launchApp()`——寫臨時驗證腳本放 `scripts/` 下、命名 `verify-u<n>.mjs`，驗完**保留在 repo**（當回歸資產）。臨時腳本內對假 Supabase 的網路錯誤是預期行為，只有 `pageerror`（JS 例外）與該項驗收斷言算數。
- **示範資料模式**：smoke 環境永遠處於 mock 模式。凡「寫入」操作在 smoke 下會得到錯誤 toast（mock guard 或網路失敗）——這**正是驗證線路接通的證據**，各項驗收條件會明說預期哪個 toast。
- **設計系統鐵律**：零圓角、無陰影（`shadow-sm` 既有用例除外，不新增）、`font-light` 為預設、色票只用 `src/utils/constants.ts` 的 PALETTE 與 Tailwind token、不用 emoji（幾何符號 ✎ ⌕ ＋ × 可以）。新 UI 一律沿用既有 class：`btn`、`btn-primary`、`input-field`、`section-label`、`type-*`。
- **新增的純函式一律放 utils 並附單元測試**；元件內不寫可測邏輯的第二份副本。

---

## U2：材料名稱三段式拆欄（先做，最小風險）

**目標與動機**：新增材料強制 `[品名]｜[供應商]｜[產地或品級]`，手機打全形「｜」極痛苦；且供應商/產地要打兩次（name 裡一次、獨立欄位一次）。改為：使用者只打「品名」，三段式名稱由 品名＋既有供應商欄＋（品級 or 產地）欄**自動組合**。

**Step 1 — 純函式**（新檔 `src/utils/materialName.ts`）：
```ts
/** 三段式組合：空段落以 '—' 佔位，保證輸出永遠是合法三段式 */
export function composeMaterialName(product: string, supplier: string, gradeOrOrigin: string): string {
  const seg = (s: string) => s.trim() || '—';
  return `${seg(product)}｜${seg(supplier)}｜${seg(gradeOrOrigin)}`;
}
/** 拆解：恰好 3 段 → 各段 trim、'—' 還原為 ''；否則整串當品名 */
export function splitMaterialName(name: string): { product: string; supplier: string; gradeOrOrigin: string; isThreeSeg: boolean } {
  const parts = name.split('｜');
  if (parts.length === 3) {
    const clean = (s: string) => { const t = s.trim(); return t === '—' ? '' : t; };
    return { product: clean(parts[0]), supplier: clean(parts[1]), gradeOrOrigin: clean(parts[2]), isThreeSeg: true };
  }
  return { product: name.trim(), supplier: '', gradeOrOrigin: '', isThreeSeg: false };
}
```
單元測試（新檔 `src/utils/__tests__/materialName.test.ts`）：組合含空白段、雙向 round-trip、非三段式輸入、'—' 還原。

**Step 2 — MaterialList 表單改造**（`src/components/material/MaterialList.tsx`）：
1. 移除「名稱（三段式 *）」input 與 `THREE_SEG_RE` 驗證（常數與錯誤訊息一併刪）。
2. 新增 state `productName: string`（必填）。`startAdd()` 清空；`startEdit(mat)` 用 `splitMaterialName(mat.name).product` 填入。
3. 表單版面：原名稱欄位置改放「品名 *」input（required、`aria-required`、空值時沿用現有 nameError 機制，錯誤文案改「請填寫品名」）。既有 產地/供應商/品級 欄位不動。
4. 供應商欄位加 autocomplete：`<datalist id="supplier-options">`，選項 = `Array.from(new Set(materials.map(m => m.supplier).filter(Boolean)))`。
5. `handleSubmit` 組合名稱：`const composedName = composeMaterialName(productName, form.supplier, form.grade?.trim() || form.origin)`（**第三段規則：grade 優先、沒 grade 用 origin，這是定案**）。payload 的 `name` 用 composedName。
6. **編輯改名保護（關鍵）**：編輯模式下若 `composedName !== 原本的 mat.name`，把**舊 name 加進 aliases**（若尚未存在）：`aliases: [...新aliases清單, 舊name]` 去重。原因：配方鬼影是靠 name/aliases 比對回連的（見 `RecipeDetail.resolveMaterial`），改名不留 alias 會斷鏈。此行為加一行註解說明。

**驗收條件**：
- 單元測試新增 ≥6 案例全過；三件套全綠。
- `grep -n "THREE_SEG_RE" src/` = 0 筆。
- `scripts/verify-u2.mjs`：開材料分頁 → 點 FAB「新增材料」→ 斷言表單出現「品名」label 且**不存在**「三段式」字樣 → 填品名+供應商+產地 → 送出 → 預期出現「新增材料失敗」錯誤 toast（smoke 環境網路必失敗 = 線路接通）。

**禁區**：`Material` 型別、`materialToRow`、BatchImport 的名稱比對邏輯都不動；不改既有資料的 name（只有使用者主動編輯才重組）。

---

## U1：配方批次換算器

**目標與動機**：配方存 20g 配比，實做 50g 要心算。詳情頁輸入目標總重 → 全表等比換算。

**Step 1 — 純函式**（加進 `src/utils/format.ts`，測試加進 `format.test.ts`）：
```ts
/** 顯示用量：四捨五入到小數 2 位並去尾零 */
export function fmtAmount(n: number): string {
  return String(Math.round(n * 100) / 100);
}
/** 換算倍率；totalWeight<=0 或 target 無效時回 1（= 不換算） */
export function scaleFactor(totalWeight: number, target: number | null): number {
  if (!target || target <= 0 || !totalWeight || totalWeight <= 0) return 1;
  return target / totalWeight;
}
```
測試：`fmtAmount(21.749999)→'21.75'`、`fmtAmount(3)→'3'`、`scaleFactor(20,50)→2.5`、`scaleFactor(0,50)→1`、`scaleFactor(20,null)→1`、`scaleFactor(20,-5)→1`。

**Step 2 — RecipeDetail 介面**（`src/components/recipe/RecipeDetail.tsx`）：
1. state：`const [targetWeight, setTargetWeight] = useState<number | null>(null);`
2. 版本切換要歸零：`useEffect(() => { setTargetWeight(null); }, [vIdx]);`
3. UI 位置：「配方組成」標題列（現在是 `section-label` + `總重 {n}g`）改為：
   - 左：`配方組成`
   - 右：`總重 {version.totalWeight}g` ＋ 換算控制：`<label>換算</label>` + `<input type="number" inputMode="decimal" min={0} step={1}>`（寬 `w-20`、`input-field text-xs`、placeholder「g」、`aria-label="換算目標總重"`）＋ 有值時一顆 `×` 清除鈕（`aria-label="清除換算"`）。
   - `version.totalWeight <= 0` 時整組換算控制**不渲染**。
   - input onChange：空字串 → `setTargetWeight(null)`；否則 `Number(v)`，NaN 或 <=0 → null。
4. 換算顯示：`const factor = scaleFactor(version.totalWeight, targetWeight);` 每個 ingredient 的用量欄：
   - factor === 1：維持現狀 `{r.ing.amount}{r.ing.unit}`。
   - factor !== 1：主顯示 `<span className="text-accent">{fmtAmount(r.ing.amount * factor)}{r.ing.unit}</span>`，其後 `<span className="type-micro text-ink-3 ml-1">原 {r.ing.amount}</span>`。
5. factor !== 1 時，總重列加註：`→ {fmtAmount(version.totalWeight * factor)}g（×{fmtAmount(factor)}）`。
6. 百分比與硬上限警告**不動**（比例不變量，換算不影響）。

**驗收條件**：三件套全綠＋新單測全過；`scripts/verify-u1.mjs`：進示範配方「沉木供香（假）」詳情（走配方→供香分類→點卡片）→ 填換算 40 → 斷言頁面文字含 `20` 與 `×2` 與任一材料的換算值（示範配方沉香粉 10g → 頁面含 `20g` 主顯示與 `原 10`）→ 清除 → 斷言回到原量。無 pageerror。

**禁區**：不動 Recipe 資料、不把換算值寫回任何 store、不動警告計算邏輯。

---

## U4：總覽頁全域搜尋

**目標與動機**：跨配方/材料/筆記一次搜，結果直達。

**Step 1 — 純函式**（新檔 `src/utils/globalSearch.ts` + `__tests__/globalSearch.test.ts`）：
```ts
export function searchRecipes(recipes: Recipe[], q: string, limit = 5): Recipe[]
// 比對（全部 toLowerCase().includes）：name、num、tags[]
export function searchMaterials(materials: Material[], q: string, limit = 5): Material[]
// 比對：name、displayShort、species、origin、supplier、aliases[]
export function searchNotes(notes: Note[], q: string, limit = 3): Note[]
// 比對：text
// 三者共同：q.trim() 為空 → 回 []
```
測試：每個函式至少「命中欄位」「大小寫不敏感」「limit 截斷」「空 query 回空」四案例。

**Step 2 — 元件**（新檔 `src/components/dashboard/GlobalSearch.tsx`）：
- Props：`{ recipes; materials; notes; onRecipeClick: (id: number) => void; onMaterialClick: (query: string) => void; onNoteClick: (query: string) => void }`
- 內部 state `q`；用既有 `SearchField`（placeholder「搜尋配方、材料、筆記」，`resultCount` 傳三組總數）。
- q 非空時渲染結果面板（`bg-card border border-border`，分三段）：
  - 「配方」`section-label`＋每筆 button：`type-name` 名稱＋`type-meta` `{num} · {FRAG_CATS[fragCat].label}`；onClick → `onRecipeClick(r.id)`。
  - 「材料」：`displayShort ?? name.split('｜')[0]`＋供應商；onClick → `onMaterialClick(q)`。
  - 「隨手記」：`formatNoteDate(ts)` 日期＋text 前 60 字；onClick → `onNoteClick(q)`。
  - 三組全空 → `無結果`（`type-body text-ink-3`）。
- 放進 `Dashboard.tsx`：header 下方、mock 橫幅上方。Dashboard Props 增加並向下傳三個 callback。

**Step 3 — 目標頁 seed**（App.tsx）：
1. App state：`const [matSeed, setMatSeed] = useState<string | null>(null);` `const [noteSeed, setNoteSeed] = useState<string | null>(null);`
2. Dashboard 的 `onMaterialClick={(q) => { setMatSeed(q); setTab('material'); }}`、`onNoteClick={(q) => { setNoteSeed(q); setTab('notes'); }}`、`onRecipeClick={goRecipeDetail}`（已有）。
3. `BottomNav` 的 `onChange` 手動切分頁時清 seed：在現有 onChange callback 裡加 `setMatSeed(null); setNoteSeed(null);`。
4. `MaterialList` 加 optional prop `initialSearch?: string`：`useState(initialSearch ?? '')` 初始化 search，且 `initialSearch` 有值時 `crossCat` 初始為 true。App 傳 `initialSearch={matSeed ?? undefined}`。
5. `NotesList` 加 optional prop `initialSearch?: string`＋**新增搜尋功能**：在標題列右側放 `SearchField`（同 MaterialList 版面模式），本地 state 過濾 `notes.filter(n => n.text.toLowerCase().includes(q))`，`resultCount` 帶過濾數。初始值取 `initialSearch ?? ''`。空結果顯示既有「尚無筆記」改為：有筆記但過濾為空 → `無符合的筆記`。

**驗收條件**：三件套＋單測全過。`scripts/verify-u4.mjs`：總覽輸入「乳香」→ 斷言結果面板同時出現「配方」「材料」區塊（示範資料兩者都含乳香）→ 點材料結果 → 斷言已切到材料分頁且搜尋框帶入「乳香」且顯示跨類結果；回總覽搜「沉木」點配方結果 → 斷言進入詳情頁（頁面含「配方組成」）。無 pageerror。

**禁區**：不動 RecipeHome 的分頁內搜尋；不做模糊比對/拼音（超出範圍）。

---

## U6：備份提醒

**目標與動機**：資料只存 Supabase 一份，匯出全靠記憶。30 天沒備份就在總覽提醒。

**Step 1 — 純函式**（新檔 `src/utils/backup.ts` + 測試）：
```ts
export const BACKUP_KEY = 'sinus_last_backup_at';
export const SNOOZE_KEY = 'sinus_backup_snooze_until';
export function shouldRemindBackup(nowMs: number, lastBackupIso: string | null, snoozeUntilIso: string | null): { remind: boolean; daysSince: number | null } {
  if (snoozeUntilIso && Date.parse(snoozeUntilIso) > nowMs) return { remind: false, daysSince: null };
  if (!lastBackupIso) return { remind: true, daysSince: null };
  const days = Math.floor((nowMs - Date.parse(lastBackupIso)) / 86400000);
  return { remind: days >= 30, daysSince: days };
}
```
測試：從未備份、29 天、30 天、snooze 中、snooze 過期、無效日期字串（`Date.parse` NaN → 視同從未備份：NaN 比較為 false → days=NaN → `days >= 30` false——**這不合意圖**，實作要先 `Number.isNaN(Date.parse(lastBackupIso))` 時走「從未備份」分支）。

**Step 2 — 寫入時機**（App.tsx `handleExport`）：`exportBackup(...)` 之後 `localStorage.setItem(BACKUP_KEY, new Date().toISOString())`。

**Step 3 — 元件**（新檔 `src/components/dashboard/BackupReminder.tsx`）：
- Props：`{ onExport: () => void }`。內部讀 localStorage 兩個 key（`useState` 惰性初始化即可，不需要跨分頁即時同步）。
- `shouldRemindBackup(Date.now(), ...)` remind=false → return null。
- 版面：dashed border 橫幅（抄 mock 橫幅樣式），文案：從未備份 → `尚未匯出過備份 — 建議定期下載 JSON 備份`；有天數 → `距上次備份已 {daysSince} 天`。右側兩顆：`立即匯出`（btn-primary text-xs，onClick={onExport} 後重讀 BACKUP_KEY 讓橫幅消失——用一個 refresh state）與 `7 天後提醒`（btn text-xs，寫 SNOOZE_KEY = now+7d ISO，setState 隱藏）。
- 放進 Dashboard：`{!isMock && <BackupReminder onExport={onExport} />}`（**mock 模式不顯示**）。Dashboard Props 加 `onExport: () => void`；App 傳 `handleExport`。注意 handleExport 內含 `setMenuOpen(false)`，無副作用問題，直接重用。

**驗收條件**：三件套＋單測全過。smoke 環境是 mock 模式 → 橫幅**不應出現**：`scripts/verify-u6.mjs` 斷言總覽頁文字不含「備份」提醒字樣即可（反向驗證）＋ 單測涵蓋正向邏輯。標註「橫幅正向顯示未於瀏覽器實測（需真資料帳號）」。

**禁區**：不做自動排程匯出、不碰 Supabase。

---

## U3：全域快速記錄 + PWA 捷徑

**目標與動機**：任何分頁一鍵記錄（文字/語音）；長按 app icon 直達。

**Step 1 — QuickNoteSheet 元件**（新檔 `src/components/shared/QuickNoteSheet.tsx`）：
- Props：`{ onSave: (text: string) => Promise<void>; onClose: () => void }`
- 用既有 `Modal`：`className="fixed inset-0 z-[70] flex items-end"`、`contentClassName="relative bg-bg border-t border-border w-full p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"`（bottom-sheet 形態）。
- 內容：標題列（`section-label`「快速記錄」＋右上 × 關閉鈕 `aria-label="關閉"`）；`textarea`（`input-field h-24 resize-none`、autoFocus、placeholder「記下這一刻...」）；底列左 `VoiceInput`（onResult append 到 textarea，沿用 NotesList 的 `prev ? prev+' '+text : text` 邏輯）、右 `取消`＋`記錄`（btn-primary；空白內容 disabled）。
- 送出：`submitting` 防重複；成功 → toast.success('已記錄')、onClose；失敗 → toast.error（訊息用 err.message）。**不要**在成功後切到隨手記分頁（打斷工作流，定案：留在原分頁）。
- import `VoiceInput` 自 `../notes/VoiceInput`（跨資料夾 OK）。

**Step 2 — 觸發點**（`src/components/nav/BottomNav.tsx`）：
- Props 加 `onQuickNote: () => void`。
- 手機列：在 5 個 tab 之後、設定鈕之前插一顆：`className="flex-1 max-w-[56px] flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-bg bg-ink border-l border-border"`，內容 `✎` 圖示（用 16px SVG line icon，比照 NavIcons 風格新畫一個鉛筆 icon，放在 BottomNav 檔內即可）＋ `type-micro` 標籤「記錄」；`aria-label="快速記錄"`。
- 桌面列：設定鈕左側加同功能按鈕（icon＋「記錄」文字，樣式比照其他 tab 但 `text-ink` 底 `bg-card`）。
- **不改** 5 個 tab 的行為與順序。

**Step 3 — App 接線**：
- state `quickNoteOpen`；`<BottomNav onQuickNote={() => setQuickNoteOpen(true)} ...>`；
- `{quickNoteOpen && <QuickNoteSheet onSave={async (t) => { await noteStore.addNote(t); }} onClose={() => setQuickNoteOpen(false)} />}`（**不套 mockGuard**——新增操作在示範模式本來就允許）。

**Step 4 — PWA shortcuts**（`vite.config.ts` manifest）：
```ts
shortcuts: [
  { name: '快速記錄', short_name: '記錄', url: '/?quick=note', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
  { name: '新增工序', short_name: '工序', url: '/?quick=task', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
],
```

**Step 5 — 深連結處理**（App.tsx，top-level useEffect）：
```ts
useEffect(() => {
  if (!user) return;
  const q = new URLSearchParams(window.location.search).get('quick');
  if (!q) return;
  if (q === 'note') setQuickNoteOpen(true);
  if (q === 'task') setTab('task');
  window.history.replaceState(null, '', window.location.pathname);
}, [user]);
```
（`quick=task` 只切分頁不自動開表單——定案，FAB 就在眼前，不值得為此打穿三層 prop。）

**驗收條件**：三件套全綠。`scripts/verify-u3.mjs`：(1) 首頁點「快速記錄」→ sheet 出現、textarea 聚焦 → 輸入文字 → 點記錄 → 預期「新增筆記失敗」錯誤 toast（smoke 環境）且 sheet 未關（失敗不關，定案）；(2) 以 `launchApp('?quick=note')` 直開 → 斷言 sheet 自動打開且網址列 query 已清除。無 pageerror。dist 驗證：`npm run build` 後 `grep -c "快速記錄" dist/manifest.webmanifest` ≥1。附註 iOS 對 manifest shortcuts 支援有限（Android 完整）——寫進回報，不算失敗。

**禁區**：不動 NotesList 的輸入區；不改 Modal 本體。

---

## U5：製作核對模式（依賴 U1，最後一個 UI 項）

**目標與動機**：照配方稱料時逐項打勾防漏料，完成後一鍵建立「稱量配粉」工序。

**做法**（全部在 `src/components/recipe/RecipeDetail.tsx`＋App 一條新 prop）：
1. RecipeDetail Props 加 `onCreateWeighTask: (recipe: Recipe, batchWeight: number | null) => Promise<void>`。App 實作：
```ts
async (recipe, batchWeight) => {
  await taskStore.addTask({
    title: `${recipe.name} — 稱量配粉`, material: '', recipeId: recipe.id,
    taskType: 'weigh', status: 'ready', startDate: todayISO(), dueDate: null,
    completedDate: null, notes: batchWeight ? `批次 ${batchWeight}g` : '', checkpoints: [],
  });
}
```
（新增操作，不套 mockGuard。）
2. RecipeDetail state：`makeMode: boolean`、`checked: Set<string>`（key = `` `${cat}-${i}` ``，與現有 `openSimilarFor` 同款 key）。
3. sessionStorage 續存：key `` `sinus_make_${recipe.id}_${vIdx}` ``，值 `JSON.stringify([...checked])`。checked 變更時寫入；進入 makeMode 時讀取還原；「完成」或「結束」時 `sessionStorage.removeItem`。版本切換（vIdx 變）時自動退出 makeMode 並清 checked（不清 storage——那是別的版本的 key）。
4. UI：
   - 「配方組成」標題列加一顆 `開始製作`（btn text-xs；makeMode 時變成 `結束`）。
   - makeMode 時每個 ingredient row 前加 20×20 勾選鈕（樣式抄 TaskCard 勾選欄：未勾 `border-2` 框、已勾 `bg-ink` 內白色勾 SVG；`aria-pressed`、`aria-label="已稱 {材料名}"`）。已勾的 row：`opacity-50` + 名稱 `line-through`。
   - 材料表上方進度列：`已稱 {checked.size}/{總項數}` + `ProgressBar value={pct}`。
   - 全部勾完時，表尾出現 `完成稱料 → 建立工序`（btn-primary）；點擊 → `onCreateWeighTask(recipe, targetWeight)` → 成功 toast `已建立稱量工序`、退出 makeMode 清 storage；失敗 toast err.message、**不退出**。
   - makeMode 期間「同種×n」按鈕照常可用，不衝突。
5. U1 換算與 makeMode 並存：勾選狀態與換算獨立，換算改變不清勾選。

**驗收條件**：三件套全綠。`scripts/verify-u5.mjs`：進示範配方詳情 → 點「開始製作」→ 斷言出現「已稱 0/5」→ 勾兩項 → 斷言「已稱 2/5」且該兩項有 line-through → 重新整理頁面再進同配方開製作模式 → 斷言仍是 2/5（sessionStorage 續存）→ 全勾 → 點「完成稱料」→ 預期「新增工序失敗」錯誤 toast（smoke 環境）。無 pageerror。

**禁區**：不寫任何勾選狀態進 Supabase；不動 BurnLog/RelatedTasks。

---

## U7：Claude API 雲端代理（最後做，含部署工序）

**目標與動機**：API key 目前放 localStorage、瀏覽器直呼——不安全，且每台裝置要重貼。改為 Vercel serverless 代理（key 存伺服器端），舊直呼路徑保留為 fallback。

**Step 1 — vercel.json rewrite 排除 /api**（敏感但必要，這是本項唯一可動 vercel.json 的理由）：
```json
"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
```

**Step 2 — serverless function**（新檔 `api/claude.ts`，**不要**加進任何 tsconfig include；Vercel 自行編譯）：
```ts
// 只接受 POST；驗 Supabase JWT（防止代理被路人白嫖）；只轉發白名單欄位。
export default async function handler(req: { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (req.method !== 'POST') { res.status(405).json({ error: { message: 'method not allowed' } }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaAnon = process.env.SUPABASE_ANON_KEY;
  if (!apiKey || !supaUrl || !supaAnon) { res.status(501).json({ error: { message: 'proxy-not-configured' } }); return; }
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: { message: 'unauthorized' } }); return; }
  const who = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: supaAnon, Authorization: auth } });
  if (!who.ok) { res.status(401).json({ error: { message: 'unauthorized' } }); return; }
  const { system, messages, max_tokens } = (req.body ?? {}) as { system?: string; messages?: unknown; max_tokens?: number };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: Math.min(Number(max_tokens) || 8000, 8000), system, messages }),
  });
  const data = await r.json();
  res.status(r.status).json(data);
}
```
eslint：`eslint.config.js` 加一段 `{ files: ['api/**/*.ts'], languageOptions: { globals: globals.node } }`。

**Step 3 — 客戶端**（`src/services/claude.ts` 改造）：
1. 抽共用回應解析：現有的「content 找 text、stop_reason 檢查」邏輯抽成 `function parseClaudeResponse(data): string`（保持現有錯誤訊息字串不變）。
2. `callClaude` 新流程：
   - 先試代理：`sb.auth.getSession()` 取 access_token（import `{ sb }` 自 `../lib/supabase`；無 session → 直接走 fallback）。`fetch('/api/claude', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization: 'Bearer '+token }, body: JSON.stringify({ system, messages:[{role:'user',content:userMessage}], max_tokens: 8000 }) })`。
   - **代理不可用的判定（定案）**：fetch 網路錯誤、或 status 404、或 status 501 → 走 fallback 直呼（現有 localStorage key 路徑，原封不動）。dev 環境沒有 /api 會回 404 HTML——`res.json()` 會 throw，包在 try/catch 視同不可用。
   - 代理回 2xx → `parseClaudeResponse`；回其他狀態（401/4xx/5xx）→ 直接 throw 該 body 的 error.message（**不** fallback——那是真錯誤，例如登入過期，fallback 會遮蔽問題）。
3. `MenuOverlay` API key 區塊保留，說明文字下加一行 `type-micro text-ink-3`：`已部署雲端代理時此欄可留空`。

**Step 4 — 使用者手動部署步驟**（寫在本項回報區給 Ryan，Opus 不執行）：Vercel dashboard → Settings → Environment Variables 加 `ANTHROPIC_API_KEY`、`SUPABASE_URL`（同 VITE_SUPABASE_URL 值）、`SUPABASE_ANON_KEY`（同 VITE_SUPABASE_ANON_KEY 值）→ Redeploy。

**驗收條件**：三件套全綠（api/ 不在 tsc 範圍，但 eslint 要過）。`scripts/verify-u7.mjs`：smoke 環境對示範筆記按「AI 解析」（先在 MenuOverlay 存一個假 key）→ 預期錯誤 toast（fallback 直呼假 key 失敗）且**無 pageerror**——證明「代理 404 → fallback → 錯誤浮出」整條鏈不炸。**代理本體無法在本環境實測，標「未驗證：需部署後以真帳號實測」**。

**禁區**：不動 `BATCH_SYSTEM_PROMPT`/`NOTE_ANALYSIS_PROMPT` 內容；不把任何 key 寫進 repo；`vercel.json` 只能改 rewrites 該行。

---

## 第二批完成回報區

（每項完成後：✅＋三件套結果＋專屬驗證證據＋commit hash。verify-u*.mjs 腳本保留於 scripts/。全部完成後 `git push`。）

- U1 ✅：format.ts 新增 fmtAmount/scaleFactor ＋ 單測（21.749999→'21.75'、3→'3'、scaleFactor(20,50)→2.5、0/null/-5→1）。RecipeDetail 加換算控制（換算目標總重 input＋清除鈕，totalWeight<=0 不渲染），版本切換歸零，用量顯示換算值＋原量，總重列標倍率；百分比/硬上限不動。三件套：build 綠、lint 0/0、test 34 passed。`scripts/verify-u1.mjs` 實跑全 PASS：進沉木供香（假）詳情、填 40 → 「×2」「原 10」「20g」皆現、清除後回原量、無 pageerror。commit 188ccb2。
- U5 ✅：RecipeDetail 加製作核對模式（makeMode／checked Set，key `${cat}-${i}`）＋ App onCreateWeighTask prop（建立 weigh/ready 工序，不套 mockGuard）。「開始製作」切換、每列 20×20 勾選鈕（抄 TaskCard 樣式，aria-pressed/aria-label）、已勾 opacity-50＋line-through、進度列「已稱 n/總」＋ProgressBar、全勾出「完成稱料 → 建立工序」；sessionStorage `sinus_make_{id}_{vIdx}` 續存，版本切換退出並清 checked（不清 storage）。三件套：build 綠、lint 0/0、test 52 passed。`scripts/verify-u5.mjs` 全 PASS：開始製作 0/5 → 勾兩項 2/5＋line-through=2 → 重新整理再進仍 2/5（續存）→ 全勾 5/5 → 完成稱料出「新增工序失敗: TypeError: Failed to fetch」錯誤 toast、無 pageerror。commit 821ca93。
- U3 ✅：新增 `QuickNoteSheet.tsx`（Modal bottom-sheet，textarea autoFocus＋VoiceInput，失敗不關）。BottomNav 加 onQuickNote＋鉛筆 icon，手機列（5 tab 後、設定前）與桌面列（設定左）各一顆「記錄」鈕。App 加 quickNoteOpen 狀態、掛載 sheet（addNote，不套 mockGuard）、?quick=note/task 深連結 useEffect。vite.config.ts manifest 加 shortcuts。三件套：build 綠、lint 0/0、test 52 passed。`grep -c "快速記錄" dist/manifest.webmanifest` = 1（≥1）。`scripts/verify-u3.mjs` 全 PASS：點記錄開 sheet、textarea 聚焦、送出後錯誤 toast 且 sheet 未關、?quick=note 直開 sheet 且 query 已清、無 pageerror。附註：iOS 對 manifest shortcuts 支援有限，Android 完整（不算失敗）。commit 53fa943。
- U6 ✅：新增 `src/utils/backup.ts`（shouldRemindBackup＋BACKUP_KEY/SNOOZE_KEY）＋ 6 案例單測（從未備份／29 天／30 天／snooze 中／snooze 過期／無效日期字串走從未備份分支）。App handleExport 後寫 BACKUP_KEY；新增 `BackupReminder.tsx` dashed 橫幅（立即匯出＋7 天後提醒），Dashboard 以 `{!isMock && ...}` 掛載。三件套：build 綠、lint 0/0、test 52 passed。`scripts/verify-u6.mjs` 反向驗證全 PASS：mock 模式不出現「尚未匯出過備份」「距上次備份」字樣、無 pageerror。橫幅正向顯示未於瀏覽器實測（需真資料帳號），由單元測試涵蓋。commit a26baaa。
- U4 ✅：新增 `src/utils/globalSearch.ts`（searchRecipes/Materials/Notes）＋ 12 案例單測（命中欄位／大小寫／limit／空 query）。新增 `GlobalSearch.tsx` 放於總覽 header 下、mock 橫幅上；App 加 matSeed/noteSeed 狀態與跳轉 callback，手動切分頁清 seed；MaterialList/NotesList 加 initialSearch（材料跨類預設開，NotesList 新增搜尋框與「無符合的筆記」空態）。三件套：build 綠、lint 0/0、test 46 passed。`scripts/verify-u4.mjs` 全 PASS：搜「乳香」面板出配方＋材料區塊與乳香結果、點材料切分頁帶入「乳香」且跨類開啟、回總覽搜「沉木」點配方進詳情、無 pageerror。commit 4624ce1。
- U2 ✅：新增 `src/utils/materialName.ts`（composeMaterialName/splitMaterialName）＋ 6 案例單測。MaterialList 移除三段式 input 與 THREE_SEG_RE，改「品名」單欄自動組合，供應商 datalist，編輯改名保護把舊 name 併入 aliases。三件套：build 綠、lint 0/0、test 34 passed。`grep -rn "THREE_SEG_RE" src/` = 0 筆。`scripts/verify-u2.mjs` 實跑全 PASS：表單出現「品名」label、無「三段式」字樣、送出後出現錯誤 toast（實際「儲存失敗：新增材料失敗: TypeError: Failed to fetch」＝寫入線路接通）、無 pageerror。commit de34e8f。
