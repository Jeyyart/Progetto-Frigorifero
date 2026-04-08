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
    // Prova a parsare JSON
    try {
      const data = JSON.parse(text);
      // Assicurati che la proprietà 'authorized' sia presente
      return res.status(response.status).json({ authorized: data.authorized === true, error: data.error });
    } catch (e) {
      console.error('Backend ha restituito non-JSON:', text.substring(0, 200));
      // In caso di errore, restituisci authorized: false
      return res.status(502).json({ authorized: false, error: 'Backend response invalid' });
    }
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ authorized: false, error: 'Proxy error: ' + err.message });
  }
}