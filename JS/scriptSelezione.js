// Variabile che conterrà l'oggetto dell'utente corrente (letta dal localStorage)
let currentUser = null;

// Funzione principale eseguita al caricamento della pagina (window.onload)
function applyThemeAndUser() {
    // 1. Recupera l'utente salvato durante il login (da registro.html)
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Se non c'è nessun utente (sessione scaduta o mai loggato), reindirizza alla pagina di login
    if (!currentUser) window.location.href = '../HTML/registro.html';

    // 2. Mostra il nome utente nell'header (primo span)
    document.getElementById('userNameHeader').textContent = currentUser.nickname || 'Utente';
    // 3. Mostra il nome utente nel badge con l'icona (userDisplay)
    document.getElementById('userDisplay').innerHTML = `👤 ${currentUser.nickname || 'Utente'}`;

    // 4. Mostra il nome utente nel messaggio di benvenuto (secondo span)
    const greetingEl = document.getElementById('userNameHeader2');
    if (greetingEl) greetingEl.textContent = currentUser.nickname || 'Utente';

    // 5. Gestione del tema (chiaro/scuro) salvato in localStorage
    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);   // applica il tema all'elemento <html>

    // 6. Imposta l'emoji corretta sul pulsante tema (sole per dark, luna per light)
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    
    // 7. Aggiunge l'evento click per cambiare tema dinamicamente
    themeBtn.addEventListener('click', () => {
        // Legge il tema corrente e lo inverte
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('nexoraTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

// Funzione per rilevare se l'utente sta usando un dispositivo mobile (telefono o tablet)
function isMobileDevice() {
    // Controllo basato sulla larghezza della finestra (breakpoint tipico 768px)
    if (window.innerWidth <= 768) return true;
    // Controllo aggiuntivo tramite User Agent (stringa che identifica browser e sistema operativo)
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(ua);
}

// Funzione chiamata quando l'utente clicca su un dispositivo (Frigo, Forno, ecc.)
function selectDevice() {
    // Decide quale pagina di connessione usare in base al dispositivo:
    // - Se mobile (telefono/tablet) -> ConnettiFrigoMobile.html (interfaccia ottimizzata)
    // - Altrimenti (desktop) -> ConnettiFrigo.html (versione standard)
    const targetPage = isMobileDevice() ? 'ConnettiFrigoMobile.html' : 'ConnettiFrigo.html';
    // Reindirizza alla pagina scelta (percorso relativo alla cartella HTML)
    window.location.href = `../HTML/${targetPage}`;
}

// Funzione di logout: rimuove i dati dell'utente dal localStorage e torna alla pagina di login
window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

// Al caricamento completo della pagina, esegue applyThemeAndUser() per inizializzare tutto
window.onload = applyThemeAndUser;