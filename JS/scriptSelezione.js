let currentUser = null;

function applyThemeAndUser() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) window.location.href = '../HTML/registro.html';

    // Nome utente in header
    document.getElementById('userNameHeader').textContent = currentUser.nickname || 'Utente';
    document.getElementById('userDisplay').innerHTML = `👤 ${currentUser.nickname || 'Utente'}`;

    // Nome utente nel greeting
    const greetingEl = document.getElementById('userNameHeader2');
    if (greetingEl) greetingEl.textContent = currentUser.nickname || 'Utente';

    const theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('nexoraTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

function isMobileDevice() {
    // Controlla larghezza finestra (tipico breakpoint per mobile)
    if (window.innerWidth <= 768) return true;
    // Controlla user agent per dispositivi mobili (inclusi tablet)
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(ua);
}

function selectDevice() {
    // Determina la pagina di connessione in base al dispositivo
    const targetPage = isMobileDevice() ? 'ConnettiFrigoMobile.html' : 'ConnettiFrigo.html';
    window.location.href = `../HTML/${targetPage}`;
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = applyThemeAndUser;