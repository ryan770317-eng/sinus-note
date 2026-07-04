import { sb } from '../lib/supabase';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
}

/** 解析 Claude 回應內容（代理與直呼共用）。錯誤訊息字串保持不變。 */
function parseClaudeResponse(data: ClaudeResponse): string {
  // content 可能為空（拒答等邊角情況）— 不做保護會直接 TypeError 白畫面
  const text = data.content?.find((b) => typeof b.text === 'string')?.text;
  if (!text) throw new Error('AI 回應為空，請再試一次');
  if (data.stop_reason === 'max_tokens') {
    throw new Error('AI 回應過長被截斷 — 請把內容分段、分次貼入');
  }
  return text;
}

/** 舊直呼路徑（fallback）：瀏覽器直接帶 localStorage key 呼叫 Anthropic。 */
async function callClaudeDirect(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = localStorage.getItem('sinus_anthropic_key');
  if (!apiKey) throw new Error('未設定 API key — 請點右下「設定」輸入 Anthropic API key');

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`);
  }

  const data = (await res.json()) as ClaudeResponse;
  return parseClaudeResponse(data);
}

type ProxyOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'error'; message: string };

/**
 * 嘗試雲端代理。回傳 discriminated union：
 *  - 網路錯誤 / 無 session / status 404 / 501 / 非 JSON（dev 回 HTML）→ unavailable（走 fallback）
 *  - 2xx → 解析內容（parseClaudeResponse 的空/截斷錯誤會往外拋，屬真錯誤，不 fallback）
 *  - 其他狀態（401/4xx/5xx）→ error（真錯誤，不 fallback，避免遮蔽登入過期等問題）
 */
async function tryProxy(systemPrompt: string, userMessage: string): Promise<ProxyOutcome> {
  let token: string | undefined;
  try {
    const { data } = await sb.auth.getSession();
    token = data.session?.access_token;
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (!token) return { ok: false, reason: 'unavailable' };

  let res: Response;
  try {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 8000,
      }),
    });
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  // 代理未部署：404（無此路由）或 501（未設環境變數）
  if (res.status === 404 || res.status === 501) return { ok: false, reason: 'unavailable' };

  if (!res.ok) {
    let message = `代理錯誤 ${res.status}`;
    try {
      const err = await res.json();
      message = (err as { error?: { message?: string } }).error?.message ?? message;
    } catch { /* 保留預設訊息 */ }
    return { ok: false, reason: 'error', message };
  }

  let data: ClaudeResponse;
  try {
    data = (await res.json()) as ClaudeResponse;
  } catch {
    // dev 環境沒有 /api 可能回 404 HTML / 非 JSON → 視同代理不可用
    return { ok: false, reason: 'unavailable' };
  }
  return { ok: true, text: parseClaudeResponse(data) };
}

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const proxy = await tryProxy(systemPrompt, userMessage);
  if (proxy.ok) return proxy.text;
  if (proxy.reason === 'error') throw new Error(proxy.message);
  // 代理不可用 → 走舊直呼路徑
  return callClaudeDirect(systemPrompt, userMessage);
}

export const NOTE_ANALYSIS_PROMPT = `你是 SINUS NOTE 的香方分析助手。用戶會分享一則筆記，你要用繁體中文簡短分析：
- 識別提到的材料、配方或工序
- 提出相關的製香建議或注意事項
- 如有配方比例，評估是否合理
回答要簡潔，不超過150字。`;

export const BATCH_SYSTEM_PROMPT = `你是 SINUS NOTE 的資料解析助手。用戶會貼上配方資料、材料清單、或與 Claude 的對話紀錄，你要從中提取可寫入資料庫的操作。

回傳格式：純 JSON array（不要包 markdown code fence），每個元素是一個 action object。

可用的 action types：

1. material_add — 新增材料到材料庫
   { type: "material_add", cat: "base"|"herb"|"resin"|"tincture"|"ferment"|"wine"|"binder", name, origin, supplier, note, qty, unit }
   - origin/supplier 不確定時填空字串 ""
   - qty 不確定時填 0，unit 預設 "g"

2. stock_update — 更新現有材料庫存
   { type: "stock_update", name, qty, unit }

3. recipe_add — 新增配方
   { type: "recipe_add", name, fragCat, totalWeight, ingredients: [{cat, name, amount, unit}], notes }
   - fragCat 一律設為 "improve"，除非用戶明確指定分類（如「這是供香」→ "shrine"）
   - totalWeight：把所有 ingredients 的 amount 加總
   - ingredients 的 cat 對照：基底木/木粉 → "base"、花果藥草/草本 → "herb"、樹脂 → "resin"、酊劑 → "tincture"、發酵 → "ferment"、酒 → "wine"、黏粉 → "binder"
   - notes：含水率、線徑、香氣說明等補充資訊

4. recipe_note — 為現有配方追加備註
   { type: "recipe_note", recipeId, recipeName, note }

5. task_add — 新增工序追蹤
   { type: "task_add", title, material, taskType, notes, status }

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

6. journal — 純日誌資訊，只顯示不寫入

只回傳純 JSON array，不要包 \`\`\`json 或任何其他文字。`;
