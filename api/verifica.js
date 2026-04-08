// ============================================================
// FILE: verifica.js - Serverless Function per Vercel
// ============================================================
// Questo file è un endpoint API (serverless) che funge da proxy tra il frontend
// e il backend PHP esterno (Railway). Risolve problemi di CORS e permette
// al frontend di chiamare l'API di verifica associazione utente-frigorifero.

// Esporta una funzione asincrona che Vercel chiamerà automaticamente quando
// viene fatta una richiesta all'endpoint (es. /api/verifica)
export default async function handler(req, res) {
  // ----- IMPOSTAZIONE HEADER CORS -----
  // CORS (Cross-Origin Resource Sharing) permette al browser di accettare risposte
  // da un'origine diversa. Qui si abilita l'accesso da qualsiasi origine (*)
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Metodi HTTP permessi: POST e OPTIONS (OPTIONS è una richiesta di preflight)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Headers permessi nella richiesta
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ----- GESTIONE PREFLIGHT (OPTIONS) -----
  // Il browser prima di una richiesta POST "non semplice" manda una richiesta OPTIONS
  // per verificare i permessi CORS. Qui rispondiamo con 200 e chiudiamo.
  if (req.method === 'OPTIONS') {
    res.status(200).end();   // fine della risposta, senza body
    return;
  }

  // ----- VERIFICA METODO HTTP -----
  // Accettiamo solo POST. Se la richiesta non è POST, rispondiamo con 405 (Method Not Allowed)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ----- ESTRAZIONE PARAMETRI DAL BODY -----
  // Il frontend invia un JSON con { userId, fridgeId }
  const { userId, fridgeId } = req.body;
  // Se manca uno dei due, rispondiamo con errore 400 (Bad Request)
  if (!userId || !fridgeId) {
    res.status(400).json({ error: 'Missing userId or fridgeId' });
    return;
  }

  // ----- URL DEL BACKEND PHP REALE -----
  // Questo è il server Railway che contiene il database e la logica di verifica
  const targetUrl = 'https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php';

  // ----- INVIO RICHIESTA AL BACKEND (PROXY) -----
  try {
    // fetch è l'API nativa di Node.js per fare richieste HTTP
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fridgeId })   // invia gli stessi dati in JSON
    });
    // Legge la risposta JSON dal backend
    const data = await response.json();
    // Inoltra la risposta al frontend con lo stesso status code e gli stessi dati
    res.status(response.status).json(data);
  } catch (err) {
    // Se si verifica un errore di rete o di esecuzione, lo catturiamo
    console.error('Proxy error:', err);
    // Rispondiamo con 500 (Internal Server Error) e un messaggio descrittivo
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}