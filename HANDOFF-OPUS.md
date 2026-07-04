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

## 項目 5：依賴小版本升級（低優先，可跳過）

**目標與動機**：依賴健康檢查。只做 patch/minor，**不做 major**。

**具體做法**：
1. `npm outdated` 檢視；只升 `@supabase/supabase-js`、`react`、`react-dom`、`zod`、`vite-plugin-pwa` 的 minor/patch。
2. `vite` 若有 major（6→7）**不要升**。
3. 每升一個跑一次 build+test。

**驗收條件**：build/lint/test 全綠；`npm outdated` 輸出貼在本項下方。

**禁區**：任何 major 升級；`typescript` 版本不動（`~5.7.2` 是 tsc -b 相容錨點）。

---

## 完成回報區

- 項目 1 ✅：`grep -rn "備注" src/` = 0 筆；build 綠、test 23 passed、lint 0 error（2 warning 為項目 4 目標）。commit 3eb44e6。
- 項目 2 ✅：`grep -rn "suppressSync" src/components/` = 0 筆（hooks 內部保留）；build 綠、test 23 passed、lint 0 error。commit c76574e。
- 項目 3 ✅：MaterialCard 根 div 加 role="button"/tabIndex=0/onKeyDown(Enter,Space,preventDefault)/aria-expanded，▲▼ 加 aria-hidden；build 綠、test 23 passed、lint 0 error。鍵盤行為經程式碼審視符合 TaskCard 範本，未於瀏覽器實測。commit 113de41。
- 項目 4 ✅：採檔案拆分方案（非 eslint 豁免）。TAB_ICONS→nav/tabIcons.ts；Toast 拆為 shared/ToastContext.ts（context+型別）與 shared/useToast.ts（hook），Toast.tsx 僅剩 ToastProvider 元件；11 個 useToast import 路徑更新。`npm run lint` = 0 error 0 warning；build 綠、test 23 passed。commit 426c79f。備註：context 依 react-refresh 規則移至獨立檔（規則明示 "Move your React context(s) to a separate file"），非留在 Toast.tsx。
