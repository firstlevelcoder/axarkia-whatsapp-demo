const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!token || !wabaId) return res.status(500).json({ error: 'Missing WhatsApp env vars' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const name = String(body?.name || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const category = String(body?.category || 'UTILITY').toUpperCase();
  const language = String(body?.language || 'en_US').trim();
  const text = String(body?.body || '').trim();

  if (!name) return res.status(400).json({ error: 'Missing template "name"' });
  if (!text) return res.status(400).json({ error: 'Missing template "body"' });
  if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
    return res.status(400).json({ error: 'category must be MARKETING, UTILITY, or AUTHENTICATION' });
  }

  try {
    const r = await fetch(`${GRAPH}/${wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        category,
        language,
        components: [{ type: 'BODY', text }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || data });

    return res.status(200).json({
      template_id: data.id,
      name,
      status: data.status,
      category: data.category,
      raw: data
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
