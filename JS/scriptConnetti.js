let currentUser = null;

function applyThemeAndUser() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) window.location.href = '../HTML/registro.html';

    // Nome in header
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // Nome nel greeting (come in Dashboard)
    const greetingEl = document.getElementById('userNameHeader2');
    if (greetingEl) greetingEl.textContent = name;

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

// === GESTIONE ERRORI ROSSI ===
function showError(message) {
    const errorEl = document.getElementById('errorContainer');
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
}
function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}

function connectManual() {
    hideError();
    const id = document.getElementById('deviceId').value.trim();
    if (id) {
        window.location.href = `../HTML/Dashboard.html?id=${id}`;
    } else {
        showError('❌ Inserisci un ID valido');
    }
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = applyThemeAndUser;