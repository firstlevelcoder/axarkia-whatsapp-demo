import { addMessage, updateStatus, recordHit, listMessages, getHits } from './_store.js';

function parseInbound(value) {
  const meta = value.metadata || {};
  const out = [];
  const messages = value.messages || [];
  for (const m of messages) {
    const type = m.type || 'text';
    let text = '';
    if (type === 'text') text = m.text?.body || '';
    else if (type === 'button') text = m.button?.text || '';
    else if (type === 'interactive') {
      text = m.interactive?.button_reply?.title
          || m.interactive?.list_reply?.title
          || '[interactive]';
    } else if (type === 'image') text = '[image]' + (m.image?.caption ? ' ' + m.image.caption : '');
    else if (type === 'audio') text = '[audio]';
    else if (type === 'video') text = '[video]' + (m.video?.caption ? ' ' + m.video.caption : '');
    else if (type === 'document') text = '[document] ' + (m.document?.filename || '');
    else if (type === 'location') text = '[location] ' + (m.location?.latitude || '') + ',' + (m.location?.longitude || '');
    else text = '[' + type + ']';

    out.push(addMessage({
      direction: 'in',
      from: m.from,
      to: meta.display_phone_number || meta.phone_number_id || null,
      type,
      text,
      wamid: m.id,
      raw: m
    }));
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = req.query?.action || '';

  // ---- ACTION: messages (polling) ----
  if (req.method === 'GET' && action === 'messages') {
    const since = parseInt(req.query?.since || '0', 10) || 0;
    const messages = listMessages(since);
    return res.status(200).json({ messages, count: messages.length });
  }

  // ---- ACTION: diag ----
  if (req.method === 'GET' && action === 'diag') {
    const all = listMessages(0);
    const last = all[all.length - 1] || null;
    const incoming = all.filter(m => m.direction === 'in').length;
    const outgoing = all.filter(m => m.direction === 'out').length;
    const hits = getHits();
    return res.status(200).json({
      ok: true,
      total: all.length,
      incoming,
      outgoing,
      last,
      webhook_hits_total: hits.count,
      webhook_hits_recent: hits.recent,
      env: {
        has_token: !!process.env.WHATSAPP_ACCESS_TOKEN,
        has_phone_id: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        has_waba_id: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        has_verify_token: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        test_recipient: process.env.TEST_RECIPIENT_NUMBER || null
      }
    });
  }

  // ---- ACTION: simulate ----
  if (req.method === 'POST' && action === 'simulate') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const from = String(body.from || '34999000111').replace(/[^\d]/g, '');
    const text = String(body.text || 'Test incoming message');
    const m = addMessage({
      direction: 'in',
      from,
      to: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      type: 'text',
      text,
      wamid: 'wamid.diag.' + Date.now()
    });
    return res.status(200).json({ ok: true, simulated: m });
  }

  // ---- META WEBHOOK: GET verify ----
  if (req.method === 'GET') {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    recordHit({ method: 'GET', mode: mode || null, tokenMatch: token === verifyToken });

    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(String(challenge || ''));
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // ---- META WEBHOOK: POST ingest ----
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
      recordHit({
        method: 'POST',
        hasEntry: Array.isArray(body?.entry),
        entryCount: body?.entry?.length || 0,
        bodyKeys: body ? Object.keys(body) : [],
        sample: body ? JSON.stringify(body).slice(0, 500) : null
      });

      const entries = body?.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          parseInbound(value);
          const statuses = value.statuses || [];
          for (const s of statuses) {
            if (s.id && s.status) updateStatus(s.id, s.status);
          }
        }
      }
      return res.status(200).json({ received: true });
    } catch (e) {
      recordHit({ method: 'POST', error: String(e) });
      return res.status(200).json({ received: true, error: String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
