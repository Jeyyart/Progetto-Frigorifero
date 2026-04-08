// VARIABILE GLOBALE: true = modalità login, false = modalità registrazione
let isLoginMode = true;
let successTimeout = null;

// URL base dell'API (stesso backend usato in register.php e access.php)
const API_BASE = "https://phpusersbytolentino-production.up.railway.app";

// Riferimenti agli elementi HTML
const registroButton = document.getElementById('registroButton');
const registroToggleLink = document.getElementById('registroToggleLink');
const registroConfirmGroup = document.getElementById('registroConfirmPasswordGroup');
const registroSubtitle = document.getElementById('registroSubtitle');
const registroToggleText = document.getElementById('registroToggleText');
const nicknameGroup = document.getElementById('nicknameGroup');
const emailGroup = document.getElementById('emailGroup');
const loginIdentifierGroup = document.getElementById('loginIdentifierGroup');

// ========== FUNZIONI PER LA GESTIONE DEGLI ERRORI ==========
function showError(message) {
    const errorEl = document.getElementById('errorContainer');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}

function showSuccess(message) {
    if (successTimeout) clearTimeout(successTimeout);
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
    errorEl.style.borderColor = '#22c55e';
    errorEl.style.color = '#22c55e';
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    successTimeout = setTimeout(() => {
        if (errorEl.style.display === 'block') errorEl.style.display = 'none';
        // Ripristina lo stile per i prossimi errori
        errorEl.style.backgroundColor = '';
        errorEl.style.borderColor = '';
        errorEl.style.color = '';
    }, 4000);
}

// ========== FUNZIONI DI VALIDAZIONE ==========
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.(com|it|net|org|eu)$/i.test(email);
}

function validatePassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

// ========== SWITCH TRA LOGIN E REGISTRAZIONE ==========
registroToggleLink.addEventListener('click', () => {
    hideError();
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        // MODALITÀ LOGIN
        registroButton.textContent = 'Accedi';
        registroSubtitle.textContent = 'Accedi al tuo sistema di monitoraggio';
        registroToggleText.textContent = 'Non hai un account? ';
        registroToggleLink.textContent = 'Registrati';
        registroConfirmGroup.style.display = 'none';
        nicknameGroup.style.display = 'none';
        emailGroup.style.display = 'none';
        loginIdentifierGroup.style.display = 'block';
    } else {
        // MODALITÀ REGISTRAZIONE
        registroButton.textContent = 'Registrati';
        registroSubtitle.textContent = 'Crea il tuo account NEXORA';
        registroToggleText.textContent = 'Hai già un account? ';
        registroToggleLink.textContent = 'Accedi';
        registroConfirmGroup.style.display = 'block';
        nicknameGroup.style.display = 'block';
        emailGroup.style.display = 'block';
        loginIdentifierGroup.style.display = 'none';
        // Assicura l'ordine visivo: nickname sopra email
        nicknameGroup.parentNode.insertBefore(nicknameGroup, emailGroup);
    }
});

// ========== REGISTRAZIONE TRAMITE API ==========
async function registerUser(nickname, email, password) {
    const formData = new URLSearchParams();
    formData.append("nickname", nickname);
    formData.append("email", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE}/register.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    });

    const text = await response.text();
    if (text.includes("Registrazione completata")) {
        return { success: true, message: "✅ Account creato con successo!" };
    } else {
        return { success: false, message: "❌ " + text };
    }
}

// ========== LOGIN TRAMITE API ==========
async function loginUser(identifier, password) {
    const formData = new URLSearchParams();
    formData.append("email", identifier);   // L'API access.php si aspetta "email"
    formData.append("password", password);

    const response = await fetch(`${API_BASE}/access.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    });

    // Il server restituisce JSON (dopo la modifica)
    const data = await response.json();
    if (data.success) {
        return {
            success: true,
            nickname: data.nickname,
            email: data.email,
            isAdmin: data.isAdmin || false
        };
    } else {
        return { success: false, message: data.message || "Credenziali errate" };
    }
}

// ========== REINDIRIZZAMENTO POST-LOGIN ==========
function redirectAfterLogin() {
    const redirectAfterScan = localStorage.getItem('redirectAfterScan');
if (redirectAfterScan) {
    localStorage.removeItem('redirectAfterScan');
    window.location.href = redirectAfterScan;
} else {
    window.location.href = '../HTML/SelezioneDispositivo.html';
}
}

// ========== AZIONE PRINCIPALE: CLICK SUL BOTTONE (Login / Registrati) ==========
registroButton.addEventListener('click', async () => {
    hideError();
    const password = document.getElementById('password').value.trim();

    if (!password) {
        showError('❌ Inserisci la password');
        return;
    }

    // ---- CASO REGISTRAZIONE ----
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

        const result = await registerUser(nickname, email, password);
        if (result.success) {
            showSuccess(result.message);
            // Dopo 2 secondi passa automaticamente alla modalità login
            setTimeout(() => {
                registroToggleLink.click();
            }, 2000);
        } else {
            showError(result.message);
        }
        return;
    }

    // ---- CASO LOGIN ----
    const identifier = document.getElementById('identifier').value.trim();

    // Login speciale per amministratore hardcoded (non va all'API)
    if (identifier === '#admin' && password === 'admin123') {
        localStorage.setItem('currentUser', JSON.stringify({ nickname: '#admin', isAdmin: true }));
        redirectAfterLogin();
        return;
    }

    const result = await loginUser(identifier, password);
    if (result.success) {
        localStorage.setItem('currentUser', JSON.stringify({
            nickname: result.nickname,
            email: result.email,
            isAdmin: result.isAdmin
        }));
        redirectAfterLogin();
    } else {
        showError(result.message || '❌ Credenziali errate');
    }
});

// ========== SUPPORTO TASTO "INVIO" ==========
const allInputs = document.querySelectorAll('input');
allInputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            registroButton.click();
        }
    });
});

// ========== GESTIONE TEMA CHIARO/SCURO ==========
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