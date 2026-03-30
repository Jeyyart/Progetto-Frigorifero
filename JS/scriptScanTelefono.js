let html5QrCode = null;

function startScanner() {
    document.getElementById('scanBtnScan').style.display = 'none';
    document.getElementById('stopBtnScan').style.display = 'block';

    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 300, height: 300 } },
        (decodedText) => {
            stopScanner();
            if (decodedText.includes('FRG-') || decodedText.length > 6) {
                alert(`✅ QR riconosciuto!\nID: ${decodedText}`);
                window.location.href = `../HTML/Dashboard.html?id=${decodedText}`;
            } else {
                alert('⚠️ QR non valido per un frigorifero NEXORA');
            }
        },
        () => {}
    ).catch(err => console.error('Errore fotocamera:', err));
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('scanBtnScan').style.display = 'block';
            document.getElementById('stopBtnScan').style.display = 'none';
        });
    }
}

window.onload = () => {
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // Avvio automatico dopo 800ms (per permettere il permesso fotocamera)
    setTimeout(() => {
        startScanner();
    }, 800);
};