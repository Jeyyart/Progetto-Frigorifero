// I dati utente sono già disponibili nella variabile globale currentUser (iniettata da PHP)
function applyThemeAndUser() {
    if (!currentUser) {
        window.location.href = '../PHP/registro.php';
        return;
    }
    document.getElementById('userNameHeader').textContent = currentUser.nickname || 'Utente';
    document.getElementById('userDisplay').innerHTML = `👤 ${currentUser.nickname || 'Utente'}`;
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
    if (window.innerWidth <= 768) return true;
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(ua);
}

function selectDevice() {
    const targetPage = isMobileDevice() ? 'ConnettiFrigoMobile.php' : 'ConnettiFrigo.php';
    window.location.href = `../PHP/${targetPage}`;
}

window.logout = function() {
    fetch('../PHP/logout.php', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '../PHP/registro.php');
};

window.onload = applyThemeAndUser;