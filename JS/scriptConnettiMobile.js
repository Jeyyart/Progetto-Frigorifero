let currentUser = null;

function applyThemeAndUser() {
    if (!currentUser) {
        window.location.href = '../PHP/registro.php';
        return;
    }
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;
    document.getElementById('scanBtn').addEventListener('click', () => {
        window.location.href = '../PHP/ScanTelefono.php';
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
function hideError() { document.getElementById('errorContainer').style.display = 'none'; }

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
    if (id !== 'FRG-001' && id !== 'FRG-TEMPLATE') {
        const errorEl = document.getElementById('errorContainer');
        errorEl.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
        errorEl.style.borderColor = '#22c55e';
        errorEl.style.color = '#22c55e';
        errorEl.textContent = '📌 ID non ancora supportato – sarà disponibile in futuro';
        errorEl.style.display = 'block';
        setTimeout(() => errorEl.style.display = 'none', 4000);
        return;
    }
    window.location.href = `../PHP/DashboardMobile.php?id=${encodeURIComponent(id)}`;
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    fetch('../PHP/logout.php', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '../PHP/registro.php');
});
document.getElementById('connectBtn').addEventListener('click', connectDevice);
document.getElementById('deviceId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') connectDevice();
});

window.onload = () => {
    currentUser = (typeof window.currentUser !== 'undefined') ? window.currentUser : null;
    applyThemeAndUser();
};