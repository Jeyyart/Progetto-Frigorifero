export default async function handler(req, res) {
  // Imposta CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, fridgeId } = req.body;
  if (!userId || !fridgeId) {
    res.status(400).json({ error: 'Missing userId or fridgeId' });
    return;
  }

  const targetUrl = 'https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php';

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fridgeId })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}