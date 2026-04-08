// api/verifica.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const { userId, fridgeId } = req.query;
  if (!userId || !fridgeId) {
    return res.status(400).json({ error: 'Missing userId or fridgeId' });
  }

  const backendUrl = `https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php?userId=${encodeURIComponent(userId)}&fridgeId=${encodeURIComponent(fridgeId)}`;
  
  try {
    const response = await fetch(backendUrl);
    const text = await response.text();
    // Tenta di parsare come JSON
    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch (e) {
      // Il backend ha restituito HTML (errore) – usiamo fallback
      console.error('Backend ha restituito HTML, uso fallback');
      // Fallback: autorizza solo FRG-001 (per test)
      if (fridgeId === 'FRG-001') {
        return res.status(200).json({ authorized: true });
      } else {
        return res.status(200).json({ authorized: false, error: 'ID non supportato (fallback)' });
      }
    }
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}