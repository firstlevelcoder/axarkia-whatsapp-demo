import { listMessages } from './_store.js';

export default async function handler(req, res) {
  const since = parseInt(req.query?.since || '0', 10) || 0;
  const messages = listMessages(since);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ messages, count: messages.length });
}
