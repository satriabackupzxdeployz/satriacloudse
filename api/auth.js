export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };

import { createHmac } from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  const { email, sub } = req.body || {};
  if (!email || !sub) return res.status(400).json({ success: false, error: 'Missing params' });

  const SECRET = process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'sc-secret';
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${email}|${sub}|${exp}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}|${sig}`).toString('base64url');

  return res.status(200).json({ success: true, token });
}
