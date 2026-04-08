let currentUser = null;
let messageTimeout = null;

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

function applyThemeAndUser() {
    if (!currentUser) window.location.href = '../PHP/registro.php';
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;
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

function connectManual() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
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
    window.location.href = `../PHP/Dashboard.php?id=${id}`;
}

window.logout = function() {
    fetch('../PHP/logout.php', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '../PHP/registro.php');
};

window.onload = () => {
    currentUser = (typeof window.currentUser !== 'undefined') ? window.currentUser : null;
    applyThemeAndUser();
    document.getElementById('connectBtn')?.addEventListener('click', connectManual);
    document.getElementById('deviceId')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') connectManual();
    });
};