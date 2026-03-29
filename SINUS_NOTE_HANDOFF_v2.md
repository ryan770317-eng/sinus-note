# SINUS NOTE 引香筆記 — 開發交接文件 v2
> 更新日期：2026-03-29｜接續上次 HANDOFF v1 繼續開發

---

## 一、專案基本資料

| 項目 | 內容 |
|------|------|
| 正式網址 | https://sinus-note.vercel.app/ |
| GitHub repo | git@github.com:ryan770317-eng/sinus-note.git |
| 本地路徑 | `/Users/ryanh/就曰&晶衍 Dropbox/Hong Ryan/克勞德協作資料/配方資料庫/V11/sinus-note/` |
| 主檔案 | `index.html`（單一檔案 PWA，約 2614 行） |
| 部署方式 | push main → Vercel 自動部署 |
| Firebase 專案 | sinus-note-c03c6（Firestore + Auth email/password） |

---

## 二、技術架構

- **單一 HTML 檔**，Vanilla JS，無 framework
- **Firebase Firestore** 雲端存儲 + **Firebase Auth** 登入
- **Service Worker** (`sw.js`) 離線快取，目前版本：`sinus-v3`
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
  ├── catImages    → { items: {catId: base64string}, updatedAt }   ← 本次拆分獨立
  ├── materials    → { items: [], updatedAt }
  └── notes        → { items: [], updatedAt }
```

### 重要：catImages 已從 config 移出
本次修復了一個關鍵 bug：`catImages`（分類圖片 base64）原本和 `recipes` 塞在同一個 Firestore 文件，超過 1MB 上限時 save 靜默失敗導致圖片消失。現已拆到獨立 `catImages` 文件，有自動遷移舊資料邏輯。

---

## 四、全域狀態物件 S

```javascript
const S = {
  screen: 'home',           // 'home' | 'category' | 'detail' | 'form'
  currentTab: 'home',       // (由 currentTab 變數控制，非 S 內)
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

---

## 七、隨手記（本次新增的第三分頁）

**功能：**
- 文字輸入區（可手動輸入或語音）
- 麥克風按鈕：SVG line-style icon，錄音時切換為 ■ 停止
- 每則筆記自動加時間戳
- 每則筆記下方有「AI 解析」按鈕 → 呼叫 Claude Haiku 分析

**AI 解析回傳格式（5種 action type）：**
```javascript
{ type: 'material_add',  cat, name, origin, supplier, note, qty, unit }
{ type: 'stock_update',  name, qty, unit }
{ type: 'recipe_add',    name, fragCat, ingredients[], notes }
{ type: 'recipe_note',   name, note }
{ type: 'journal' }   // 只顯示，不寫入
```

**API key 設定：**
- 存在 localStorage `sinus_anthropic_key`
- 若未設定，隨手記底部會顯示設定欄

**語音相關函式：**
```javascript
toggleNotesRecording()   // 切換錄音狀態
startNotesRecording()    // 開始，按鈕改為 STOP_SVG + 停止
stopNotesRecording()     // 停止，按鈕還原為 MIC_SVG + 錄音
```

---

## 八、本次對話完成的修改（commits）

| Commit | 內容 |
|--------|------|
| `e88d2b0` | feat: 新增「合併匯入」功能（選單 ＋ 合併匯入） |
| `8cf3cae` | fix: catImages 拆到獨立 Firestore 文件，解決圖片消失 bug |
| `e4c3411` | fix: 錄音按鈕 SVG icon + 文字狀態切換 |
| `6fa138c` | fix: SW cache 升為 sinus-v3 |
| `1658df2` | feat: 隨手記第三分頁 + AI 解析 |

---

## 九、匯入/匯出格式

### 完整備份（完整匯入會覆蓋全部資料）
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

## 十、待匯入的 Patch 檔

已生成好的配方 patch 檔位於：
```
本地路徑/sinus-note/patch_側柏果實系列V_20260329.json
```
內含 4 支配方（V-A 百年香柏、V-B 古崖柏、V-C 正非洲玫瑰木、V-D 台灣肖楠）+ 1 筆新材料（台灣肖楠 600g）。使用方式：app 右上角 `···` → **＋ 合併匯入**。

---

## 十一、CSS 設計語言

```css
--bg:      #F5F1EB;   /* 羊皮紙主背景 */
--surface: #EDE8E0;   /* 卡片背景 */
--ink:     #1A1A18;   /* 主文字 */
--ink-2:   #3A3A38;
--ink-3:   #6A6A68;
--ink-4:   #9A9A98;
--accent:  #8B6F52;   /* 暖棕強調色 */
--border:  #D8D4CE;
--serif:   'Noto Serif TC', serif;
--sans:    'Noto Sans TC', sans-serif;  /* font-weight: 300 */
/* 零 border-radius，容器最大寬 960px */
.container { max-width: 960px; margin: 0 auto; padding: 28px 16px 60px; }
```

---

## 十二、Debug 狀態（本次對話已驗證）

- ✅ 無 JS 錯誤
- ✅ 21/21 關鍵函式全部存在
- ✅ 三個 bottom tab 正常
- ✅ 麥克風 SVG 正確渲染
- ✅ 合併匯入選單正確
- ✅ catImages 獨立存取邏輯正確
- ⚠️ Firebase deprecation warning（不影響功能，未來版本可改用 `FirestoreSettings.cache`）

---

## 十三、下次可繼續的方向（尚未做）

- 試燒紀錄（Trial Burn）欄位整合進配方詳情
- 配方版本比較功能
- 隨手記 AI 解析的 UX 改進（loading 動畫、成功提示更明確）
- Firebase deprecation 警告清除
- 多圖片支援（目前每個分類只能一張）
