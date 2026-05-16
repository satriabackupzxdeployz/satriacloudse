export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return res.status(200).json({ ok: true });

  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?limit=1`, {
      method: 'GET',
    });
  } catch {}

  return res.status(200).json({ ok: true });
}
