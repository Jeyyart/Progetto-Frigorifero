let isLoginMode = true;
let successTimeout = null;

function showError(message) {
    const errorEl = document.getElementById('errorContainer');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}
function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.(com|it|net|org|eu)$/i.test(email);
}
function validatePassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

function showSuccessMessage(message) {
    if (successTimeout) clearTimeout(successTimeout);
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
    errorEl.style.borderColor = '#22c55e';
    errorEl.style.color = '#22c55e';
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    successTimeout = setTimeout(() => {
        errorEl.style.display = 'none';
        errorEl.style.backgroundColor = '';
        errorEl.style.borderColor = '';
        errorEl.style.color = '';
    }, 4000);
}

// Switch tra login e registrazione
document.getElementById('registroToggleLink').addEventListener('click', () => {
    hideError();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        document.getElementById('registroButton').textContent = 'Accedi';
        document.getElementById('registroSubtitle').textContent = 'Accedi al tuo sistema di monitoraggio';
        document.getElementById('registroToggleText').textContent = 'Non hai un account? ';
        document.getElementById('registroToggleLink').textContent = 'Registrati';
        document.getElementById('registroConfirmPasswordGroup').style.display = 'none';
        document.getElementById('nicknameGroup').style.display = 'none';
        document.getElementById('emailGroup').style.display = 'none';
        document.getElementById('loginIdentifierGroup').style.display = 'block';
    } else {
        document.getElementById('registroButton').textContent = 'Registrati';
        document.getElementById('registroSubtitle').textContent = 'Crea il tuo account NEXORA';
        document.getElementById('registroToggleText').textContent = 'Hai già un account? ';
        document.getElementById('registroToggleLink').textContent = 'Accedi';
        document.getElementById('registroConfirmPasswordGroup').style.display = 'block';
        document.getElementById('nicknameGroup').style.display = 'block';
        document.getElementById('emailGroup').style.display = 'block';
        document.getElementById('loginIdentifierGroup').style.display = 'none';
        const nicknameGroup = document.getElementById('nicknameGroup');
        nicknameGroup.parentNode.insertBefore(nicknameGroup, document.getElementById('emailGroup'));
    }
});

// Evento principale
document.getElementById('registroButton').addEventListener('click', async () => {
    hideError();
    const password = document.getElementById('password').value.trim();
    if (!password) {
        showError('❌ Inserisci la password');
        return;
    }

    if (!isLoginMode) {
        const nickname = document.getElementById('nickname').value.trim();
        const email = document.getElementById('email').value.trim();
        const confirm = document.getElementById('confirmPassword').value.trim();
        if (!nickname) { showError('❌ Inserisci un nickname'); return; }
        if (!email || !validateEmail(email)) { showError('❌ Email non valida'); return; }
        if (password !== confirm) { showError('❌ Le password non coincidono'); return; }
        if (!validatePassword(password)) {
            showError('❌ Password troppo debole (min 8 caratteri, maiuscola + numero)');
            return;
        }
        try {
            const res = await fetch('../PHP/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, email, password }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showSuccessMessage('✅ Account creato con successo!');
                setTimeout(() => {
                    document.getElementById('registroToggleLink').click();
                }, 2000);
            } else {
                showError(data.message);
            }
        } catch (err) {
            showError('Errore di connessione al server');
        }
        return;
    }

    // LOGIN
    const identifier = document.getElementById('identifier').value.trim();
    if (!identifier) {
        showError('❌ Inserisci email o nickname');
        return;
    }
    try {
        const res = await fetch('../PHP/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            // Salva una copia per comodità (solo visualizzazione)
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            window.location.href = '../PHP/SelezioneDispositivo.php';
        } else {
            showError(data.message);
        }
    } catch (err) {
        showError('Errore di connessione al server');
    }
});

// Supporto tasto Invio
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('registroButton').click();
        }
    });
});

// Tema
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