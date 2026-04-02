// Variabile che conterrà l'oggetto dell'utente corrente
let currentUser = null;

// Funzione principale eseguita al caricamento della pagina (window.onload)
function applyThemeAndUser() {
    // 1. Recupera i dati dell'utente salvati durante il login
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Se non esiste un utente (sessione scaduta o mai loggato), reindirizza al login
    if (!currentUser) {
        window.location.href = '../HTML/registro.html';
        return;
    }

    // 2. Mostra il nome utente in tutti gli elementi previsti
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // 3. Aggiunge l'evento al pulsante "vai a scanner" per aprire la pagina di scansione QR
    document.getElementById('scanBtn').addEventListener('click', () => {
        window.location.href = '../HTML/ScanTelefono.html';
    });

    // 4. Gestione del tema (chiaro/scuro) salvato in localStorage
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // 5. Imposta l'emoji corretta sul pulsante tema e gestisce il click per cambiare tema
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('nexoraTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

// Funzione per mostrare un messaggio di errore nel div dedicato
function showError(message) {
    const errorEl = document.getElementById('errorContainer');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// Funzione per nascondere il messaggio di errore
function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}

// Funzione di connessione manuale (chiamata dal pulsante Connetti)
function connectDevice() {
    hideError();
    const id = document.getElementById('deviceId').value.trim();
    
    // Controllo campo vuoto
    if (!id) {
        showError('❌ Inserisci un ID frigorifero');
        return;
    }
    // Validazione formato: deve iniziare con "FRG-"
    if (!id.startsWith('FRG-')) {
        showError('❌ ID non valido. Deve iniziare con "FRG-" (es. FRG-987654)');
        return;
    }
    // Reindirizza alla Dashboard mobile passando l'ID come parametro URL
    window.location.href = `../HTML/DashboardMobile.html?id=${encodeURIComponent(id)}`;
}

// === AGGANCIO EVENTI ===
// Logout: rimuove l'utente e torna alla pagina di login
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
});

// Connessione manuale al click del pulsante "Connetti"
document.getElementById('connectBtn').addEventListener('click', connectDevice);

// Supporto tasto "Invio" nel campo ID: se premi Invio, esegue connectDevice()
document.getElementById('deviceId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') connectDevice();
});

// All'avvio, inizializza tutto (utente, tema, eventi)
window.onload = applyThemeAndUser;