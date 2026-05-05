const MAX = 200;

if (!globalThis.__AXARKIA_MSG_STORE__) {
  globalThis.__AXARKIA_MSG_STORE__ = { messages: [], cursor: 0, hits: [], hitCount: 0 };
}

const store = globalThis.__AXARKIA_MSG_STORE__;
if (!store.hits) { store.hits = []; store.hitCount = 0; }

export function recordHit(info) {
  store.hitCount += 1;
  store.hits.push({ ts: Date.now(), ...info });
  if (store.hits.length > 20) store.hits.splice(0, store.hits.length - 20);
}

export function getHits() {
  return { count: store.hitCount, recent: store.hits.slice() };
}

export function addMessage(msg) {
  store.cursor += 1;
  const entry = {
    seq: store.cursor,
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
  store.messages.push(entry);
  if (store.messages.length > MAX) {
    store.messages.splice(0, store.messages.length - MAX);
  }
  return entry;
}

export function listMessages(sinceSeq = 0) {
  if (!sinceSeq) return store.messages.slice();
  return store.messages.filter(m => m.seq > sinceSeq);
}

export function updateStatus(wamid, status) {
  const m = store.messages.find(x => x.wamid === wamid);
  if (m) m.status = status;
  return m || null;
}
