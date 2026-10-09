// src/lib/api.js
export const WEBHOOK_URL = 'https://abdullah-804.app.n8n.cloud/webhook/zingster/ask';
export const SESSION_ID  = 'zg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
export const BRAND       = "Zingster's";

export async function askAgent(text, mode = 'chat', signal, extra = {}) {
  const payload = {
    query:     text,
    message:   text,
    chatInput: text,
    text,
    prompt:    text,
    input:     text,
    mode,
    brand:     BRAND,
    sessionId: SESSION_ID,
    timestamp: new Date().toISOString(),
    menuContext: extra.menuContext || '',
    cart:        extra.cart        || [],
  };

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(
      `Server error (${res.status}). ` +
      (rawText ? `Server says: ${rawText.slice(0, 300)}` : '')
    );
  }

  let data;
  try { data = JSON.parse(rawText); }
  catch { return rawText.trim(); }

  return extractReply(data);
}

function extractReply(res) {
  if (res == null) return '';
  if (typeof res === 'string') return res.trim();

  const keys = ['reply', 'response', 'answer', 'output', 'text', 'message', 'result', 'data'];

  for (const k of keys) {
    if (typeof res[k] === 'string' && res[k].trim()) return res[k].trim();
  }

  if (Array.isArray(res) && res.length) {
    const first = res[0];
    if (typeof first === 'string') return first.trim();
    if (first && typeof first === 'object') {
      for (const k of keys) {
        if (typeof first[k] === 'string' && first[k].trim()) return first[k].trim();
        if (first.json && typeof first.json[k] === 'string' && first.json[k].trim())
          return first.json[k].trim();
      }
      if (typeof first.json === 'string') return first.json.trim();
    }
  }

  if (res.data && typeof res.data === 'object') {
    for (const k of keys) {
      if (typeof res.data[k] === 'string' && res.data[k].trim()) return res.data[k].trim();
    }
  }

  return '';
}
