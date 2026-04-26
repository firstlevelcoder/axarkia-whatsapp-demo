const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const testRecipient = process.env.TEST_RECIPIENT_NUMBER || '';

  if (!token || !phoneId || !wabaId) {
    return res.status(500).json({
      error: 'Missing env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID'
    });
  }

  try {
    const r = await fetch(`${GRAPH}/${phoneId}?fields=display_phone_number,verified_name,quality_rating,id`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || data });

    return res.status(200).json({
      phone_number_id: phoneId,
      waba_id: wabaId,
      display_phone_number: data.display_phone_number,
      verified_name: data.verified_name,
      quality_rating: data.quality_rating,
      test_recipient: testRecipient
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
