let currentUser = null;

function applyThemeAndUser() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '../HTML/registro.html';
        return;
    }

    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;
    document.getElementById('scanBtn').addEventListener('click', () => {
    window.location.href = '../HTML/ScanTelefono.html';
    });

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
    errorEl.style.display = 'block';
}

function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}

function connectDevice() {
    hideError();
    const id = document.getElementById('deviceId').value.trim();
    if (!id) {
        showError('❌ Inserisci un ID frigorifero');
        return;
    }
    if (!id.startsWith('FRG-')) {
        showError('❌ ID non valido. Deve iniziare con "FRG-" (es. FRG-987654)');
        return;
    }
    // Redirect alla dashboard mobile con ID
    window.location.href = `../HTML/DashboardMobile.html?id=${encodeURIComponent(id)}`;
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
});

document.getElementById('connectBtn').addEventListener('click', connectDevice);
document.getElementById('deviceId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') connectDevice();
});

window.onload = applyThemeAndUser;