const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!token || !wabaId) return res.status(500).json({ error: 'Missing WhatsApp env vars' });

  try {
    const r = await fetch(
      `${GRAPH}/${wabaId}/message_templates?fields=name,status,category,language,components,id&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || data });

    return res.status(200).json({
      waba_id: wabaId,
      total: data.data?.length || 0,
      templates: data.data || []
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
