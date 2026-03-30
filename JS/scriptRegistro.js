let isLoginMode = true;
let usersDB = JSON.parse(localStorage.getItem('nexoraUsers')) || [];

const defaultUsers = [
    { email: "a@a.com", nickname: "J", password: "Jeremias1" },
    { email: "debug@frigo.it", nickname: "Debug", password: "Debug123" }
];

defaultUsers.forEach(user => {
    if (!usersDB.find(u => u.email === user.email)) usersDB.push(user);
});
localStorage.setItem('nexoraUsers', JSON.stringify(usersDB));

const registroButton = document.getElementById('registroButton');
const registroToggleLink = document.getElementById('registroToggleLink');
const registroConfirmGroup = document.getElementById('registroConfirmPasswordGroup');
const registroSubtitle = document.getElementById('registroSubtitle');
const registroToggleText = document.getElementById('registroToggleText');
const nicknameGroup = document.getElementById('nicknameGroup');
const emailGroup = document.getElementById('emailGroup');
const loginIdentifierGroup = document.getElementById('loginIdentifierGroup');

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.(com|it|net|org|eu)$/i.test(email);
}
function validatePassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

registroToggleLink.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        registroButton.textContent = 'Accedi';
        registroSubtitle.textContent = 'Accedi al tuo sistema di monitoraggio';
        registroToggleText.textContent = 'Non hai un account? ';
        registroToggleLink.textContent = 'Registrati';
        registroConfirmGroup.style.display = 'none';
        nicknameGroup.style.display = 'none';
        emailGroup.style.display = 'none';
        loginIdentifierGroup.style.display = 'block';
    } else {
        registroButton.textContent = 'Registrati';
        registroSubtitle.textContent = 'Crea il tuo account NEXORA';
        registroToggleText.textContent = 'Hai già un account? ';
        registroToggleLink.textContent = 'Accedi';
        registroConfirmGroup.style.display = 'block';
        nicknameGroup.style.display = 'block';
        emailGroup.style.display = 'block';
        loginIdentifierGroup.style.display = 'none';
        // Nickname sempre PRIMA in registrazione
        nicknameGroup.parentNode.insertBefore(nicknameGroup, emailGroup);
    }
});

registroButton.addEventListener('click', () => {
    const password = document.getElementById('password').value.trim();

    if (!password) {
        alert('❌ Inserisci la password');
        return;
    }

    if (!isLoginMode) {
        const nickname = document.getElementById('nickname').value.trim();
        const email = document.getElementById('email').value.trim();
        const confirm = document.getElementById('confirmPassword').value.trim();

        if (!nickname) { alert('❌ Inserisci un nickname'); return; }
        if (!email || !validateEmail(email)) { alert('❌ Email non valida'); return; }
        if (password !== confirm) { alert('❌ Le password non coincidono'); return; }
        if (!validatePassword(password)) { alert('❌ Password troppo debole (min 8 caratteri, maiuscola + numero)'); return; }

        if (usersDB.find(u => u.email === email || u.nickname === nickname)) {
            alert('❌ Email o nickname già in uso'); return;
        }

        usersDB.push({ email, nickname, password });
        localStorage.setItem('nexoraUsers', JSON.stringify(usersDB));
        alert('✅ Account creato con successo!');
        registroToggleLink.click();
        return;
    }

    // LOGIN: un solo campo (email O nickname)
    const identifier = document.getElementById('identifier').value.trim();
    const user = usersDB.find(u => 
        (u.email === identifier || u.nickname === identifier) && u.password === password
    );

    if (user) {
        localStorage.setItem('currentUser', JSON.stringify({ 
            nickname: user.nickname, 
            email: user.email, 
            isAdmin: false 
        }));
        window.location.href = '../HTML/SelezioneDispositivo.html';
    } else if (identifier === '#admin' && password === 'admin123') {
        localStorage.setItem('currentUser', JSON.stringify({ nickname: '#admin', isAdmin: true }));
        window.location.href = '../HTML/SelezioneDispositivo.html';
    } else {
        alert('❌ Credenziali errate');
    }
});

// TEMA GLOBALE
const themeBtn = document.getElementById('themeToggleBtn');
let theme = localStorage.getItem('nexoraTheme') || 'dark';
document.documentElement.setAttribute('data-theme', theme);
themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';

themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nexoraTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
});