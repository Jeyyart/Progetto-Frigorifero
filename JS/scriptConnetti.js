// ============================================================
// FILE: scriptConnetti.js (versione desktop)
// ============================================================
// Pagina di connessione per desktop: mostra un QR code e un campo manuale.

// Variabile che conterrà l'oggetto dell'utente corrente (recuperato dal localStorage)
let currentUser = null;
let messageTimeout = null;

// Mostra un messaggio temporaneo (errore o info) con stile appropriato
function showMessage(message, isError = false) {
    const errorEl = document.getElementById('errorContainer');
    if (messageTimeout) clearTimeout(messageTimeout);
    errorEl.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)';
    errorEl.style.borderColor = isError ? '#ef4444' : '#22c55e';
    errorEl.style.color = isError ? '#ef4444' : '#22c55e';
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    messageTimeout = setTimeout(() => {
        errorEl.style.display = 'none';
    }, 4000);
}

// Funzione principale eseguita al caricamento della pagina (window.onload)
function applyThemeAndUser() {
    // 1. Recupera i dati dell'utente salvati durante il login (da registro.html)
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Se non esiste un utente (sessione scaduta o mai loggato), reindirizza alla pagina di login
    if (!currentUser) window.location.href = '../HTML/registro.html';

    // 2. Mostra il nome utente nell'header (primo span)
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    // 3. Mostra il nome utente nel badge con l'icona (userDisplay)
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // 4. Mostra il nome utente nel messaggio di benvenuto (secondo span)
    const greetingEl = document.getElementById('userNameHeader2');
    if (greetingEl) greetingEl.textContent = name;

    // 5. Gestione del tema (chiaro/scuro) salvato in localStorage
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // 6. Imposta l'emoji corretta sul pulsante tema (sole per dark, luna per light)
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    
    // 7. Aggiunge l'evento click per cambiare tema dinamicamente
    themeBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('nexoraTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

// Funzione per mostrare un messaggio di errore nel div apposito
function showError(message) {
    const errorEl = document.getElementById('errorContainer');
    errorEl.textContent = message;
    errorEl.style.display = 'flex';   // usa flex per mantenere l'allineamento interno
}
// Funzione per nascondere il messaggio di errore
function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}

// Funzione chiamata quando l'utente clicca su "Connetti" nella sezione manuale
function connectManual() {
    hideError();
    const id = document.getElementById('deviceId').value.trim();
    if (!id) {
        showMessage('❌ Inserisci un ID frigorifero', true);
        return;
    }
    if (!id.startsWith('FRG-')) {
        showMessage('❌ ID non valido. Deve iniziare con "FRG-" (es. FRG-987654)', true);
        return;
    }
    if (id !== 'FRG-001' && id !== 'FRG-TEMPLATE') {
        showMessage('📌 ID non ancora supportato – sarà disponibile in futuro', false);
        return;
    }
    // Reindirizza alla dashboard desktop
    window.location.href = `../HTML/Dashboard.html?id=${id}`;
}


// Funzione di logout: rimuove i dati dell'utente e torna alla pagina di login
window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

// Alla fine del caricamento della pagina, esegue applyThemeAndUser per inizializzare utente e tema
window.onload = applyThemeAndUser;