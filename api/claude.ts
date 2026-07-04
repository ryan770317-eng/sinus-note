// Vercel serverless 代理：把 Anthropic API key 藏在伺服器端。
// 只接受 POST；驗 Supabase JWT（防止代理被路人白嫖）；只轉發白名單欄位。
// 注意：本檔不加進任何 tsconfig include，由 Vercel 自行編譯。
export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown },
  res: { status: (n: number) => { json: (b: unknown) => void } },
) {
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
