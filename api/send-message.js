const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return res.status(500).json({ error: 'Missing WhatsApp env vars' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const to = String(body?.to || process.env.TEST_RECIPIENT_NUMBER || '').replace(/[^\d]/g, '');
  const text = String(body?.text || '').slice(0, 4000);
  if (!to) return res.status(400).json({ error: 'Missing "to"' });
  if (!text) return res.status(400).json({ error: 'Missing "text"' });

  try {
    const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text }
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || data });

    return res.status(200).json({
      message_id: data.messages?.[0]?.id,
      to,
      phone_number_id: phoneId,
      raw: data
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
