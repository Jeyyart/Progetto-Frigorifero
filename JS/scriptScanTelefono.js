// Variabile che conterrà l'istanza dello scanner QR
let html5QrCode = null;

// Funzione per estrarre l'ID frigorifero da un testo (URL o ID diretto)
function extractFridgeIdFromText(text) {
    // Pattern per URL: https://progetto-frigorifero-lrcq.vercel.app/HTML/Dashboard.html?id=FRG-...
    const urlPattern = /https:\/\/progetto-frigorifero-lrcq\.vercel\.app\/HTML\/Dashboard\.html\?id=(FRG-[A-Z0-9]+)/i;

    const match = text.match(urlPattern);
    if (match && match[1]) {
        return match[1];
    }
    // Pattern per ID diretto (inizia con FRG-)
    if (text && text.startsWith('FRG-')) {
        return text;
    }
    return null;
}

// Funzione per creare un div per i messaggi temporanei
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

// Funzione per mostrare un messaggio temporaneo
function showTemporaryMessage(message, isSuccess = false) {
    const msgDiv = createMessageDiv();
    msgDiv.textContent = message;
    if (isSuccess) {
        msgDiv.style.backgroundColor = 'rgba(34,197,94,0.9)';
        msgDiv.style.color = '#111';
    } else {
        msgDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
        msgDiv.style.color = '#ffaa00';
    }
    msgDiv.style.display = 'block';
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 3000);
}

// Avvia scanner
function startScanner() {
    document.getElementById('scanBtnScan').style.display = 'none';
    document.getElementById('stopBtnScan').style.display = 'block';

    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 15,
        qrbox: { width: 280, height: 280 },
        videoConstraints: {
            facingMode: "environment",
            advanced: [{ zoom: 1.0 }],
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            const fridgeId = extractFridgeIdFromText(decodedText);
            
            if (fridgeId && fridgeId.startsWith("FRG-")) {
                // Controlla se l'ID è supportato (solo FRG-001 e FRG-TEMPLATE)
                if (fridgeId !== 'FRG-001' && fridgeId !== 'FRG-TEMPLATE') {
                    showTemporaryMessage('📌 ID non ancora supportato – sarà disponibile in futuro', true);
                    return;
                }
                stopScanner();
                window.location.href = `../HTML/Dashboard.html?id=${fridgeId}`;
            } else {
                showTemporaryMessage('⚠️ QR non valido. Inquadra un codice NEXORA valido (FRG-XXXX)');
            }
        },
        () => {}
    ).catch(err => {
        console.error('Errore fotocamera:', err);
        showTemporaryMessage('Impossibile accedere alla fotocamera. Verifica i permessi.', false);
        document.getElementById('scanBtnScan').style.display = 'block';
        document.getElementById('stopBtnScan').style.display = 'none';
    });
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
    setTimeout(() => startScanner(), 500);
};

window.addEventListener('resize', () => {
    if (html5QrCode && html5QrCode.isScanning) {
        stopScanner().then(() => startScanner());
    }
});