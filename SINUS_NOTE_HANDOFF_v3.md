# SINUS NOTE 引香筆記 — 開發交接文件 v3
> 更新日期：2026-03-29｜接續 HANDOFF v2 繼續開發

---

## 一、專案基本資料

| 項目 | 內容 |
|------|------|
| 正式網址 | https://sinus-note.vercel.app/ |
| GitHub repo | git@github.com:ryan770317-eng/sinus-note.git |
| 本地路徑 | `/Users/ryanh/就曰&晶衍 Dropbox/Hong Ryan/克勞德協作資料/配方資料庫/V11/sinus-note/` |
| 主檔案 | `index.html`（單一檔案 PWA，約 2881 行） |
| 部署方式 | push main → Vercel 自動部署 |
| Firebase 專案 | sinus-note-c03c6（Firestore + Auth email/password） |

---

## 二、技術架構

- **單一 HTML 檔**，Vanilla JS，無 framework
- **Firebase Firestore** 雲端存儲 + **Firebase Auth** 登入
- **Firestore realtime sync**（onSnapshot 監聽 config / catImages / materials / notes 四個文件）
- **Service Worker** (`sw.js`) 離線快取，目前版本：`sinus-v4`
- **Web Speech API** 語音輸入（lang: zh-TW）
- **Claude Haiku API**（`claude-haiku-4-5-20251001`）直接從瀏覽器呼叫
  - Header: `anthropic-dangerous-direct-browser-access: true`
  - API key 存在 `localStorage` 的 `sinus_anthropic_key`
- **Git remote**：SSH（`git@github.com:ryan770317-eng/sinus-note.git`）

---

## 三、Firestore 資料結構

```
appData/{userId}/store/
  ├── config       → { recipes[], nextId, catOrder, updatedAt }
  ├── catImages    → { items: {catId: base64string}, updatedAt }
  ├── materials    → { items: [], updatedAt }
  └── notes        → { items: [], updatedAt }
```

**即時同步機制（v3 新增）：**
- `setupRealtimeSync()` 用 `onSnapshot` 監聽以上四個文件
- 只在 `!snap.metadata.hasPendingWrites`（伺服器端確認的變更）時觸發 `renderApp()`
- `_suppressSync` flag 用於批次操作期間暫停重繪，2 秒後自動恢復

---

## 四、全域狀態物件 S

```javascript
const S = {
  screen: 'home',           // 'home' | 'category' | 'detail' | 'form'
  catId: null,
  recipeId: null,
  editData: null,
  recipes: [],
  catImages: {},            // { catId: base64 } — 從 Firestore catImages doc 讀取
  nextId: 200,              // recipe 自增 ID
  vi: {},                   // recipeId → version index
  pendingCatImg: null,
  search: '',
  _materials: [],           // 材料庫陣列
  _notes: [],               // 隨手記陣列
  catOrder: null,
};
let currentTab = 'home';   // 'home' | 'mat' | 'notes'
let _suppressSync = false; // 批次操作期間暫停 realtime sync 重繪
```

---

## 五、主要常數

```javascript
// 香氣分類（fragCat）
CATS = [ shrine, improve, green, wood, floral, resin, western, special, tincture, test ]

// 材料分類（ING_CATS / mat cat）
base, botanical, resin, tincture, ferment, wine, binder

// 配方狀態
STATUS = { success, fail, pending, progress, order }
```

---

## 六、三個分頁

| Tab | 按鈕 ID | 導航函式 | 渲染函式 |
|-----|---------|---------|---------|
| 配方 | `nav-tab-home` | `goBottomHome()` | `renderHome()` / `renderCategory()` / `renderDetail()` / `renderForm()` |
| 材料庫 | `nav-tab-mat` | `goBottomMat()` | `renderMaterials()` |
| 隨手記 | `nav-tab-notes` | `goBottomNotes()` | `renderNotes()` |

**渲染流程：**
- `render()` → 只處理配方分頁（根據 `S.screen`）
- `renderApp()` → 根據 `currentTab` 分流到對應分頁渲染，材料庫和隨手記直接渲染，配方呼叫 `render()`

---

## 七、隨手記功能

### 基本功能
- 文字輸入區（可手動輸入或語音）
- 麥克風按鈕：SVG line-style icon，錄音時切換為 ■ 停止
- 每則筆記自動加時間戳
- 每則筆記下方有「AI 解析」按鈕 → 呼叫 Claude Haiku 分析

### 筆記收合（v3 新增）
- 超過 120 字或 3 行的筆記自動收合（`.collapsed` class）
- 收合時顯示前幾行 + 漸層遮罩（`linear-gradient` → `var(--card)`）
- 「展開全文」/「收合」切換按鈕
- 函式：`toggleNoteExpand(id)`

### 時間顯示（v3 改進）
- 今天 → `今天 14:30`
- 昨天 → `昨天 09:15`
- 同年 → `3/25 16:00`
- 跨年 → `2025/12/1 16:00`
- 日期部分有 `.note-card-date` class（粗體、深色）

### 批次對話匯入（v3 新增）
- 「貼上對話 → 批次解析」按鈕展開輸入區
- 貼入整段對話 → AI 提取多筆 action（material_add / stock_update / recipe_add / recipe_note）
- 每筆操作獨立卡片，可「確認寫入」或「跳過」
- 寫入時顯示「寫入中...」dots 動畫 → 0.4 秒後變「✓ 已寫入」
- 寫入期間用 `_suppressSync` 暫停 realtime 重繪，避免畫面跳走

**關鍵函式：**
```javascript
toggleBatchArea()           // 展開/收合批次輸入區
batchParseConversation()    // 呼叫 AI 解析整段對話
confirmBatchAction(idx)     // 確認寫入單筆操作
skipBatchAction(idx)        // 跳過單筆操作
window._batchActions        // 暫存解析結果陣列
```

### AI 解析回傳格式（5 種 action type）
```javascript
{ type: 'material_add',  cat, name, origin, supplier, note, qty, unit }
{ type: 'stock_update',  name, qty, unit }
{ type: 'recipe_add',    name, fragCat, ingredients[], notes }
{ type: 'recipe_note',   recipeId, recipeName, note }
{ type: 'journal' }   // 只顯示，不寫入（僅單則解析用）
```

### 語音相關函式
```javascript
toggleNotesRecording()   // 切換錄音狀態
startNotesRecording()    // 開始，按鈕改為 STOP_SVG + 停止
stopNotesRecording()     // 停止，按鈕還原為 MIC_SVG + 錄音
```

---

## 八、手機版 RWD（v3 新增）

```css
@media (max-width: 420px) {
  .nav-brand { display: none; }         /* 隱藏品牌名，讓 tab + ··· 有空間 */
  .nav-primary { padding: 0 12px; }
  .nav-tabs { margin-right: auto; }
}
@media (max-width: 360px) {
  .nav-tab { padding: 0 12px; font-size: 11px; letter-spacing: 0.08em; }
}
```

---

## 九、匯入/匯出格式

### 完整備份（完整匯入會覆��全部資料）
```json
{
  "exportedAt": "ISO string",
  "recipes": [...],
  "nextId": 200,
  "catImages": { "catId": "base64..." },
  "catOrder": [...] | null,
  "materials": [...]
}
```

### 合併匯入 Patch 格式（只追加，不刪現有）
```json
{
  "recipes": [...],
  "materials": [...]
}
```
**合併規則：** 配方依 `name` 比對跳過重複；材料依 `cat+name` 比對跳過重複。

### Recipe 物件格式
```json
{
  "id": 201,
  "num": "V-A",
  "name": "配方名稱",
  "fragCat": "test",
  "status": "progress",
  "rating": 0,
  "tags": [],
  "process": { "tincture": false, "ferment": false, "wine": false, "notes": "" },
  "timeline": { "makeDate": "2026-03-29", "dryDays": 5, "agingStart": "", "agingNotes": "" },
  "versions": [
    {
      "label": "主版",
      "totalWeight": 20,
      "ingredients": [
        { "cat": "base", "name": "材料名", "amount": 8.7, "unit": "g" }
      ],
      "notes": "備注文字",
      "comments": []
    }
  ],
  "createdAt": "2026-03-29T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z"
}
```

### Material 物件格式
```json
{
  "id": "mu1743xxx",
  "cat": "base",
  "name": "材料名",
  "origin": "產地",
  "supplier": "供應商",
  "note": "特性備注",
  "stock": { "qty": 600, "unit": "g", "note": "" }
}
```

---

## 十、CSS 設計語言

```css
--bg:      #F5F1EB;   /* 羊皮紙主背景 */
--surface: #F5F1EB;   /* 同 bg */
--card:    #EDE8E0;   /* 卡片背景 */
--ink:     #1A1A18;   /* 主文字 */
--ink-2:   #6B6459;
--ink-3:   #6B6459;
--ink-4:   #D6CFC4;
--accent:  #8B6F52;   /* 暖棕強調色 */
--border:  #D6CFC4;
--serif:   'Noto Serif TC', serif;
--sans:    'Noto Sans TC', sans-serif;  /* font-weight: 300 */
/* 零 border-radius，容器最大寬 960px */
.container { max-width: 960px; margin: 0 auto; padding: 28px 16px 60px; }
```

---

## 十一、本次對話完成的修改（v3 commits）

| Commit | 內容 |
|--------|------|
| `fa27052` | fix: 手機版 nav 加 media query + 重寫 realtime sync 監聽四個文件 + 新增批次對話匯入 |
| `5c0dba1` | feat: 隨手記筆記收合功能 + 時間顯示改為相對格式 |
| `565be73` | fix: realtime sync 改用 renderApp() + _suppressSync 防止批次操作跳頁 |
| `78c2f62` | feat: 批次寫入加入「寫入中...」dots 動畫 + 錯誤路徑修復 |

---

## 十二、Debug 狀態

- ✅ 手機版 ··· 選單正常顯示（≤420px 隱藏品牌名）
- ✅ 跨裝置即時同步（config / catImages / materials / notes 四文件）
- ✅ 批次對話匯入：解析 → 逐筆確認 → 不跳頁
- ✅ 筆記收合 + 時間相對顯示
- ✅ SW cache sinus-v4
- ⚠️ Firebase deprecation warning（不影響功能，未來版本可改用 `FirestoreSettings.cache`）

---

## 十三、下次可繼續的方向（尚未做）

- 試燒紀錄（Trial Burn）欄位整合進配方詳情
- 配方版本比較功能
- 隨手記 AI 解析的 UX 改進（loading 動���、成功提示更明確）
- Firebase deprecation 警告清除
- 多圖片支援（目前每個分類只能一張）
- 批次匯入支援「全部確認」一鍵寫入
- 隨手記搜尋/篩選功能
