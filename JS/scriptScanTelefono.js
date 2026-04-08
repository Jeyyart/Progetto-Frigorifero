// ============================================================
// FILE: scriptScanTelefono.js
// ============================================================
// Questo script gestisce la scansione QR tramite fotocamera su dispositivi mobili.
// Utilizza la libreria html5-qrcode per leggere il QR e ottenere l'ID del frigorifero.

// Variabile che conterrà l'istanza dello scanner QR (oggetto Html5Qrcode)
let html5QrCode = null;

// Funzione per estrarre l'ID frigorifero da un testo (URL o ID diretto)
// Parametro: text (stringa) - il testo decodificato dal QR
// Restituisce: l'ID del frigorifero (es. "FRG-001") oppure null se non valido
function extractFridgeIdFromText(text) {
    // Pattern per URL Vercel con qualsiasi suffisso, accetta sia Dashboard.html che DashboardMobile.html
    // Esempio: https://progetto-frigorifero.vercel.app/HTML/DashboardMobile.html?id=FRG-001
    const urlPattern = /https:\/\/progetto-frigorifero[^\/]*\.vercel\.app\/HTML\/Dashboard(?:Mobile)?\.html\?id=(FRG-[A-Z0-9]+)/i;
    const match = text.match(urlPattern); // tenta di far matchare la regex con il testo
    if (match && match[1]) { // se c'è un match e il primo gruppo catturato (l'ID) esiste
        console.log(`✅ ID estratto da URL: ${match[1]}`);
        return match[1]; // restituisce l'ID trovato
    }
    // Pattern per ID diretto (testo che inizia con "FRG-")
    if (text && text.startsWith('FRG-')) {
        console.log(`✅ ID diretto: ${text}`);
        return text;
    }
    // Se nessun pattern corrisponde, avviso in console e restituisco null
    console.warn(`⚠️ Testo QR non riconosciuto: ${text}`);
    return null;
}

// Funzione per creare un div per i messaggi temporanei (appare in sovrapposizione)
// Restituisce l'elemento div creato (o quello già esistente)
function createMessageDiv() {
    let msg = document.getElementById('scanMessage'); // cerca se esiste già
    if (!msg) { // se non esiste, lo crea
        msg = document.createElement('div');
        msg.id = 'scanMessage';
        // Stili fissi per posizionarlo in basso al centro
        msg.style.position = 'fixed';
        msg.style.bottom = '20px';
        msg.style.left = '20px';
        msg.style.right = '20px';
        msg.style.backgroundColor = 'rgba(0,0,0,0.8)';
        msg.style.color = '#ffaa00';
        msg.style.padding = '12px';
        msg.style.borderRadius = '12px';
        msg.style.textAlign = 'center';
        msg.style.fontWeight = 'bold';
        msg.style.zIndex = '1000'; // sopra tutti gli altri elementi
        document.body.appendChild(msg); // aggiunge il div al corpo della pagina
    }
    return msg;
}

// Funzione per mostrare un messaggio temporaneo (3 secondi)
// Parametri: message (stringa), isSuccess (booleano, se true usa colore verde)
function showTemporaryMessage(message, isSuccess = false) {
    const msgDiv = createMessageDiv(); // ottiene il div messaggio
    msgDiv.textContent = message; // imposta il testo
    if (isSuccess) {
        // Stile per messaggio di successo (verde)
        msgDiv.style.backgroundColor = 'rgba(34,197,94,0.9)';
        msgDiv.style.color = '#111';
    } else {
        // Stile per messaggio di avviso/errore (nero con testo giallo)
        msgDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
        msgDiv.style.color = '#ffaa00';
    }
    msgDiv.style.display = 'block'; // rende visibile il div
    // Dopo 3 secondi lo nasconde
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 3000);
}

// Avvia scanner (fotocamera) e inizia la lettura dei QR
function startScanner() {
    // Nasconde il pulsante "Avvia Scanner" e mostra "Ferma Scanner"
    document.getElementById('scanBtnScan').style.display = 'none';
    document.getElementById('stopBtnScan').style.display = 'block';

    // Crea una nuova istanza dello scanner, associandola al div con id "qr-reader"
    html5QrCode = new Html5Qrcode("qr-reader");
    
    // Configurazione dello scanner: fps (frame al secondo), dimensione del riquadro QR, vincoli fotocamera
    const config = {
        fps: 15, // fotogrammi al secondo
        qrbox: { width: 280, height: 280 }, // area di scansione quadrata
        videoConstraints: {
            facingMode: "environment", // usa fotocamera posteriore (environment = posteriore)
            advanced: [{ zoom: 1.0 }], // zoom iniziale
            width: { ideal: 1920 },    // larghezza ideale video
            height: { ideal: 1080 }    // altezza ideale
        }
    };

    // Avvia la scansione
    html5QrCode.start(
        { facingMode: "environment" }, // usa fotocamera posteriore
        config,
        // Callback eseguita ogni volta che un QR viene decodificato con successo
        (decodedText) => {
            console.log(`📷 QR letto: ${decodedText}`);
            const fridgeId = extractFridgeIdFromText(decodedText); // estrae l'ID
            
            if (fridgeId && fridgeId.startsWith("FRG-")) {
                // Controlla se l'ID è supportato (solo FRG-001 e FRG-TEMPLATE per ora)
                if (fridgeId !== 'FRG-001' && fridgeId !== 'FRG-TEMPLATE') {
                    showTemporaryMessage('📌 ID non ancora supportato – sarà disponibile in futuro', true);
                    return; // esce senza reindirizzare
                }
                stopScanner(); // ferma la fotocamera
                // Reindirizza alla dashboard MOBILE (ottimizzata per telefono) con l'ID in query string
                window.location.href = `../HTML/DashboardMobile.html?id=${fridgeId}`;
            } else {
                showTemporaryMessage('⚠️ QR non valido. Inquadra un codice NEXORA valido (FRG-XXXX)');
            }
        },
        // Callback per errori di scansione (ignorata, lasciata vuota)
        () => {}
    ).catch(err => {
        // Se la fotocamera non può essere avviata (permessi negati, etc.)
        console.error('Errore fotocamera:', err);
        showTemporaryMessage('Impossibile accedere alla fotocamera. Verifica i permessi.', false);
        // Ripristina i pulsanti: mostra "Avvia Scanner", nasconde "Ferma Scanner"
        document.getElementById('scanBtnScan').style.display = 'block';
        document.getElementById('stopBtnScan').style.display = 'none';
    });
}

// Funzione per fermare lo scanner e rilasciare la fotocamera
function stopScanner() {
    if (html5QrCode) { // se esiste un'istanza attiva
        html5QrCode.stop().then(() => {
            // Dopo lo stop, ripristina i pulsanti
            document.getElementById('scanBtnScan').style.display = 'block';
            document.getElementById('stopBtnScan').style.display = 'none';
        }).catch(err => console.warn('Errore nello stop:', err));
    }
}

// Quando la pagina è completamente caricata (window.onload)
window.onload = () => {
    // Recupera il tema salvato (default 'dark') e lo applica all'elemento html
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // Dopo mezzo secondo avvia automaticamente lo scanner (così la fotocamera si apre subito)
    setTimeout(() => startScanner(), 500);
};

// Ascolta il ridimensionamento della finestra (es. rotazione del telefono)
window.addEventListener('resize', () => {
    // Se lo scanner esiste ed è in fase di scansione, lo riavvia per adattare la videocamera
    if (html5QrCode && html5QrCode.isScanning) {
        stopScanner().then(() => startScanner());
    }
});