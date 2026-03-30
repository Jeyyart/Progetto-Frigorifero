let currentUser = null;

function applyThemeAndUser() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) window.location.href = '../HTML/registro.html';

    document.getElementById('userNameHeader').textContent = currentUser.nickname;
    document.getElementById('userDisplay').innerHTML = `👤 ${currentUser.nickname}`;

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

function selectDevice(type) {
    if (type === 'frigo') window.location.href = '../HTML/ConnettiFrigo.html';
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = applyThemeAndUser;