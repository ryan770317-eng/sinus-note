const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = localStorage.getItem('sinus_anthropic_key');
  if (!apiKey) throw new Error('未設定 API key');

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

  const data = (await res.json()) as { content: Array<{ text: string }> };
  return data.content[0].text;
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

4. recipe_note — 為現有配方追加備注
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
