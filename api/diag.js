import { addMessage, listMessages, getHits } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const from = String(body.from || '34999000111').replace(/[^\d]/g, '');
    const text = String(body.text || 'Test incoming message from /api/_diag');
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
