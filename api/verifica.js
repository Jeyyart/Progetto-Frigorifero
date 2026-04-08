// api/verifica.js - Proxy per evitare CORS
export default async function handler(req, res) {
  // Imposta gli header CORS per la risposta
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const targetUrl = 'https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php';
  
  try {
    let fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Se è POST, invia il body; se è GET, usa i query params
    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify(req.body);
      const response = await fetch(targetUrl, fetchOptions);
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      // GET: costruisci URL con parametri
      const { userId, fridgeId } = req.query;
      const url = `${targetUrl}?userId=${encodeURIComponent(userId)}&fridgeId=${encodeURIComponent(fridgeId)}`;
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error', authorized: false });
  }
}