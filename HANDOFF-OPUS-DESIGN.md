# HANDOFF-OPUS-DESIGN — SINUS NOTE 改版工作單（依 Claude Design 定稿）

> 產生日期：2026-10-17｜產生者：Fable 5.1 設計對照 session
> 接手者：Opus 5.5。**所有設計決策已定案，照做即可，不要重新設計。**
> 設計稿：https://claude.ai/code/artifact/f2bdcf5d-1083-4455-b9e1-f6bb9fb45e7f
> 定稿版本：總覽、配方首頁、配方詳情、製作核對 **一律用 v2 畫板**（OverviewV2 / FormulasV2 / FormulaDetailV2 / ProductionV2）；材料庫只有一版（Materials）；字級與色彩以 Main 畫板為準。v1 畫板只當參考，規格衝突時以 v2 為準。

---

## 0. 共通規則（先讀完再動手）

- **Branch**：`claude/dazzling-maxwell-ymau6z`，不開新 branch、不碰 main。
- **驗證三件套**：每項完成後必跑 `npm run build && npm run lint && npm test`，三者全綠才算完成。UI 項目另跑該項列出的 `scripts/verify-*.mjs`（用法見 `scripts/smoke.mjs` 頂部註解）。不能驗證的改動要標「未驗證」。
- **敏感區（不准動）**：`supabase-schema*.sql`、`src/lib/supabase.ts` 的 Row 型別與轉換函式、`src/hooks/supabase/*` 的錯誤契約、`src/components/admin/MigratePage.tsx` 寫入邏輯、`src/utils/export.ts` 的 BackupData 既有欄位（**只能新增 `notes` 欄位**，見 D8）。
- **不在本單範圍**：Supabase 資料模型、AI prompt、PWA manifest、桌機版（md 以上）版面只需不壞掉，不另外設計。
- **每項一個 commit**，message 格式 `feat(design): <英文摘要> (D<n>)`。遇到本文件沒寫到的情況：停下、在該項標註「⚠ 遇到 X，未處理」，做下一項。
- **回報格式**：完成一項就在該項標題後打 ✅，附一行驗證證據。

### 0.1 設計系統鐵律（本次更新版，取代第二批 HANDOFF 的那一條）

- 零圓角（`border-radius: 0`）、無陰影（既有 `shadow-sm` 用例保留，不新增）、無漸層、不用 emoji（幾何符號 ✎ ⌕ ＋ × ▸ 可以）。
- 色票只用 `src/utils/constants.ts` 的 PALETTE 與 Tailwind token；**不再有任何文字用透明度降淡**（`opacity-*` 只能用在 disabled 狀態與已完成卡片整體，不能用在純文字上）。
- 字重：介面與內文一律 400（body 預設），只有 `font-serif` 的大標題（type-display、type-title、配方名）用 300。`font-light` class 全部移除。
- 數字（用量、重量、天數、計數、編號）一律加 `tabular-nums`。
- 每個畫面**只有一顆** `btn-primary`（黑底白字 48px）。其餘按鈕用 `btn`（44px、1.5px 邊框 #6B6459、文字 #1A1A18）。
- 所有可點的小元素（展開箭頭、×、⋯、「全部 →」）點擊區至少 44×44，視覺可以小。
- 手機版左右留白 20px（`px-5`），區塊間距 32 至 40px（`mt-8`／`mt-10`）。
- 左側 3px 色條只留給「主角卡」（總覽的下一步卡、製作模式的這一步卡、材料卡）；其他清單列改用 8px 色方塊＋墨色文字，**狀態不靠彩色字表達**（逾期天數例外，用 error 色＋500 字重）。
- Section 標題一律「英文大寫 kicker＋中文」：`NEXT 下一步`、`ATTENTION 需要注意`、`FORMULA 配方組成`、`FORMULAE 配方`、`NOW 這一步`、`NEXT 接下來`。12px、500、英文 `tracking-[0.16em]`、中文 `tracking-[0.1em]`、#6B6459。

### 0.2 執行順序（固定）

D0 token → D1 共用元件 → D2 總覽 → D3 配方首頁 → D4 配方詳情 → D5 製作核對 → D6 材料庫 → D7 其餘畫面套 token → D8 併修 bug → D9 回歸腳本。D2 到 D6 都依賴 D0、D1；D5 依賴 D4。

---

## D0：設計 token（純樣式，可整批退回） ✅ `508fdde`｜grep font-light / 文字 opacity = 0；smoke 五頁無 pageerror

**目標**：把 Main 畫板的字級、字重、對比落到全站，不碰任何版面。

**具體做法**

1. `index.html` 字型連結改為：`family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@300;400;500`（拿掉 Sans 300 與 Serif 600）。
2. `src/styles/global.css`：
   - `html, body` 的 `font-weight: 300` 改 `400`；`input, textarea, select, button` 同步改 `400`。
   - `--ink-3` 改成 `#6B6459`（與 `--ink-2` 相同；Tailwind 的 `ink-3` 本來就是 #6B6459，兩邊對齊）。
   - 字級系統改成下表（全部 `@apply`，數值寫死）：

   | class | 新規格 | 舊規格 |
   |---|---|---|
   | `.type-display` | `font-serif text-2xl font-light tracking-[0.08em] text-ink`（24/300） | 24/300 tracking-wide |
   | `.type-title` | `font-serif text-2xl font-light tracking-[0.06em] text-ink`（24/300） | 20/300 |
   | `.type-heading` | `font-serif text-lg font-normal text-ink`（18/400） | 16 |
   | `.type-name` | `font-serif text-lg font-normal text-ink`（18/400） | 14 |
   | `.type-body` | `text-base text-ink`（16/400） | 14 |
   | `.type-meta` | `text-[13px] text-ink-2`（13/400） | 12 |
   | `.type-micro` | `text-xs text-ink-2`（12/400） | 11 ink-3 |
   | `.type-label` | `text-xs font-medium tracking-[0.16em] uppercase`（12/500） | 12/300 |
   | `.type-numeric` | `tabular-nums`（不再強制 serif） | serif tabular |
   | `.section-label` | `text-xs font-medium tracking-[0.1em] uppercase text-ink-2`（12/500） | 12/300 |

   - 按鈕與輸入框：
     - `.btn`：`h-11 px-5 border-[1.5px] border-ink-2 text-[15px] text-ink bg-transparent hover:bg-card inline-flex items-center justify-center tracking-[0.04em]`。
     - `.btn-primary`：`h-12 px-6 bg-ink text-white text-base font-medium tracking-[0.08em] inline-flex items-center justify-center hover:bg-ink-2`（文字色用白 `#FFFFFF`，不是 bg 色）。
     - `.btn-text`（新增）：`h-11 px-3 inline-flex items-center gap-2 text-[15px] text-ink bg-transparent`（給「記一筆試燒」「全部 →」這類文字按鈕）。
     - `.input-field`：`w-full h-12 px-3.5 bg-bg border-[1.5px] border-ink-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none`；`textarea.input-field` 高度由各處 class 決定，不受 `h-12` 影響（用 `textarea.input-field{height:auto}` 覆寫）。
     - `.input-underline`（新增，給換算框）：`h-11 w-16 bg-transparent border-0 border-b-[1.5px] border-ink text-center text-xl tabular-nums text-ink focus:outline-none`。
   - 新增 `.kicker`：`text-xs font-medium tracking-[0.16em] text-ink-2 uppercase`，中文部分用 `<span class="ml-2.5 tracking-[0.1em]">`。
   - 手機 16px 防縮放那段 media query 保留。
3. `tailwind.config.ts`：`'ink-3'` 維持 #6B6459；新增 `spacing` 不用；確認 `letterSpacing.label` 仍是 0.15em（既有用例不改值）。
4. 全站掃除：
   - `font-light`（目前 26 處）全部刪除；serif 大標題要輕的地方改用 `type-display`／`type-title` 類別本身提供的 `font-light`。
   - 純文字上的 `opacity-60`／`opacity-70`／`opacity-40`（目前 7 處）全部刪除；`opacity-50` 只保留在 `disabled:` 與製作模式已勾選列。
   - `text-ink-4` 當文字色的地方（11 處，主要是 TaskCard 已完成狀態的內嵌 `#D6CFC4`）改為 `text-ink-2`＋`line-through`。
   - `text-[9px]`（RecipeHome 圖格底部）改 `text-xs`。
   - 固定寬高小於 44px 的可點元素（▲▼、×、「全部 →」、清除換算）補 `min-w-[44px] min-h-[44px]`。

**驗收條件**：三件套全綠；`grep -rn "font-light" src/` = 0；`grep -rn "opacity-60\|opacity-70\|opacity-40" src/components` = 0；`npm run build` 後用 `scripts/smoke.mjs` 跑五個分頁無 pageerror。附一張手機截圖（總覽）在回報裡說明字級已變。

**禁區**：不改任何版面結構、不動 PALETTE 色碼。

---

## D1：共用元件（給 D2 到 D6 用） ✅ `2bb71f2`｜grep StatusBadge / crossCategory = 0；status.test 3 筆過

全部放 `src/components/shared/`，每個元件附 props 註解，不寫可測邏輯副本（純函式放 utils 並附測試）。

1. **`DrawerRow.tsx`**（抽屜列，v2 的核心樣式）
   - Props：`{ label: ReactNode; summary?: string; count?: number; open: boolean; onToggle: () => void; icon?: ReactNode; children: ReactNode; tone?: 'default' | 'error' }`。
   - 外觀：高 56px、上下 1px `border-border`（相鄰兩列共用一條線，用 `border-t` 加容器 `border-b`）；左 `label` 16px ink（`count` 用 13px ink-2 跟在後面）；中間 `summary` 13px ink-2 靠右、單行截斷（`truncate`）；右側 44×44 圖示區：關閉時 14px 線條「＋」SVG，打開時「－」。`tone='error'` 時 label 與 summary 用 `text-error`。
   - 按鈕是真的 `<button aria-expanded>`；`children` 在 open 時渲染在列下方，`pb-4`。
   - 可選 `icon`：放在 label 前（製作模式「已稱」用 20×20 黑底白勾）。
2. **`BottomSheet.tsx`**（由下往上的抽屜）
   - 基於既有 `Modal`（不改 Modal 本體）：`className="fixed inset-0 z-[70] flex items-end"`，`contentClassName="relative bg-bg border-t border-border w-full flex flex-col"`，內容高度 `max-h-[85vh]`，含：頂部拖曳把手（36×4 `bg-border`，`pt-2` 置中，純裝飾 `aria-hidden`）、標題列（`type-heading` 左、右側 44×44 「×」`aria-label="關閉"`）、可捲動 body（`overflow-y-auto px-5`）、固定 footer（`border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] grid grid-cols-[1fr_2fr] gap-2.5`）。
   - Props：`{ title: string; onClose: () => void; footer?: ReactNode; children: ReactNode }`。backdrop 30% 黑（`bg-ink/30`，既有 Modal 已是）。
3. **`StatusDot.tsx`**：`{ color: string; label: string; outlined?: boolean; size?: 8 }` → 8px 方塊（`outlined` 時 1.5px `border-ink-2` 空心，給「待製」）＋13px ink 文字。**取代 `StatusBadge` 的所有 4 處用法**，`StatusBadge.tsx` 刪除。
4. **`SectionHeader.tsx`** 改版：Props 加 `kicker?: string`（英文大寫）；渲染 `<h2 class="kicker">NEXT<span class="ml-2.5 tracking-[0.1em]">下一步</span><span class="ml-1.5 text-ink tabular-nums">5</span></h2>`；count 不再用底色膠囊；`onMore` 的「全部 →」改用 `.btn-text`（高 44）。
5. **`SearchField.tsx`** 改版：新增 prop `persistent?: boolean`。`persistent` 時：永遠展開、不渲染收起鈕、高 48px、`bg-card` 無邊框、左 18px 放大鏡、輸入 16px；仍保留清除 ×（44×44）。`crossCategory` 相關 props 整個移除（唯一用例 MaterialList 在 D6 改掉）。非 persistent 模式維持現狀（桌機 `/` 快捷鍵保留）。
6. **`NavIcons.tsx`**：所有 icon `strokeWidth` 改 `1.25`。**`BottomNav.tsx`** 手機列：選中項的指示線改成置中 16×2（`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-ink`），選中標籤 `font-medium`，未選中文字 `text-ink-2`。桌機列不動。
7. **`Kicker`** 不另做元件，直接用 `.kicker` class。
8. **`RecipeRow.tsx`**（配方清單列，FormulasV2 樣式；總覽抽屜與配方首頁共用）：高 80px、`border-b border-border`；左 36px 寬 `font-serif text-[13px] text-ink-2 tracking-[0.04em]` 顯示 `num`；中間 `font-serif text-lg` 名稱＋13px ink-2 副行（`FRAG_CATS[fragCat].label` · tags.join(' · ') · 星等，有才顯示）；右 `StatusDot`。整列是 `<button>`，`aria-label="開啟配方 {name}"`。
9. **`useWakeLock.ts`**（`src/hooks/`）：`navigator.wakeLock?.request('screen')`，回傳 `{ active: boolean; supported: boolean }`；`visibilitychange` 回到前景時重新 request；unmount release。不支援時 `supported=false`，不丟錯。

**驗收條件**：三件套全綠；每個元件在 D2 到 D6 至少被用一次；`grep -rn "StatusBadge" src/` = 0；`grep -rn "crossCategory" src/` = 0。

---

## D2：總覽（OverviewV2 畫板） ✅ `04043ab`｜verify-d2 8 PASS

**檔案**：`src/components/dashboard/Dashboard.tsx`、`src/App.tsx`、`src/components/nav/MenuOverlay.tsx`、新檔 `src/utils/nextTask.ts`（＋測試）、`src/utils/date.ts`（＋測試）。

**具體做法**

1. **純函式**
   - `src/utils/date.ts` 加 `formatDashboardDate(d: Date): string` → `2026.10.17　星期六`（年.月.日 兩位補零，全形空格，星期用 `['日','一','二','三','四','五','六']`）。測試 3 案例。
   - `src/utils/nextTask.ts`：`pickNextTask(tasks: Task[]): Task | null`。規則（依序）：排除 `done`；(a) 有 dueDate 且 `daysUntil < 0` 者取逾期最多天的；(b) `daysUntil === 0`；(c) `TASK_TYPES[t.taskType].defaultDays === 0` 且狀態為 `ready` 或 `processing`，取 `createdAt` 最早；(d) 其餘取 dueDate 最近；都沒有回 null。測試至少 5 案例。
2. **版面**（由上到下，容器 `max-w-content mx-auto px-5 pt-7`）
   - Header 高 56：左 `type-display`「SINUS NOTE」＋下方 13px ink-2 `formatDashboardDate`；右齒輪 44×44（`IconSettings`），**齒輪右上角 6×6 琥珀色方塊**（`#9a8040`）在 `backupDue || isMock` 時顯示，`aria-label` 隨之變成「設定（尚未備份）」或「設定（示範資料）」。
   - 搜尋：`<GlobalSearch>` 內的 `SearchField` 改 `persistent`，placeholder 不變「搜尋配方、材料、筆記」。結果面板樣式沿用，但列高 ≥ 44、字級用新 token。
   - 統計一行（取代 `StatsRow`，檔案刪除或改名 `StatsLine.tsx`）：`配方 4　·　進行中 4　·　已完工序 0 / 5`，13px ink-2，數字 ink `tabular-nums`。計算公式沿用 StatsRow（不改語意）。
   - `NEXT 下一步`：`pickNextTask(tasks)` 有值才渲染。卡片 `bg-card border-l-[3px] px-[18px] py-[18px] flex items-end justify-between gap-3`；色條顏色：逾期用 `#a06050`，否則 `PHASE_COLORS[phase]`。內容：12px 500 `tracking-[0.12em]` 小標（逾期→「最急」error 色；其他→「下一步」ink-2）、`font-serif text-xl` 標題、13px ink-2 副行「{關聯配方名} · {逾期 N 天｜今天到期｜剩 N 天｜狀態}」（逾期用 error 500）。右側 `btn-primary`「處理」→ `onTaskOpen(task.id)`（見 4）。
   - `ATTENTION 需要注意 N`（`SectionHeader kicker="ATTENTION"`，N = alertTasks 總數）：列表 = alertTasks **排除已當作 NEXT 的那一筆**；前 2 筆直接顯示，列高 60、`border-b border-border`、8px 色方塊（逾期 error、否則 phase 色）、標題 16、副行 13 ink-2（`TASK_TYPES.label`）、右側 13px ink 狀態字（逾期天數用 error 500）；第 3 筆起收進 `DrawerRow label="其餘 N 項" summary={names.join('、')}`，展開後同樣式列。整個 section 在 alertTasks 為 0 時隱藏。
   - 兩列抽屜（共用一組 `border-t`）：
     - `DrawerRow label="近期配方" count={recipes.length} summary={最近 3 筆名稱 join('、') + '…'}` → 展開顯示最近 4 筆 `RecipeRow`（依 updatedAt 倒序）＋底部 `btn-text`「全部 →」切到配方分頁。
     - `DrawerRow label="最新隨手記" count={notes.length} summary={notes[0].text 前 30 字}` → 展開顯示最新 2 則（卡片 `bg-card p-3.5`，12px 日期＋16px 內文兩行截斷）＋「全部 →」切到隨手記分頁。
     - `DrawerRow label="批次解析" summary="貼上對話，AI 整理成配方、材料、工序"`，右側加 12px「AI」標籤 → 展開內容就是既有 `<BatchImport>`（**BatchImport 本身的展開鈕拿掉，改由 DrawerRow 控制**；其內部 props 與邏輯不動）。
   - **刪除**：示範資料橫幅、`BackupReminder`、`ActiveTasksSection`、`MaterialOverviewSection`、`RecentRecipesSection`、`LatestNotesSection`、`AlertTasksSection`、`StatsRow` 這些檔案（功能都已併入上面）。空狀態文案保留（四個 store 皆空時才會出現，示範模式下不會看到）。
3. **設定選單（MenuOverlay）吸收示範資料與備份提醒**
   - Props 新增 `isMock: boolean`、`backupDaysSince: number | null`、`backupDue: boolean`、`onSnoozeBackup: () => void`。
   - API key 區塊之上新增「狀態」區：示範模式時一列 13px「目前顯示示範資料，新增第一筆資料後自動切換」；`backupDue` 時一列「尚未備份｜距上次備份已 N 天」＋兩顆 `btn text-xs`「立即備份」（呼叫 onExport）、「7 天後提醒」（onSnoozeBackup 寫 `SNOOZE_KEY`）。
   - App 層：用 `shouldRemindBackup(Date.now(), localStorage[BACKUP_KEY], localStorage[SNOOZE_KEY])` 算 `backupDue`，用一個 `backupTick` state 在匯出／延後後重算；mock 模式不算 due。
4. **App 接線**
   - 新 state `taskSeed: string | null`；`onTaskOpen(id)` → `setTaskSeed(id); setTab('task')`。`TaskDashboard` 加 prop `initialEditTaskId?: string`：掛載時若有值，`setEditTask(找到的 task)` 並開啟編輯（D7 會把編輯改成 BottomSheet，所以不需要捲動）。手動切分頁時清 `taskSeed`（跟 matSeed 同一處）。
   - `Dashboard` 的 props 瘦身：移除 `onExport`、`onTaskClick`；新增 `onTaskOpen`、`backupDue`。`BatchImport` 相關 props 照舊傳。

**驗收條件**：三件套全綠；`scripts/verify-d2.mjs`：總覽含「下一步」kicker 與「處理」按鈕；需要注意區塊出現「其餘」抽屜，點開後列數增加；點「近期配方」抽屜展開後點第一列進入詳情（含「配方組成」）；頁面不含「示範資料」字樣，而開啟設定選單後含「示範資料」。無 pageerror。

**禁區**：不改 `BatchImport` 內部邏輯與 props；不改 `GlobalSearch` 的比對函式。

---

## D3：配方首頁（FormulasV2 畫板） ✅ `729587a`｜verify-d3 10 PASS

**檔案**：`src/components/recipe/RecipeHome.tsx`、`src/App.tsx`、`src/utils/globalSearch.ts`（＋測試）。

**具體做法**

1. **預設清單檢視，圖格變第二檢視**。`RecipeHome` 新 state `view: 'list' | 'grid'`，惰性初始化讀 `localStorage['sinus_recipe_view']`（預設 `'list'`），切換時寫回。
2. **Header**：`.kicker`「FORMULAE」＋`type-display`「配方」（24/300）。
3. **搜尋列**：`flex gap-2`：`SearchField persistent` placeholder「搜尋配方、材料」（`flex-grow`）＋「篩選」按鈕 48 高、1px `border-border`、左 16px 漏斗線條 SVG、`aria-expanded`。
   - 搜尋比對改用 `searchRecipes` 的規則並**加上材料名**：`src/utils/globalSearch.ts` 的 `searchRecipes` 增加比對 `versions[].ingredients[].name`（不分大小寫）；補測試「以材料名命中」。RecipeHome 本地的 `filtered` 改呼叫 `searchRecipes(recipes, search, Infinity)`。
4. **篩選面板**（`aria-expanded` 打開時顯示在搜尋列下方，兩列）：
   - 第一列：狀態 5 等分分段鈕（`grid grid-cols-5`，高 44，相鄰共用邊框，選中 `bg-ink text-white`，未選 `border-[1.5px] border-ink-2`）：全部／進行中／待製／成功／失敗，各附計數 `tabular-nums`；若有 `order` 狀態的配方，追加第 6 格「訂單」（grid-cols-6）。
   - 第二列：分類標籤 `grid grid-cols-4 gap-2`，高 44、`bg-card border border-border`、前 6px 分類色方塊（`FRAG_CAT_COLORS[cat].border`），只列出 count > 0 的分類，多選互斥（點同一個取消）。
   - 套用中的條件顯示在清單標題列：「全部 · 4 款」→ 「進行中 · 供香 · 1 款」。
5. **清單標題列**：左 13px ink-2「{條件} · N 款」；右兩顆 44×44 圖示鈕（清單／圖格，`aria-pressed`）。
6. **清單**：容器 `border-t border-ink`；每筆 `RecipeRow`；排序 `updatedAt` 倒序；空結果「無結果」`type-body text-ink-2 py-8 text-center`。
7. **圖格檢視**：既有 2 欄分類格原樣保留（含拖曳排序、封面上傳），只套 D0 token；分類格點擊仍走 `onCatClick`。
8. **FAB**：`right-5`，`bottom: calc(3.5rem + 1rem + env(safe-area-inset-bottom))`，56×56 黑底「＋」，`aria-label="新增配方"` → `onNew(selectedCat ?? undefined)`（App 的 `goRecipeForm(undefined, cat)`）。RecipeHome 新 prop `onNew: (cat?: FragCat) => void`。
9. **導覽修正（App.tsx）**：
   - 新 state `recipeOrigin: 'home' | 'category'`。`goRecipeDetail(id)` 時：找到 recipe 就 `setActiveCat(recipe.fragCat)`；若當下 `recipeScreen !== 'category'` 則 `setRecipeOrigin('home')`，否則 `'category'`。
   - `goRecipeBack`：`detail` → 回 `recipeOrigin` 對應畫面；`form` → 若 `editRecipe` 存在回 `detail`，否則回 `recipeOrigin`。
   - `handleUpdateRecipe` 成功後維持回 `detail`（現狀）。

**驗收條件**：三件套與單測全綠；`scripts/verify-d3.mjs`：配方分頁預設出現「FORMULAE」與 4 筆清單列（含「沉木供香（假）」），不出現「01 FORMULAE」圖格；點「篩選」出現「進行中」分段鈕；點清單第一列進詳情，按「← 返回」回到清單（頁面含「FORMULAE」）；切到圖格檢視出現「SHRINE」，重新整理後仍是圖格（localStorage）。無 pageerror。

**禁區**：不動 `catOrder`／封面圖儲存邏輯。

---

## D4：配方詳情（FormulaDetailV2 畫板） ✅ `dab1519`｜verify-d4 13 PASS

**檔案**：`src/components/recipe/RecipeDetail.tsx`、`BurnLog.tsx`、`RelatedTasks.tsx`、`src/App.tsx`。

**具體做法**

1. **頂列**：左「← 返回」`btn-text`（44 高、16px）；右 `ActionMenu`（44×44「⋯」）items：`編輯`（onEdit）、`刪除`（danger，onDelete）。畫面底部原本的「編輯／刪除／狀態」列**刪除**。
2. **Header**（`px-5 pt-4`）：第一行左 `font-serif text-[13px] text-ink-2 tracking-[0.08em]`「V-A　供香」（編號＋全形空格＋分類），右 `StatusDot`；標題 `font-serif text-3xl font-light tracking-[0.08em]`；tags 13px ink-2。
3. **版本 tabs**：多版本時保留，tab 高 44、13px，選中底線 2px ink。切版本的 handler 內同時退出製作模式並清 `checked`（把現有的 `useEffect([vIdx])` 裡的 makeMode/checked 重設**搬進 tab 的 onClick**，effect 只留 `setTargetWeight(null)`；原因見 D8-5）。
4. **入庫測試抽屜**（取代紅框「v3.0 規則檢查」）：
   - 有 `ceilingWarnings` 或 `materialWarnings` → `DrawerRow tone="error" label="規則警告" summary="N 項超過硬上限"`，展開列出超限（「乳香 比例 10.0% 超過硬上限 7%」）與 v3Warnings。
   - 否則只有 `pendingMaterials` → `DrawerRow label="入庫測試" summary="N 項材料尚未測試"`（中性色），展開列出材料名，每列右側 `btn-text`「跑 SOP」（可選；沒有現成入口就只列名稱，標「未做」）。
   - 兩者都沒有 → 不渲染。
5. **FORMULA 配方組成**（`SectionHeader kicker="FORMULA"`）：
   - 總重區：左欄「總重」12px ink-2 `tracking-[0.1em]`＋`text-[28px] tabular-nums`「20」＋15px ink-2「 g」；右欄 `label`「換算成」13px ink-2＋`.input-underline`（`type="text" inputMode="decimal"`，值為空字串時不顯示 0）＋「g」13px。factor ≠ 1 時在輸入框下方 12px ink-2 顯示「× 2.5」。`version.totalWeight <= 0` 時整個換算區不渲染（現狀規則）。
   - 比例條：高 6px、段間 `gap-[2px]`，顏色沿用 `ING_CAT_COLORS`。
   - 材料表：容器 `border-t border-ink mt-1.5`；**拿掉分類子標題**，以 `version.ingredients` 原始順序渲染；每列 56 高 `border-b border-border flex items-center gap-3`：8px 分類色方塊、名稱 16（`ingredientDisplay`）、副行 13 ink-2「{ING_CATS.label} · {supplierShort}」（無供應商只顯示分類；未對應材料加「 · 未對應」）、右側百分比 13 ink-2 `w-9 text-right`、用量 `text-xl tabular-nums w-[54px] text-right` ＋ 13px ink-2「 g」（單位用 `ing.unit`）。factor ≠ 1 時：用量顯示換算值（`fmtAmount`）、顏色 `text-accent`，百分比欄位改顯示 12px ink-2「原 {amount}」。超過硬上限的列：用量用 `text-error font-medium`。
   - 「同種×n」：改成副行末尾 13px `text-accent` 文字「同種 ×n」，點擊區用 `py-2 -my-2` 撐到 44；展開內容沿用現狀。
   - 按鈕區（`pt-3.5 flex flex-col gap-1`）：`btn-primary` 全寬「開始製作」`tracking-[0.12em]`（ingredients 為空或 totalWeight ≤ 0 時不渲染）→ 進入 D5 的製作模式；其下 `btn-text` 置中「記一筆試燒」（前置 16px 火焰線條 SVG）→ 開啟既有 `BurnForm`，儲存走新的 `onBurnSaveForRecipe(recipe.id, entry)`。
6. **抽屜區**（`mt-7 border-t border-border`，依序；沒有內容的抽屜不渲染）：
   - `版本備註`：`version.notes` 有值才顯示，**預設展開**，內文 16px `leading-[1.75] whitespace-pre-wrap`；`version.comments` 接在下面 12px。
   - `工序標記`：`process` 有任一旗標或 notes 才顯示；summary 為旗標中文 join('、')；展開內容沿用現有樣式。
   - `時間軸`：timeline 有任一欄位才顯示；summary 列出有值的項目名稱（製作、乾燥、陳化）；展開內容 2 欄 grid，每格 13px ink-2 標籤＋16px `tabular-nums` 值，`border-t`／`border-b border-border`。
   - `試燒紀錄 N`：summary 取最後一筆 `notes` 前 20 字（無則「{date} · 評分 n/5」）；展開內容 = `BurnLog` 現有卡片改成細線列（日期 13、前中後 16、煙與星等 13）。`BurnLog.tsx` 改成只負責內容，不含自己的開合鈕。
   - `相關工序 N`：summary「{TASK_TYPES.label} · {TASK_STATUS.label}」取第一筆；展開列 56 高，點擊走 `onTaskTab`。`RelatedTasks.tsx` 同樣改成只負責內容。
   - 評分星等移到 header 的 tags 行末尾（13px `text-accent`）。
7. **App 接線**：`RecipeDetail` 新 prop `onBurnSaveForRecipe: (recipeId: number, entry: BurnEntry) => Promise<void>`，App 實作 `recipeStore.updateRecipe(id, { burnLog: [...recipe.burnLog, entry] })`，套 `mockGuard`。刪除確認框文案改「確定要刪除配方「{name}」？」（**拿掉「此操作無法復原」**，因為刪除後有復原鈕）。

**驗收條件**：三件套全綠；`scripts/verify-d4.mjs`：進示範配方詳情，頁面含「FORMULA」「配方組成」「開始製作」「記一筆試燒」，不含「v3.0 規則檢查」，含「入庫測試」抽屜，點開後含「沉香粉」；填換算 50 出現「× 2.5」與「25」；點「⋯」出現「編輯」「刪除」；點「記一筆試燒」出現「試燒紀錄」對話框。無 pageerror。

**禁區**：不動 `resolveMaterial`、警告計算、`scaleFactor`／`fmtAmount`。

---

## D5：製作核對模式（ProductionV2 畫板） ✅ `34ad87e`｜verify-d5 14 PASS

**檔案**：新檔 `src/components/recipe/ProductionMode.tsx`；`RecipeDetail.tsx` 只負責開關與傳資料；`src/hooks/useWakeLock.ts`（D1）。

**具體做法**

1. **容器**：`fixed inset-0 z-[80] bg-bg flex flex-col`（蓋過 z-50 的底部導覽；Toast 是 z-[100] 仍可見）；掛載時 `document.body.style.overflow='hidden'`，卸載還原；`role="dialog" aria-modal="true" aria-label="製作核對"`；Esc 鍵＝結束。進入時呼叫 `useWakeLock()`。
2. **Props**：`{ recipe, version, resolved: ResolvedIngredient[], factor, targetWeight, checked: Set<string>, onToggle(key), onExit(), onComplete(): Promise<void> }`。`checked` 與 sessionStorage 續存邏輯留在 `RecipeDetail`（現狀），key 規則不變（`${cat}-${i}`，**但順序改用 ingredient 原始索引**：key 改為 `` `${i}` ``，進入模式時若 storage 內是舊格式直接忽略）。
3. **頂列** 56 高 `px-5`：左 `btn`「結束」（1px `border-border` 變體，直接寫 `border border-border`）；中 `font-serif text-base tracking-[0.06em]` 配方名＋下方 12px ink-2 `tabular-nums`「50 g 批次」（無換算時「20 g 原量」）；右 `text-xl tabular-nums`「2」＋15px ink-2「 / 5」。
4. **進度**：`grid gap-[3px] px-5 pt-1`，格數 = 材料數，前 `checked.size` 格 `bg-accent`，其餘 `bg-border`，高 3px；`role="progressbar"` 帶 aria-valuenow/max。
5. **主體**（`px-5 pt-4 flex-grow overflow-y-auto`）：
   - `DrawerRow icon={20px 黑底白勾} label="已稱" count={checked.size} summary={已勾材料「名稱 用量 g」join('、')}`：`checked.size === 0` 時不渲染；展開列出已勾材料（列 56 高、名稱 16 ink-2 刪除線、用量 16 `tabular-nums`），每列可點取消勾選（`aria-pressed`）。
   - `NOW 這一步`（`.kicker`，`pt-6 pb-2.5`）：第一個未勾的材料。卡片 120 高 `bg-card border-l-[3px]`（分類色）`flex items-center gap-4 px-4`：56×56 勾選框（2px 分類色邊框，`bg-bg`；點擊即 `onToggle`，`aria-label="已稱 {名稱}"`）、名稱 `font-serif text-2xl tracking-[0.04em]`、副行 13 ink-2 分類名（**不顯示供應商**）、右側用量 `text-[40px] leading-none tabular-nums`＋16px ink-2「 g」、下方 12px ink-2「原 {amount} g」（factor = 1 時不顯示原量）。
   - `NEXT 接下來`（`pt-7 pb-1`）：其餘未勾材料，容器 `border-t border-border`；每列 88 高 `border-b`：48×48 勾選框（2px 分類色）、名稱 `font-serif text-xl`、副行 13 分類、用量 `text-[32px] tabular-nums`＋15px「 g」、「原 N g」12px。只剩一項時這區不渲染。
   - 全部勾完：主體只剩「已稱」抽屜（預設展開），NOW 區顯示一張 `bg-card` 卡「全部稱好了」16px＋13px ink-2「按下方按鈕建立稱量工序」。
6. **底列** 72 高 `border-t border-border px-5 pb-[env(safe-area-inset-bottom)]`：左 13px ink-2「螢幕保持常亮」前置 6×6 方塊（`active` 綠 `#5f7a5f`，不支援時灰 `#D6CFC4` 且文字改「無法保持常亮」）；右按鈕：未全勾 `h-12 px-5 bg-border text-ink-2 font-medium` disabled「還有 N 項」；全勾 `btn-primary`「完成稱料，建立工序」→ `onComplete`（成功 toast「已建立稱量工序」並退出；失敗 toast 不退出，現狀邏輯）。
7. **RecipeDetail 側**：`makeMode` 為 true 時渲染 `<ProductionMode>` 取代原本行內勾選框；詳情頁的材料表不再有勾選 UI。

**驗收條件**：三件套全綠；`scripts/verify-d5.mjs`：進示範配方詳情 → 點「開始製作」→ 斷言出現「這一步」「接下來」「還有 5 項」，底部導覽不可見（`tablist` 數量為 0 或 hidden）；點兩個勾選框 → 「已稱」抽屜出現且「2 / 5」；重新整理再進詳情開製作 → 仍是 2/5；全勾 → 出現「完成稱料」按鈕，點擊預期「新增工序失敗」錯誤 toast（smoke 環境）；按「結束」回詳情，導覽恢復。無 pageerror。

**禁區**：不寫勾選狀態進 Supabase；不動 `onCreateWeighTask` 的資料內容。

---

## D6：材料庫＋新增／編輯 bottom sheet（Materials 畫板） ✅ `71ec001`｜verify-d6 8 PASS、verify-u2 5 PASS

**檔案**：`src/components/material/MaterialList.tsx`（建議拆出 `MaterialForm.tsx`）、`MaterialTestSopModal.tsx` 只套 token。

**具體做法**

1. **Header**：`type-title`「材料庫」占 44 高；下方 `SearchField persistent` placeholder「搜尋材料、供應商」（比對欄位不變）。`crossCat` 機制整個移除：**搜尋詞非空時忽略分類篩選**（等同舊的跨類開啟），卡片顯示分類小標；`initialSearch` 行為不變。
2. **分類列**：橫向可捲 `flex gap-2 overflow-x-auto`（隱藏捲軸），每顆 44 高 `px-3.5 text-[13px]`：第一顆「全部」，選中 `bg-ink text-white font-medium`；其餘分類 `border-[1.5px] border-border` 前置 6×6 分類色方塊，選中時邊框改分類色、文字 ink。state 改為 `activeCat: 'all' | IngredientCat`，預設 `'all'`；`startAdd` 時 cat 預設用 `activeCat === 'all' ? 'base' : activeCat`。
3. **副篩選列**：`flex gap-[18px] text-[13px] text-ink-2`，每項 44 高，選中 `text-ink underline underline-offset-4`：全部／按物種分組／待測試／庫存 0（邏輯不變）。
4. **材料卡**（維持 `bg-card border-l-[3px]` 分類色，這是材料庫畫板的定案）：高 64、`pl-3.5`；名稱 16（`displayName`）、副行 13 ink-2「{供應商} · {產地}」（有才顯示）；右側「待測」12px `border border-ink-2 px-[7px] py-[3px]` 按鈕（點擊→ SOP modal，`aria-label` 現狀）；最右 44×44 展開鈕「▸」（展開後旋轉 90°）。展開內容沿用，字級套 token。`MaterialCard` 的鍵盤可及性維持。
5. **表單改成 BottomSheet**（新增與編輯都用）：
   - `BottomSheet title={editId ? '編輯材料' : '新增材料'}`，footer：`btn`「取消」＋`btn-primary`「儲存」（`type="submit"` 綁 form id）。
   - 主要五欄（每欄 label 13px ink-2 `mb-1.5`，欄位 `.input-field` 48 高）：
     1. `分類`：`<select>` 左側疊 8px 分類色方塊（`relative` 容器，`pl-[34px]`），右側「▾」。
     2. `品名 *`（required，錯誤樣式與文案「請填寫品名」沿用，placeholder「例：沉香粉」）。
     3. `供應商`：**拿掉 `<datalist>`**，改自製建議列：輸入非空時，列出 `materials.map(m=>m.supplier)` 去重後含輸入字的前 5 筆，顯示在輸入框正下方（`border-[1.5px] border-ink border-t-0 bg-card`，每列 40 高 16px，右側 12px ink-2「已用 N 次」），`onMouseDown` 選取；焦點離開 150ms 後收起（抄 RecipeForm 的 blurTimer 寫法）。
     4. `產地或品級`：**綁定 `form.origin`**（placeholder「例：越南、A 級」）。`grade` 欄位移到「更多欄位」。`composeMaterialName` 的第三段規則不變（grade 優先、沒 grade 用 origin）。
     5. `庫存量`：`flex gap-2`：數量輸入 `type="text" inputMode="decimal"` `text-lg tabular-nums`，**state 用字串、預設空字串**，送出時 `Number(v) || 0`；單位 `<select>` 寬 96，選項 `g / kg / ml / 滴 / 顆`，若既有值不在清單內則追加為選項。
   - 「更多欄位」`DrawerRow`（summary「顯示簡稱、學名、物種分組、品級、別名、警告、硬上限、測試狀態、備註」，13px）：展開內容依序放：顯示簡稱、學名、物種分組（保留 `species-group-options` datalist）、品級、特性備註、品質筆記、別名、v3 警告、硬上限（`inputMode="decimal"`，預設空）、測試狀態、庫存備註。欄位綁定與送出 payload **完全沿用現狀**。
   - 編輯時 `startEdit(mat)` 開同一個 sheet；sheet 開著時 FAB 隱藏。
   - 新增成功後的 SOP modal 流程不變。
6. **FAB**：同 D3 規格，`aria-label="新增材料"`。

**驗收條件**：三件套全綠；更新 `scripts/verify-u2.mjs`：點 FAB 後斷言出現 `role=dialog` 且含「新增材料」「品名」，不含「三段式」；填品名、供應商、產地 → 送出 → 預期「新增材料失敗」錯誤 toast。新增 `scripts/verify-d6.mjs`：搜尋「乳香」在「全部」分類下出現結果且卡片有分類小標；點「更多欄位」出現「學名」；點材料卡展開鈕出現「完整名稱」或產地欄位。無 pageerror。

**禁區**：`Material` 型別、`materialToRow`、`composeMaterialName`／`splitMaterialName`、改名加 alias 的保護邏輯都不動。

---

## D7：未入設計稿的畫面只套 token＋修版面（不重新設計） ✅ `1083daa`｜verify-d7 5 PASS

1. **工序分頁**（`TaskDashboard.tsx`、`TaskCard.tsx`、`TaskForm.tsx`、`TaskAlert.tsx`）：
   - 新增／編輯表單改放進 `BottomSheet`（title「新增工序」／「編輯工序」，footer 取消＋儲存），`TaskForm` 內部欄位不動；這同時修掉「編輯表單在畫面外」的 bug。D2 的 `initialEditTaskId` 就是開這個 sheet。
   - 「今日提醒」列改成 D2 的 60px 細線列樣式（8px 色方塊）。
   - `TaskCard`：勾選欄 52 寬不變；已完成文字 `text-ink-2 line-through`（不再 #D6CFC4）；狀態標籤改 `StatusDot`（phase 色）；備註與關聯配方字級套 token。
   - FAB 規格同 D3。
2. **隨手記**（`NotesList.tsx`）：`SearchField persistent`；輸入 textarea 16px；「記錄」用 `btn-primary`（本頁唯一）；每則卡片 `p-4`，內文 16px，動作列兩顆 `btn text-xs` 改 `btn`（44 高）；日期 13px `tabular-nums`。
3. **配方表單**（`RecipeForm.tsx`）：只套 token；所有 `type="number"` 改 `type="text" inputMode="decimal"`，state 改字串、送出時轉數字、空字串視為 0；材料列的用量欄 `tabular-nums`。版面不拆步驟（不在本單範圍）。
4. **設定選單**（`MenuOverlay.tsx`）：加上 D2 的狀態區；按鈕套 `btn`；寬度改 `w-72`。
5. **登入頁、ErrorBoundary、Toast、ConfirmDialog**：只套 token；ConfirmDialog 的 danger 按鈕高 48。
6. **桌機（md 以上）**：確認頂列 tab 與各頁 `max-w-content` 沒壞；不另做設計。

**驗收條件**：三件套全綠；`scripts/smoke.mjs` 五頁無 pageerror；`scripts/verify-d7.mjs`：工序頁點最後一張卡的「⋯」→「編輯」→ 斷言出現 `role=dialog` 含「編輯工序」且在視窗內（boundingBox y ≥ 0）。

---

## D8：併修 bug（前次審查已確認，順手一起） ✅ `2549926`｜export.test 新增 notes 合併案例，全部 70 筆過

1. **備份補隨手記**：`BackupData` 新增 `notes?: Note[]`；`handleExport` 帶 `noteStore.notes`；`confirmImport` 的 replace 分支在 `data.notes` 存在時呼叫 `noteStore.saveNotes(data.notes)`；merge 分支把 notes 以 `id` 去重追加（`mergePatch` 加 `notes` 處理並補測試）。確認訊息加上「隨手記 N」。
2. **返回分類錯誤**：D3-9 已處理，這裡只要驗證。
3. **編輯表單畫面外**：D6-5、D7-1 已處理，這裡只要驗證。
4. **刪除配方文案**：D4-7 已處理。
5. **製作模式切版本汙染 sessionStorage**：D4-3 已把重設搬進 tab handler；另外把寫入 effect 改成 `if (makeMode && storageKeyRef.current === storageKey)` 才寫，`storageKeyRef` 在進入模式時設定。
6. **總覽「進行中」計數**：維持現狀公式（設計稿數字一致），不改。

**驗收條件**：`src/utils/__tests__/export.test.ts` 新增 notes 合併案例；三件套全綠。

---

## D9：回歸腳本與收尾 ✅ 見下方回報區

1. 更新 `scripts/verify-u4.mjs`：拿掉兩處「展開搜尋」點擊（搜尋已常駐）；材料分頁 placeholder 改「搜尋材料、供應商」；**刪除「跨類搜尋已開啟」斷言**，改為斷言搜尋結果卡片含分類小標「樹脂」；其餘斷言不變。
2. 更新 `scripts/verify-u2.mjs`（見 D6）。
3. 新增 `verify-d2.mjs`、`verify-d3.mjs`、`verify-d4.mjs`、`verify-d5.mjs`、`verify-d6.mjs`、`verify-d7.mjs`（規格在各項驗收條件），全部保留在 repo。
4. 全部跑完後，在本檔「完成回報區」貼上：三件套輸出摘要、每支 verify 腳本的 PASS 行、以及總覽／配方首頁／配方詳情／製作模式／材料 sheet 五張手機截圖路徑（用 `page.screenshot` 存到 `scripts/shots/`，不要 commit 圖片，路徑寫出來即可）。
5. 把 `HANDOFF-OPUS.md` 第二批規則裡的「設計系統鐵律」那條加一句「已由 HANDOFF-OPUS-DESIGN.md §0.1 取代」。

---

## 附錄 A：設計稿畫板 → 程式檔案對照

| 畫板 | 對應檔案 | 工作項 |
|---|---|---|
| Main（字級與色彩對照） | `index.html`、`src/styles/global.css`、`tailwind.config.ts` | D0 |
| OverviewV2 | `dashboard/Dashboard.tsx`、`nav/MenuOverlay.tsx`、`utils/nextTask.ts`、`utils/date.ts`、`App.tsx` | D2 |
| FormulasV2 | `recipe/RecipeHome.tsx`、`shared/RecipeRow.tsx`、`utils/globalSearch.ts`、`App.tsx` | D3 |
| FormulaDetailV2 | `recipe/RecipeDetail.tsx`、`BurnLog.tsx`、`RelatedTasks.tsx`、`App.tsx` | D4 |
| ProductionV2 | `recipe/ProductionMode.tsx`（新）、`hooks/useWakeLock.ts`（新） | D5 |
| Materials | `material/MaterialList.tsx`、`material/MaterialForm.tsx`（新）、`shared/BottomSheet.tsx` | D6 |
| （無畫板） | 工序、隨手記、配方表單、設定、登入 | D7 |

## 附錄 B：設計稿裡「有畫但不做」的東西

- FormulaDetailV2 的「⋯」aria-label 寫了「複製版本」：目前沒有這個功能，選單只放編輯、刪除。
- OverviewV2 的「清除示範資料」按鈕：示範資料不存在資料庫，沒有東西可清，設定選單只顯示說明文字。
- 畫板的導覽列用 `<a href>` 串連畫板，實作仍用現有的 `BottomNav` tab 機制。
- 畫板上的日期「2026.10.17」是示範，實作用 `formatDashboardDate(new Date())`。

## 完成回報區

### 三件套（最終一次，2026-10-18）

```
npm run build   ✓ built in 3.14s
npm run lint    eslint . → 0 error / 0 warning
npm test        Test Files 10 passed (10) · Tests 70 passed (70)
```

### 驗收 grep

```
grep -rn "font-light" src/                                   → 0
grep -rn "opacity-60\|opacity-70\|opacity-40" src/components → 0
grep -rn "StatusBadge" src/                                  → 0
grep -rn "crossCategory" src/                                → 0
```

### 回歸腳本（dev server :5199，smoke 假 Supabase）

| 腳本 | PASS 數 | 結尾 |
|---|---|---|
| smoke.mjs | 五頁 rendered | PAGE ERRORS: none |
| verify-u1 | 7 | U1 VERIFY OK |
| verify-u2 | 5 | U2 VERIFY OK |
| verify-u3 | 9 | U3 VERIFY OK |
| verify-u4 | 8 | U4 VERIFY OK |
| verify-u5 | 14（轉跑 d5） | D5 VERIFY OK |
| verify-u6 | 5 | U6 VERIFY OK |
| verify-u7 | 3 | U7 VERIFY OK（代理本體未驗證） |
| verify-d2 | 8 | D2 VERIFY OK |
| verify-d3 | 10 | D3 VERIFY OK |
| verify-d4 | 13 | D4 VERIFY OK |
| verify-d5 | 14 | D5 VERIFY OK |
| verify-d6 | 8 | D6 VERIFY OK |
| verify-d7 | 5 | D7 VERIFY OK |

### 手機截圖（390×844，未 commit，`scripts/shots/` 已加入 .gitignore）

- 總覽：`scripts/shots/overview.png`
- 配方首頁（篩選展開）：`scripts/shots/formulas.png`
- 配方詳情：`scripts/shots/formula-detail.png`
- 製作模式（換算 50 g、已稱 2 項）：`scripts/shots/production.png`
- 材料新增 sheet（供應商建議列）：`scripts/shots/material-sheet.png`

### 與本單不同或本單沒寫到的處理

1. **Branch**：本單寫 `claude/dazzling-maxwell-ymau6z`，執行環境被限定只能推 `claude/vibrant-davinci-mvymny`，全部 commit 在後者。
2. **font-light 驗收矛盾**：§D0 要求 type-display／type-title 用 font-light，驗收卻要求 `grep font-light src/` = 0。處理方式：CSS 改寫 `font-weight: 300`，詳情頁標題用 `font-[300]`，字重仍是 300。
3. **StatusBadge**：實際只有 1 處用法（本單寫 4 處），已換成 StatusDot 並刪檔。
4. **抽屜區細線**：D4-6 寫容器 `border-t`，但 DrawerRow 自己有 `border-t`，會變雙線；依 D1 規則改成容器 `border-b`。
5. **需要注意區塊**：扣掉 NEXT 那筆後若沒有剩下的列，整個區塊也隱藏（避免只有標題）。列可點，點了等同「處理」。
6. **入庫測試抽屜**：詳情頁沒有現成的 SOP 入口（SOP modal 需要材料更新函式），依本單備案只列名稱並標「未做」。若同時有規則警告，待測清單併在「規則警告」抽屜底部。
7. **配方首頁圖格**：有搜尋詞或篩選條件時一律顯示清單結果，圖格只在無條件時出現。
8. **材料卡**：⚠、硬上限、同物種徽章移進展開內容（新增「學名」「物種分組」「線香硬上限」欄位顯示），卡片本身只留名稱、副行、待測、▸。
9. **工序「今日提醒」**：依 §0.1 加上 `TODAY 今日提醒` kicker。
10. **ActionMenu**：手機底部選單原本與底部導覽同在 z-50，導覽列蓋住「取消」；改為 z-[70]（既有 bug，跑 verify-d4 時發現）。
11. **製作模式隱藏導覽**：用 `body.production-mode [data-app-nav]{display:none}`，BottomNav 兩個 nav 加 `data-app-nav`。
12. **本單沒列但跟著改的腳本**：verify-u1、u5、u6、u7 因介面改版會失效，已更新（u5 改為轉跑 d5；u6／u7 改用新的齒輪 aria-label 與設定選單內文）。
13. **MigratePage** 屬敏感區，完全沒動（裡面仍有 `btn text-xs`）。

### 未驗證

- 所有「寫入成功」路徑：smoke 環境寫入必失敗，只驗證到錯誤 toast。需用真帳號實測新增材料、試燒紀錄、備份匯入（含隨手記）。
- 螢幕常亮：headless Chromium 有回應 wakeLock，真手機（iOS Safari 16.4 以上／Android Chrome）未實測。
- 桌機（1280 寬）只目測總覽與材料庫沒壞，未逐頁驗收。
