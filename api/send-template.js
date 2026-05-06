import { addMessage } from './_store.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return res.status(500).json({ error: 'Missing WhatsApp env vars' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const to = String(body?.to || process.env.TEST_RECIPIENT_NUMBER || '').replace(/[^\d]/g, '');
  const name = String(body?.name || '').trim();
  const language = String(body?.language || 'en_US').trim();
  const parameters = Array.isArray(body?.parameters) ? body.parameters : [];

  if (!to) return res.status(400).json({ error: 'Missing "to"' });
  if (!name) return res.status(400).json({ error: 'Missing template "name"' });

  const components = parameters.length > 0
    ? [{
        type: 'body',
        parameters: parameters.map((p) => ({ type: 'text', text: String(p) }))
      }]
    : [];

  try {
    const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name,
          language: { code: language },
          ...(components.length ? { components } : {})
        }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      await addMessage({
        direction: 'out',
        from: phoneId,
        to,
        type: 'template',
        text: '[template:' + name + ']',
        template: name,
        language,
        status: 'failed',
        error: data.error || data
      });
      return res.status(r.status).json({ error: data.error || data });
    }

    const wamid = data.messages?.[0]?.id;
    const previewText = parameters.length
      ? '[template:' + name + '] ' + parameters.join(' | ')
      : '[template:' + name + ']';
    await addMessage({
      direction: 'out',
      from: phoneId,
      to,
      type: 'template',
      text: previewText,
      template: name,
      language,
      wamid,
      status: 'sent',
      raw: data
    });

    return res.status(200).json({
      message_id: wamid,
      to,
      template: name,
      language,
      phone_number_id: phoneId,
      raw: data
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
