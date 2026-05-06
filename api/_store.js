const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_OK = !!(KV_URL && KV_TOKEN);

const MAX_MSGS = 500;
const MAX_HITS = 20;

if (!globalThis.__AXARKIA_MEM__) {
  globalThis.__AXARKIA_MEM__ = { messages: [], cursor: 0, hits: [], hitCount: 0 };
}
const MEM = globalThis.__AXARKIA_MEM__;

async function kv(...args) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function addMessage(msg) {
  const entry = {
    ts: Date.now(),
    direction: msg.direction,
    from: msg.from || null,
    to: msg.to || null,
    type: msg.type || 'text',
    text: msg.text || '',
    wamid: msg.wamid || null,
    template: msg.template || null,
    language: msg.language || null,
    status: msg.status || null,
    error: msg.error || null,
    raw: msg.raw || null
  };
  if (KV_OK) {
    try {
      const seq = await kv('INCR', 'axarkia:cursor');
      entry.seq = seq;
      await kv('RPUSH', 'axarkia:messages', JSON.stringify(entry));
      await kv('LTRIM', 'axarkia:messages', -MAX_MSGS, -1);
      return entry;
    } catch (e) {}
  }
  MEM.cursor += 1;
  entry.seq = MEM.cursor;
  MEM.messages.push(entry);
  if (MEM.messages.length > MAX_MSGS) MEM.messages.splice(0, MEM.messages.length - MAX_MSGS);
  return entry;
}

export async function listMessages(sinceSeq = 0) {
  if (KV_OK) {
    try {
      const items = await kv('LRANGE', 'axarkia:messages', 0, -1);
      if (Array.isArray(items)) {
        const parsed = items.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
        if (!sinceSeq) return parsed;
        return parsed.filter(m => m.seq > sinceSeq);
      }
    } catch (e) {}
  }
  if (!sinceSeq) return MEM.messages.slice();
  return MEM.messages.filter(m => m.seq > sinceSeq);
}

export async function updateStatus(wamid, status) {
  const m = MEM.messages.find(x => x.wamid === wamid);
  if (m) m.status = status;
  return m || null;
}

export async function recordHit(info) {
  const entry = { ts: Date.now(), ...info };
  if (KV_OK) {
    try {
      await kv('RPUSH', 'axarkia:hits', JSON.stringify(entry));
      await kv('LTRIM', 'axarkia:hits', -MAX_HITS, -1);
      await kv('INCR', 'axarkia:hitcount');
      return;
    } catch (e) {}
  }
  MEM.hitCount += 1;
  MEM.hits.push(entry);
  if (MEM.hits.length > MAX_HITS) MEM.hits.splice(0, MEM.hits.length - MAX_HITS);
}

export async function getHits() {
  if (KV_OK) {
    try {
      const [countRaw, items] = await Promise.all([
        kv('GET', 'axarkia:hitcount'),
        kv('LRANGE', 'axarkia:hits', 0, -1)
      ]);
      const parsed = (Array.isArray(items) ? items : [])
        .map(s => { try { return JSON.parse(s); } catch { return null; } })
        .filter(Boolean);
      return { count: parseInt(countRaw) || 0, recent: parsed };
    } catch (e) {}
  }
  return { count: MEM.hitCount, recent: MEM.hits.slice() };
}
