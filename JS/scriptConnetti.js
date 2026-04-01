let currentUser = null;

function applyThemeAndUser() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) window.location.href = '../HTML/registro.html';

    // Nome in header
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // Nome nel greeting
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
    if (!id) {
        showError('❌ Inserisci un ID frigorifero');
        return;
    }
    // Validazione formato FRG- (come nella versione mobile)
    if (!id.startsWith('FRG-')) {
        showError('❌ ID non valido. Deve iniziare con "FRG-" (es. FRG-987654)');
        return;
    }
    window.location.href = `../HTML/Dashboard.html?id=${id}`;
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = applyThemeAndUser;