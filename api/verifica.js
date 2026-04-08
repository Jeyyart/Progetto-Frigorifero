// api/verifica.js
export default async function handler(req, res) {
  // Imposta CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, fridgeId } = req.query;
  if (!userId || !fridgeId) {
    res.status(400).json({ error: 'Missing userId or fridgeId' });
    return;
  }

  // URL corretto del backend (verifica_associazione.php con trattino basso)
  const targetUrl = `https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php?userId=${encodeURIComponent(userId)}&fridgeId=${encodeURIComponent(fridgeId)}`;
  
  try {
    console.log(`Proxy chiama: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('Risposta dal backend:', data);
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
}