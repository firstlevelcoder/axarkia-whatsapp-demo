import { addMessage, updateStatus } from './_store.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(String(challenge || ''));
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      const entries = body?.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const meta = value.metadata || {};

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

            addMessage({
              direction: 'in',
              from: m.from,
              to: meta.display_phone_number || meta.phone_number_id || null,
              type,
              text,
              wamid: m.id,
              raw: m
            });
          }

          const statuses = value.statuses || [];
          for (const s of statuses) {
            if (s.id && s.status) updateStatus(s.id, s.status);
          }
        }
      }
      return res.status(200).json({ received: true });
    } catch (e) {
      return res.status(200).json({ received: true, error: String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
