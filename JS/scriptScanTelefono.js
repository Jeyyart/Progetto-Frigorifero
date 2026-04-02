// Variabile che conterrà l'istanza dello scanner QR (libreria html5-qrcode)
let html5QrCode = null;

// Funzione per avviare lo scanner (chiamata dal pulsante "Avvia Scanner")
function startScanner() {
    // Nasconde il pulsante "Avvia Scanner" e mostra il pulsante "Ferma Scanner"
    document.getElementById('scanBtnScan').style.display = 'none';
    document.getElementById('stopBtnScan').style.display = 'block';

    // Crea una nuova istanza dello scanner associandola al div con id "qr-reader"
    html5QrCode = new Html5Qrcode("qr-reader");
    
    // Configurazione dello scanner: fps (frame al secondo), dimensione area di scansione, vincoli video
    const config = {
        fps: 15,                        // 15 fotogrammi al secondo
        qrbox: { width: 280, height: 280 },  // area quadrata dove cercare il QR
        videoConstraints: {
            facingMode: "environment",  // usa la fotocamera posteriore (environment = posteriore)
            advanced: [{ zoom: 1.0 }],  // zoom normale (1.0)
            width: { ideal: 1920 },     // risoluzione desiderata
            height: { ideal: 1080 }
        }
    };

    // Avvia lo scanner passando la fotocamera posteriore, la configurazione, e due callback:
    // - qrCodeSuccessCallback: eseguita quando viene rilevato un QR code valido
    // - qrCodeErrorCallback: eseguita in caso di errore (non usata, funzione vuota)
    html5QrCode.start(
        { facingMode: "environment" },   // stesso vincolo per la videocamera
        config,
        (decodedText) => {               // callback di successo: decodedText è il testo letto dal QR
            // Verifica che il testo letto inizi con "FRG-" (ID frigorifero valido)
            if (decodedText && decodedText.startsWith("FRG-")) {
                stopScanner();           // ferma lo scanner per non leggere ripetutamente
                alert(`✅ QR riconosciuto!\nID: ${decodedText}`);  // notifica all'utente
                // Reindirizza alla dashboard (desktop o mobile? qui si usa Dashboard.html, versione desktop)
                window.location.href = `../HTML/Dashboard.html?id=${decodedText}`;
            } else {
                // QR non valido: mostra messaggio di errore temporaneo
                const msgDiv = document.getElementById('scanMessage') || createMessageDiv();
                msgDiv.textContent = '⚠️ QR non valido. Inquadra il codice NEXORA (FRG-XXXXXX)';
                msgDiv.style.display = 'block';
                setTimeout(() => { msgDiv.style.display = 'none'; }, 2000);
            }
        },
        () => {}    // callback di errore: non facciamo nulla (potremmo loggare ma non necessario)
    ).catch(err => {
        // Se la fotocamera non può essere avviata (permessi negati, nessuna fotocamera, ecc.)
        console.error('Errore fotocamera:', err);
        alert('Impossibile accedere alla fotocamera. Verifica i permessi.');
        // Ripristina i pulsanti: mostra "Avvia Scanner", nasconde "Ferma Scanner"
        document.getElementById('scanBtnScan').style.display = 'block';
        document.getElementById('stopBtnScan').style.display = 'none';
    });
}

// Funzione per creare dinamicamente un div per i messaggi di errore (se non esiste già)
function createMessageDiv() {
    let msg = document.getElementById('scanMessage');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'scanMessage';
        // Stili inline per un messaggio fluttuante in basso
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
        msg.style.zIndex = '1000';
        document.body.appendChild(msg);
    }
    return msg;
}

// Funzione per fermare lo scanner in modo pulito
function stopScanner() {
    if (html5QrCode) {
        // Il metodo stop() restituisce una Promise: quando lo stop è completato, ripristina i pulsanti
        html5QrCode.stop().then(() => {
            document.getElementById('scanBtnScan').style.display = 'block';
            document.getElementById('stopBtnScan').style.display = 'none';
        }).catch(err => console.warn('Errore nello stop:', err));
    }
}

// All'avvio della pagina (window.onload) viene eseguita questa funzione
window.onload = () => {
    // Applica il tema salvato (dark/light) all'elemento <html> tramite attributo data-theme
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // Avvia automaticamente lo scanner dopo mezzo secondo (per dare tempo alla pagina di caricare)
    setTimeout(() => startScanner(), 500);
};

// Evento che reagisce al ridimensionamento della finestra (es. rotazione del telefono)
window.addEventListener('resize', () => {
    // Se lo scanner è attualmente in esecuzione, lo ferma e lo riavvia
    // Questo permette di adattare il layout e la risoluzione al nuovo orientamento
    if (html5QrCode && html5QrCode.isScanning) {
        stopScanner().then(() => startScanner());
    }
});