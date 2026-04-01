let currentUser = null;

function applyThemeAndUser() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) window.location.href = '../HTML/registro.html';

    // Nome utente in header
    document.getElementById('userNameHeader').textContent = currentUser.nickname || 'Utente';
    document.getElementById('userDisplay').innerHTML = `👤 ${currentUser.nickname || 'Utente'}`;

    // Nome utente nel greeting (come in Dashboard)
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

function selectDevice() {
    // Tutti i dispositivi portano alla stessa pagina
    window.location.href = '../HTML/ConnettiFrigo.html';
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = applyThemeAndUser;