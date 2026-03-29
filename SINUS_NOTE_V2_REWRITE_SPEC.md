# SINUS NOTE v2.0 — 完整重寫規格書
> 給 Claude Code 的自主開發文件｜2026-03-29
> 本文件包含所有需要的資訊，Claude Code 應能獨立完成開發

---

## 一、專案總覽

SINUS NOTE（引香筆記）是一個個人製香工作管理工具，用於記錄香方配方、管理材料庫存、追蹤製香工序進度、以及快速筆記。

### 決策摘要
- **從單一 HTML 檔（2881 行 Vanilla JS）完整重寫為 React SPA**
- 保留現有 Firebase 專案和 Firestore 資料結構（資料不遷移，只換前端）
- 新增「工序追蹤」模組（本次重寫的核心新功能）
- 導航從底部 tab 改為收合式面板

### 技術棧
| 項目 | 選擇 | 原因 |
|------|------|------|
| 框架 | React (Vite) | 純客戶端 SPA，不需 SSR |
| 語言 | TypeScript | 資料模型複雜，需要型別安全 |
| 樣式 | Tailwind CSS | 設計系統 token 明確，零圓角全域設定 |
| 後端 | Firebase Firestore + Auth | 已在用，資料都在上面，不遷移 |
| PWA | vite-plugin-pwa | 取代手寫 sw.js |
| 部署 | Vercel（push main 自動部署） | 已在用 |
| AI | Claude Haiku API（瀏覽器直呼） | 已在用 |
| 語音 | Web Speech API（zh-TW） | 已在用 |

---

## 二、Firebase 設定（不改動）

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyDWBpYLFY6bf1WbApaVu9Zvee5w_WOPsWk",
  authDomain: "sinus-note-c03c6.firebaseapp.com",
  projectId: "sinus-note-c03c6",
  storageBucket: "sinus-note-c03c6.firebasestorage.app",
  messagingSenderId: "892365273822",
  appId: "1:892365273822:web:7fcc739f695a2f74ae204f"
};
```

### Firestore 資料結構（新增 tasks）

```
appData/{userId}/store/
  ├── config       → { recipes[], nextId, catOrder, updatedAt }
  ├── catImages    → { items: {catId: base64string}, updatedAt }
  ├── materials    → { items: [], updatedAt }
  ├── notes        → { items: [], updatedAt }
  └── tasks        → { items: [], updatedAt }    ← 新增
```

- 認證方式：Firebase Auth email/password
- 離線快取：`enablePersistence({ synchronizeTabs: true })`
- 即時同步：每個文件用 `onSnapshot` 監聽，只在 `!snap.metadata.hasPendingWrites` 時更新 UI
- 批次操作期間用 `_suppressSync` flag 暫停重繪，2 秒後自動恢復
- Claude API key 存在 `localStorage` 的 `sinus_anthropic_key`

### Firestore Security Rules（已設定好，不改）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /appData/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 三、TypeScript 資料模型

### Recipe（配方）

```typescript
interface Recipe {
  id: number;
  num: string;                    // 例如 "V-A"
  name: string;
  fragCat: FragCat;               // 香氣分類
  status: RecipeStatus;
  rating: number;                 // 0-5
  tags: string[];
  process: {
    tincture: boolean;
    ferment: boolean;
    wine: boolean;
    notes: string;
  };
  timeline: {
    makeDate: string;             // ISO date string
    dryDays: number;
    agingStart: string;
    agingNotes: string;
  };
  versions: Version[];
  burnLog: BurnEntry[];           // ← 新增：試燒紀錄
  createdAt: string;
  updatedAt: string;
}

interface Version {
  label: string;                  // 例如 "主版"
  totalWeight: number;            // 例如 20 (g)
  ingredients: Ingredient[];
  notes: string;
  comments: string[];
}

interface Ingredient {
  cat: IngredientCat;
  name: string;
  amount: number;
  unit: string;                   // 通常是 "g"
}

interface BurnEntry {              // ← 新增
  date: string;
  front: string;                  // 前調描述
  mid: string;                    // 中調描述
  tail: string;                   // 後調描述
  smoke: 'good' | 'ok' | 'bad';
  rating: number;                 // 1-5
  notes: string;
}

type FragCat = 'shrine' | 'improve' | 'green' | 'wood' | 'floral' | 'resin' | 'western' | 'special' | 'tincture' | 'test';
type RecipeStatus = 'success' | 'fail' | 'pending' | 'progress' | 'order';
type IngredientCat = 'base' | 'botanical' | 'resin' | 'tincture' | 'ferment' | 'wine' | 'binder';
```

### Material（材料）

```typescript
interface Material {
  id: string;                     // "mu" + timestamp
  cat: IngredientCat;
  name: string;
  origin: string;                 // 產地
  supplier: string;
  note: string;                   // 特性備注
  stock: {
    qty: number;
    unit: string;
    note: string;
  };
}
```

### Task（工序）← 全新

```typescript
interface Task {
  id: string;                     // "tk_" + timestamp + random
  title: string;
  material: string;               // 關聯材料名稱（可選）
  recipeId: number | null;        // 關聯配方 ID（可選）
  taskType: TaskType;
  status: TaskStatus;
  startDate: string;              // ISO date
  dueDate: string | null;         // ISO date，即時任務為 null
  completedDate: string | null;
  notes: string;
  checkpoints: Checkpoint[];
  createdAt: string;
  updatedAt: string;
}

interface Checkpoint {
  date: string;
  label: string;
  done: boolean;
}

type TaskStatus = 'prep' | 'processing' | 'waiting' | 'ready' | 'done';

type TaskType =
  // 前置處理（原料層級）
  | 'harvest' | 'dry' | 'grind' | 'tincture' | 'ferment'
  | 'enzyme' | 'paoZhi' | 'honey' | 'aging'
  // 成型階段
  | 'weigh' | 'shape'
  // 後置處理（成品層級）
  | 'stickDry' | 'cellar' | 'burn'
  // 通用
  | 'other';
```

### Note（隨手記）

```typescript
interface Note {
  id: string;
  text: string;
  ts: number;                     // timestamp
  aiResult?: string;              // AI 解析結果
}
```

---

## 四、常數定義

```typescript
// src/utils/constants.ts

export const FRAG_CATS = {
  shrine:   { label: '供香' },
  improve:  { label: '改良' },
  green:    { label: '草本' },
  wood:     { label: '木質' },
  floral:   { label: '花香' },
  resin:    { label: '樹脂' },
  western:  { label: '西方' },
  special:  { label: '特殊' },
  tincture: { label: '酊劑' },
  test:     { label: '測試' },
} as const;

export const ING_CATS = {
  base:     { label: '基底木' },
  botanical:{ label: '花果藥草' },
  resin:    { label: '樹脂' },
  tincture: { label: '酊劑' },
  ferment:  { label: '發酵' },
  wine:     { label: '酒媒' },
  binder:   { label: '黏粉' },
} as const;

export const RECIPE_STATUS = {
  success:  { label: '成功', color: '#8B6F52' },
  fail:     { label: '失敗', color: '#a06050' },
  pending:  { label: '待製', color: '#6B6459' },
  progress: { label: '進行中', color: '#6B6459' },
  order:    { label: '訂單', color: '#6B6459' },
} as const;

export const TASK_TYPES = {
  // 前置處理
  harvest:  { label: '採收',       icon: '⌇', defaultDays: 0,  phase: 'pre' },
  dry:      { label: '原料乾燥',   icon: '△', defaultDays: 7,  phase: 'pre' },
  grind:    { label: '研磨打粉',   icon: '○', defaultDays: 0,  phase: 'pre' },
  tincture: { label: '酊劑浸泡',   icon: '◇', defaultDays: 28, phase: 'pre' },
  ferment:  { label: '發酵/酒酵',  icon: '◈', defaultDays: 90, phase: 'pre' },
  enzyme:   { label: '酶處理',     icon: '⬡', defaultDays: 1,  phase: 'pre' },
  paoZhi:   { label: '炮製',       icon: '☲', defaultDays: 1,  phase: 'pre' },
  honey:    { label: '蜜炙/蜜泡',  icon: '⊙', defaultDays: 1,  phase: 'pre' },
  aging:    { label: '原料陳化',   icon: '▣', defaultDays: 30, phase: 'pre' },
  // 成型
  weigh:    { label: '稱量配粉',   icon: '⊞', defaultDays: 0,  phase: 'make' },
  shape:    { label: '和泥成型',   icon: '▬', defaultDays: 0,  phase: 'make' },
  // 後置
  stickDry: { label: '線香乾燥',   icon: '⊿', defaultDays: 5,  phase: 'post' },
  cellar:   { label: '窖藏醇化',   icon: '▩', defaultDays: 30, phase: 'post' },
  burn:     { label: '試燒',       icon: '◉', defaultDays: 0,  phase: 'post' },
  // 通用
  other:    { label: '其他',       icon: '·', defaultDays: 0,  phase: 'other' },
} as const;

export const TASK_STATUS = {
  prep:       { label: '備料中', order: 2 },
  processing: { label: '處理中', order: 1 },
  waiting:    { label: '等待中', order: 0 },
  ready:      { label: '待處理', order: 3 },
  done:       { label: '已完成', order: 4 },
} as const;
```

---

## 五、專案結構

```
sinus-note/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── icon-512.png
├── src/
│   ├── main.tsx
│   ├── App.tsx                     ← 主路由 + AuthGate + 導航
│   ├── firebase.ts                 ← Firebase init + auth helpers
│   │
│   ├── types/
│   │   ├── index.ts                ← 集中 re-export 所有型別
│   │   ├── recipe.ts
│   │   ├── material.ts
│   │   ├── task.ts
│   │   └── note.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              ← login/logout/onAuthStateChanged
│   │   ├── useFirestore.ts         ← 通用 get/set/onSnapshot
│   │   ├── useRecipes.ts           ← CRUD + 搜尋 + 排序
│   │   ├── useMaterials.ts         ← CRUD + autocomplete
│   │   ├── useTasks.ts             ← CRUD + 提醒計算 + 進度
│   │   └── useNotes.ts             ← CRUD + AI 解析
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx     ← 登入畫面（保留原有極簡風格）
│   │   │
│   │   ├── nav/
│   │   │   ├── BottomNav.tsx       ← 收合式底部導航
│   │   │   └── MenuOverlay.tsx     ← ··· 選單（匯出/匯入/API key/登出）
│   │   │
│   │   ├── recipe/
│   │   │   ├── RecipeHome.tsx      ← 分類卡片首頁
│   │   │   ├── RecipeCategory.tsx  ← 分類內列表
│   │   │   ├── RecipeDetail.tsx    ← 配方詳情
│   │   │   ├── RecipeForm.tsx      ← 新增/編輯表單
│   │   │   ├── BurnLog.tsx         ← 試燒紀錄區塊
│   │   │   └── RelatedTasks.tsx    ← 配方關聯工序區塊
│   │   │
│   │   ├── material/
│   │   │   └── MaterialList.tsx    ← 材料庫（分類 tab + 列表 + 新增/編輯）
│   │   │
│   │   ├── task/
│   │   │   ├── TaskDashboard.tsx   ← 工序主頁
│   │   │   ├── TaskAlert.tsx       ← 今日提醒區
│   │   │   ├── TaskCard.tsx        ← 工序卡片
│   │   │   ├── TaskForm.tsx        ← 新增/編輯表單（含快速模式）
│   │   │   └── BurnForm.tsx        ← 試燒完成時的結果表單
│   │   │
│   │   ├── notes/
│   │   │   ├── NotesList.tsx       ← 隨手記列表
│   │   │   ├── BatchImport.tsx     ← 批次對話匯入
│   │   │   └── VoiceInput.tsx      ← 語音輸入按鈕
│   │   │
│   │   └── shared/
│   │       ├── StatusBadge.tsx
│   │       ├── ProgressBar.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── services/
│   │   ├── claude.ts               ← Claude API + prompt 模板
│   │   └── speech.ts               ← Web Speech API 封裝
│   │
│   ├── utils/
│   │   ├── constants.ts            ← 所有常數（見第四節）
│   │   ├── date.ts                 ← 日期工具（相對時間、倒數、進度%）
│   │   └── export.ts               ← 匯出/匯入邏輯
│   │
│   └── styles/
│       └── global.css              ← @tailwind directives + Google Fonts import
```

---

## 六、設計系統

### Tailwind 設定

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#F5F1EB',
        surface: '#F5F1EB',
        card:    '#EDE8E0',
        ink:     '#1A1A18',
        'ink-2': '#6B6459',
        'ink-3': '#6B6459',
        'ink-4': '#D6CFC4',
        accent:  '#8B6F52',
        border:  '#D6CFC4',
        error:   '#a06050',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans:  ['"Noto Sans TC"', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '0px',
      },
      maxWidth: {
        content: '960px',
      },
      letterSpacing: {
        label: '0.15em',
        wide: '0.18em',
        wider: '0.22em',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 設計規則（Claude Code 必須遵守）

1. **零圓角**：所有元素 border-radius 都是 0。Tailwind config 已全域覆寫。
2. **字體**：標題/品名用 `font-serif`（Noto Serif TC），其他全部用 `font-sans font-light`（Noto Sans TC 300）。
3. **背景**：頁面 `bg-bg`，卡片 `bg-card`，兩者都不加陰影。
4. **分隔**：用 `border-border`（1px），不用陰影。
5. **強調色**：`accent`（#8B6F52 暖棕），用於 active 狀態、進度條、重要連結。
6. **錯誤/警示**：`error`（#a06050），用於到期提醒、失敗狀態。
7. **不用 emoji**：icon 一律用 Unicode 幾何符號或 SVG line icon。
8. **手機優先**：所有元件先寫手機版，再用 `md:` 加桌面適配。
9. **容器**：`max-w-content mx-auto px-4 pb-16 pt-7`。
10. **按鈕**：透明底 + border + font-light，hover 時 bg-card。

---

## 七、收合式底部導航規格

取代原有的 tab bar。底部列只顯示當前分頁名稱 + ▾ 箭頭，點擊後展開面板顯示全部四個選項。

### 收合狀態
```
┌──────────────────────────────────────────┐
│              配 方  ▾              · · ·  │
└──────────────────────────────────────────┘
```

### 展開狀態
```
┌──────────────────────────────────────────┐
│  配方                      ← active 加粗  │
│  ─────────────────────────────────────── │
│  工序                                     │
│  ─────────────────────────────────────── │
│  材料庫                                   │
│  ─────────────────────────────────────── │
│  隨手記                                   │
└──────────────────────────────────────────┘
```

- 點擊面板外部或選擇選項時自動收合
- ··· 按鈕固定在收合列右側，不隨面板展開
- 面板展開用 `max-height` transition（0.25s ease）
- 當前分頁選項用 `text-ink font-normal`，其他用 `text-ink-2 font-light`

---

## 八、四個分頁功能規格

### 8.1 配方（Recipe）

**完整保留現有功能，不做刪減。** 包括：

- **首頁**：搜尋框 + 分類卡片網格（每個分類可上傳封面圖、長按拖曳排序）
- **分類內頁**：按狀態分群（成功 → 進行中 → 失敗）列出配方
- **詳情頁**：配方 metadata + 版本切換 + 材料表格 + 備注/留言 + timeline + process flags
  - **新增**：「相關工序」摺疊區塊（顯示 recipeId 匹配的 tasks）
  - **新增**：「試燒紀錄」摺疊區塊（顯示 burnLog[]）
  - **新增**：配方狀態建議（所有關聯 tasks 都 done 時提示更新狀態）
- **表單**：新增/編輯配方，材料名稱 autocomplete from 材料庫，自動帶 nextId

### 8.2 工序（Task）← 全新

**主頁 TaskDashboard.tsx：**

1. **今日提醒區**（TaskAlert）：顯示 dueDate ≤ 今天 + 3 天且 status ≠ done 的 tasks
   - 已到期（dueDate < 今天）：`text-error` 標記「已到期」
   - 3 天內到期：`text-accent` 標記「剩 N 天」
   - defaultDays=0 的即時任務（如 weigh, grind）：`text-accent` 標記「待處理」
   - 沒有到期項目時此區不顯示

2. **分組列表**：按 status 分組，每組一個小標題
   - 排序：waiting → processing → prep → ready → done
   - done 只顯示最近 7 天，更早的收合（「顯示全部已完成」按鈕）

3. **工序卡片**（TaskCard）：
   - 頂部：taskType icon + label（小字、letter-spacing 0.15em、text-ink-2）
   - 標題：font-serif 15px
   - 備註：font-sans font-light 12px text-ink-2
   - 關聯配方名稱（可點擊跳轉）
   - 時間軸：`3/29 → 4/26（28天）` + 右側倒數
   - 進度條：3px 高、accent 填充、border 底色。即時任務不顯示。
   - 操作按鈕：完成 | 編輯 | 刪除
   - done 狀態：opacity-50 + 標題 line-through

4. **新增按鈕**：固定在右下角（nav 上方），44×44，bg-ink text-bg，顯示 ＋
   - 點擊展開 inline 表單（TaskForm）

5. **新增表單**（TaskForm）：
   - 標題（必填）
   - 材料（autocomplete from 材料庫）
   - 工序類型（select，選後自動算 dueDate）
   - 開始日期（預設今天）
   - 預計完成（startDate + defaultDays，可手動改）
   - 關聯配方（select from recipes）
   - 備註
   - 快速模式切換：開啟後只顯示「標題 + 工序類型」

6. **試燒完成流程**（BurnForm）：
   - 當 taskType === 'burn' 的 task 點「完成」時，彈出試燒結果表單
   - 欄位：前調、中調、後調（各一行文字）、煙氣（select: 優/可/差）、評分（1-5）、備註
   - 如果 task 有 recipeId，結果寫入配方的 burnLog[]
   - 如果沒有 recipeId，結果存在 task 的 notes 裡

### 8.3 材料庫（Material）

**完整保留現有功能：**
- 頂部分類 tab（base / botanical / resin / tincture / ferment / wine / binder）
- 搜尋框
- 材料卡片列表（名稱、產地、供應商、庫存、備註）
- 新增/編輯表單（inline）
- 長按刪除（確認對話框）

### 8.4 隨手記（Notes）

**完整保留現有功能：**
- 文字輸入區 + 麥克風按鈕（語音輸入）
- 每則筆記自動時間戳（相對時間格式：今天/昨天/日期）
- 筆記收合（>120 字或 >3 行自動收合，漸層遮罩）
- 每則筆記下方「AI 解析」按鈕 → 呼叫 Claude Haiku
- 批次對話匯入（貼上對話 → AI 提取操作 → 逐筆確認寫入）

---

## 九、AI 解析系統

### 9.1 Claude API 呼叫

```typescript
// src/services/claude.ts
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = localStorage.getItem('sinus_anthropic_key');
  if (!apiKey) throw new Error('未設定 API key');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await res.json();
  return data.content[0].text;
}
```

### 9.2 批次解析 action types（6 種）

```typescript
type BatchAction =
  | { type: 'material_add'; cat: IngredientCat; name: string; origin: string; supplier: string; note: string; qty: number; unit: string }
  | { type: 'stock_update'; name: string; qty: number; unit: string }
  | { type: 'recipe_add'; name: string; fragCat: FragCat; ingredients: Ingredient[]; notes: string }
  | { type: 'recipe_note'; recipeId: number; recipeName: string; note: string }
  | { type: 'task_add'; title: string; material?: string; taskType: TaskType; notes: string; dueDate?: string; status?: TaskStatus }
  | { type: 'journal' }  // 只顯示，不寫入
```

### 9.3 批次解析 AI prompt（含 task_add 指引）

```typescript
const BATCH_SYSTEM_PROMPT = `你是 SINUS NOTE 的資料解析助手。用戶會貼上與 Claude 的對話紀錄，你要從中提取可寫入資料庫的操作。

回傳格式：JSON array，每個元素是一個 action object。

可用的 action types：
1. material_add — 新增材料到材料庫
   { type: "material_add", cat: "base"|"botanical"|"resin"|"tincture"|"ferment"|"wine"|"binder", name, origin, supplier, note, qty, unit }

2. stock_update — 更新現有材料庫存
   { type: "stock_update", name, qty, unit }

3. recipe_add — 新增配方
   { type: "recipe_add", name, fragCat: "shrine"|"improve"|"green"|"wood"|"floral"|"resin"|"western"|"special"|"tincture"|"test", ingredients: [{cat, name, amount, unit}], notes }

4. recipe_note — 為現有配方追加備注
   { type: "recipe_note", recipeId (如果知道), recipeName, note }

5. task_add — 新增工序追蹤
   { type: "task_add", title, material (可選), taskType, notes, status (可選) }
   
   taskType 對照表：
   - 「泡了酊劑」「開始浸泡」→ taskType: "tincture", status: "waiting"
   - 「正在烘乾」「放進烘乾機」→ taskType: "dry", status: "processing"
   - 「粉備好了」「已稱量」→ taskType: "weigh", status: "ready"
   - 「泡蜜水」「蜜炙」→ taskType: "honey", status: "waiting"
   - 「採收了」→ taskType: "harvest", status: "done"
   - 「開始發酵」「酒酵法」→ taskType: "ferment", status: "waiting"
   - 「漆酶處理」「BG 酶」→ taskType: "enzyme", status: "processing"
   - 「已成型」「搓好了」→ taskType: "shape", status: "done"
   - 「晾乾中」（指線香）→ taskType: "stickDry", status: "waiting"
   - 「入窖」「窖藏」→ taskType: "cellar", status: "waiting"
   - 「炮製」「黃酒炮製」→ taskType: "paoZhi", status: "processing"
   
   ⚠ 當對話包含配方且配方狀態寫「粉備好未製作」時，除了 recipe_add 也要生成：
   { type: "task_add", title: "配方名 — 稱量配粉", taskType: "weigh", status: "ready" }

6. journal — 純日誌資訊，只顯示不寫入

如果不確定工序進行到哪個階段，用 status: "waiting" 並在 notes 加「⚠ 請確認目前進度」。
只回傳 JSON array，不要任何其他文字。`;
```

---

## 十、語音輸入

```typescript
// src/services/speech.ts
// Web Speech API，lang: 'zh-TW'
// 用於隨手記文字輸入 + 工序分頁快速記錄
// 錄音 → 轉文字 → [可選] 送 AI 解析 → 建立 note 或 task
```

保留現有語音輸入的 UX：麥克風按鈕（SVG line icon），錄音時切換為 ■ 停止圖示。

---

## 十一、匯出/匯入

### 完整備份格式
```json
{
  "exportedAt": "ISO string",
  "recipes": [],
  "nextId": 200,
  "catImages": {},
  "catOrder": [],
  "materials": [],
  "tasks": []
}
```

### 合併匯入（Patch）
```json
{
  "recipes": [],
  "materials": [],
  "tasks": []
}
```
合併規則：recipes 依 `name` 跳過重複，materials 依 `cat+name` 跳過，tasks 依 `title+startDate` 跳過。

---

## 十二、PWA 設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SINUS NOTE',
        short_name: 'SINUS NOTE',
        description: 'Incense Design — Fragrance Journal',
        theme_color: '#F5F1EB',
        background_color: '#F5F1EB',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

---

## 十三、開發順序

1. `npm create vite@latest sinus-note -- --template react-ts`
2. 安裝依賴：`tailwindcss`, `firebase`, `vite-plugin-pwa`
3. 設定 Tailwind config（設計 token）
4. Firebase 初始化 + useAuth hook + LoginScreen
5. useFirestore hook（通用 CRUD + onSnapshot）
6. 收合式底部導航 + 分頁路由
7. **工序模組**（全新，最優先寫好驗證）
8. 材料庫模組（從舊版邏輯遷移）
9. 配方模組（從舊版邏輯遷移，加入 burnLog + RelatedTasks）
10. 隨手記模組（從舊版遷移，含 AI 解析 + 批次匯入 + task_add）
11. 匯出/匯入（擴充 tasks）
12. PWA 設定 + icon
13. 部署驗證

---

## 十四、驗收標準

- [ ] Email/password 登入正常運作
- [ ] 收合式導航四個分頁正常切換
- [ ] ··· 選單（匯出/匯入/API key 設定/登出）正常運作
- [ ] **工序**：新增/編輯/刪除 task
- [ ] **工序**：狀態流轉（prep → processing → waiting → ready → done）
- [ ] **工序**：今日提醒區正確顯示到期/即將到期
- [ ] **工序**：進度條正確計算（即時任務不顯示）
- [ ] **工序**：快速新增模式
- [ ] **工序**：試燒完成 → burnLog 表單 → 寫回配方
- [ ] **配方**：首頁分類卡片 + 搜尋
- [ ] **配方**：分類內頁（按狀態分群）
- [ ] **配方**：詳情頁（版本切換 + 材料表 + 備注 + timeline）
- [ ] **配方**：詳情頁新增「相關工序」「試燒紀錄」區塊
- [ ] **配方**：新增/編輯表單（材料 autocomplete）
- [ ] **材料庫**：分類 tab + 列表 + 新增/編輯/刪除
- [ ] **隨手記**：文字輸入 + 語音 + 時間戳 + 收合
- [ ] **隨手記**：AI 解析（含 task_add）
- [ ] **隨手記**：批次對話匯入 → 逐筆確認寫入
- [ ] 所有資料正確存入/讀取 Firestore
- [ ] 跨裝置即時同步（onSnapshot 五個文件）
- [ ] 匯出/匯入包含 tasks
- [ ] PWA 離線可用 + 可加到手機桌面
- [ ] 所有 UI 符合設計系統（零圓角、暖紙色、300 weight、無 emoji）
- [ ] Vercel 部署正常

---

## 十五、不可改動的項目

- **Firebase 設定**：不改 firebaseConfig、不改 Firestore 結構（除了新增 tasks）、不改 auth 機制
- **Firestore 資料格式**：Recipe / Material / Note 的欄位格式不改，確保現有資料直接相容
- **設計語言**：零圓角、#F5F1EB 背景、Noto Serif TC + Noto Sans TC Light、暖棕強調色 #8B6F52。不加陰影、不加圓角、不加彩色 emoji
- **Git repo**：繼續用 `git@github.com:ryan770317-eng/sinus-note.git`，push main 自動部署
