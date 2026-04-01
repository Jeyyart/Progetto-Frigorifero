let html5QrCode = null;

// Funzione per avviare lo scanner con zoom 1x
function startScanner() {
    document.getElementById('scanBtnScan').style.display = 'none';
    document.getElementById('stopBtnScan').style.display = 'block';

    html5QrCode = new Html5Qrcode("qr-reader");
    const config = {
        fps: 15,
        qrbox: { width: 280, height: 280 },  // allineato al riquadro tratteggiato
        videoConstraints: {
            facingMode: "environment",
            // Imposta zoom a 1 (se supportato)
            advanced: [{ zoom: 1 }]
        }
    };

    html5QrCode.start(
        { facingMode: "environment" },  // fallback se advanced non funziona
        config,
        (decodedText) => {
            // Riconoscimento specifico NEXORA: ID deve iniziare con "FRG-"
            if (decodedText && decodedText.startsWith("FRG-")) {
                stopScanner();
                alert(`✅ QR riconosciuto!\nID: ${decodedText}`);
                window.location.href = `../HTML/Dashboard.html?id=${decodedText}`;
            } else {
                // QR non valido: continua a scannerizzare, ma mostra un avviso temporaneo
                const msgDiv = document.getElementById('scanMessage') || createMessageDiv();
                msgDiv.textContent = '⚠️ QR non valido. Inquadra il codice NEXORA (FRG-XXXXXX)';
                msgDiv.style.display = 'block';
                setTimeout(() => { msgDiv.style.display = 'none'; }, 2000);
            }
        },
        (errorMessage) => {
            // Ignora errori normali di lettura
            // console.log(errorMessage);
        }
    ).catch(err => {
        console.error('Errore fotocamera:', err);
        alert('Impossibile accedere alla fotocamera. Verifica i permessi.');
        document.getElementById('scanBtnScan').style.display = 'block';
        document.getElementById('stopBtnScan').style.display = 'none';
    });
}

// Crea un div per i messaggi temporanei (se non esiste)
function createMessageDiv() {
    let msg = document.getElementById('scanMessage');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'scanMessage';
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

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('scanBtnScan').style.display = 'block';
            document.getElementById('stopBtnScan').style.display = 'none';
        }).catch(err => console.warn('Errore nello stop:', err));
    }
}

window.onload = () => {
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // Avvio automatico dopo 500ms per dare tempo al layout
    setTimeout(() => {
        startScanner();
    }, 500);
};

// Assicura che lo scanner si riadatti al ridimensionamento (es. rotazione)
window.addEventListener('resize', () => {
    if (html5QrCode && html5QrCode.isScanning) {
        // Forza il riadattamento del riquadro
        html5QrCode.applyVideoConstraints({});
    }
});