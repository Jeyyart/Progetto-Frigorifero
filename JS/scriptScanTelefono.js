// scriptScanTelefono.js - con verifica associazione via API

let html5QrCode = null;
let currentScannedFridgeId = null;

// URL della tua API di verifica (già pronta)
const API_VERIFICA_ASSOCIAZIONE = "https://phpusersbytolentino-production.up.railway.app/verifica_associazione.php";

function extractFridgeIdFromText(text) {
    const urlPattern = /https:\/\/progetto-frigorifero[^\/]*\.vercel\.app\/HTML\/Dashboard(?:Mobile)?\.html\?id=(FRG-[A-Z0-9]+)/i;
    const match = text.match(urlPattern);
    if (match && match[1]) return match[1];
    if (text && text.startsWith('FRG-')) return text;
    return null;
}

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
    }, 4000);
}

async function verificaUtenteEAutorizza(fridgeId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // 1. Se non loggato, salva l'ID e reindirizza al login
    if (!currentUser) {
        localStorage.setItem('pendingFridgeId', fridgeId);
        localStorage.setItem('redirectAfterScan', window.location.href);
        window.location.href = '../HTML/registro.html';
        return;
    }

    // 2. Se è admin (nickname '#admin'), autorizza senza chiamata API
    if (currentUser.isAdmin === true) {
        stopScanner();
        window.location.href = `../HTML/DashboardMobile.html?id=${fridgeId}`;
        return;
    }

    // 3. Utente normale: chiama API di verifica associazione
    showTemporaryMessage("Verifica autorizzazione in corso...", false);
    try {
        const response = await fetch(API_VERIFICA_ASSOCIAZIONE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.nickname,   // il nickname dell'utente
                fridgeId: fridgeId
            })
        });
        const data = await response.json();
        
        if (data.authorized === true) {
            // Autorizzato → dashboard mobile
            stopScanner();
            window.location.href = `../HTML/DashboardMobile.html?id=${fridgeId}`;
        } else {
            // Non autorizzato → errore e torna allo scanner
            showTemporaryMessage("❌ Il tuo account non è autorizzato per questo frigorifero", false);
            setTimeout(() => {
                window.location.href = '../HTML/ScanTelefono.html';
            }, 3000);
        }
    } catch (err) {
        console.error("Errore verifica API:", err);
        showTemporaryMessage("Errore di connessione al server. Riprova.", false);
        setTimeout(() => {
            window.location.href = '../HTML/ScanTelefono.html';
        }, 3000);
    }
}

function onQrCodeScanned(decodedText) {
    console.log(`📷 QR letto: ${decodedText}`);
    const fridgeId = extractFridgeIdFromText(decodedText);
    
    if (fridgeId && fridgeId.startsWith("FRG-")) {
        // Accetta qualsiasi ID (non solo FRG-001 e TEMPLATE)
        currentScannedFridgeId = fridgeId;
        verificaUtenteEAutorizza(fridgeId);
    } else {
        showTemporaryMessage("⚠️ QR non valido. Inquadra un codice NEXORA valido (FRG-XXXX)");
    }
}

function startScanner() {
    document.getElementById('scanBtnScan').style.display = 'none';
    document.getElementById('stopBtnScan').style.display = 'block';

    html5QrCode = new Html5Qrcode("qr-reader");
    const config = {
        fps: 15,
        qrbox: { width: 280, height: 280 },
        videoConstraints: { facingMode: "environment" }
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onQrCodeScanned,
        () => {}
    ).catch(err => {
        console.error('Errore fotocamera:', err);
        showTemporaryMessage("Impossibile accedere alla fotocamera. Verifica i permessi.");
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

// All'avvio: se c'è un pendingFridgeId (dopo il login), riprende la verifica
window.onload = () => {
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    const pendingId = localStorage.getItem('pendingFridgeId');
    if (pendingId) {
        localStorage.removeItem('pendingFridgeId');
        verificaUtenteEAutorizza(pendingId);
    } else {
        startScanner();
    }
};