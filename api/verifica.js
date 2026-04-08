// api/verifica.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed, use GET' });
    return;
  }

  const { userId, fridgeId } = req.query;
  if (!userId || !fridgeId) {
    res.status(400).json({ error: 'Missing userId or fridgeId' });
    return;
  }

  const targetUrl = `https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php?userId=${encodeURIComponent(userId)}&fridgeId=${encodeURIComponent(fridgeId)}`;

  try {
    const response = await fetch(targetUrl, { method: 'GET' });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}