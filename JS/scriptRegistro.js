// VARIABILE GLOBALE: true = modalità login, false = modalità registrazione
let isLoginMode = true;
// Carica gli utenti salvati dal localStorage oppure array vuoto
let usersDB = JSON.parse(localStorage.getItem('nexoraUsers')) || [];

// UTENTI DI DEFAULT (per test veloci)
const defaultUsers = [
    { email: "a@a.com", nickname: "J", password: "Jeremias1" },
    { email: "debug@frigo.it", nickname: "Debug", password: "Debug123" }
];

// Aggiunge gli utenti di default se non esistono già (evita duplicati)
defaultUsers.forEach(user => {
    if (!usersDB.find(u => u.email === user.email)) usersDB.push(user);
});
// Salva nuovamente nel localStorage
localStorage.setItem('nexoraUsers', JSON.stringify(usersDB));

// Riferimenti agli elementi HTML (selettori)
const registroButton = document.getElementById('registroButton');
const registroToggleLink = document.getElementById('registroToggleLink');
const registroConfirmGroup = document.getElementById('registroConfirmPasswordGroup');
const registroSubtitle = document.getElementById('registroSubtitle');
const registroToggleText = document.getElementById('registroToggleText');
const nicknameGroup = document.getElementById('nicknameGroup');
const emailGroup = document.getElementById('emailGroup');
const loginIdentifierGroup = document.getElementById('loginIdentifierGroup');
let successTimeout = null;

// ========== FUNZIONI PER LA GESTIONE DEGLI ERRORI ==========
// Mostra un messaggio di errore rosso nel div dedicato
function showError(message) {
    const errorEl = document.getElementById('errorContainer');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}
// Nasconde il messaggio di errore
function hideError() {
    const errorEl = document.getElementById('errorContainer');
    errorEl.style.display = 'none';
}

// ========== FUNZIONI DI VALIDAZIONE ==========
// Controlla se l'email ha un formato valido (deve finire con .com, .it, .net, .org, .eu)
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.(com|it|net|org|eu)$/i.test(email);
}
// Controlla che la password sia abbastanza forte: almeno 8 caratteri, una maiuscola e un numero
function validatePassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

// ========== SWITCH TRA LOGIN E REGISTRAZIONE ==========
registroToggleLink.addEventListener('click', () => {
    hideError();                       // pulisce eventuali errori precedenti
    isLoginMode = !isLoginMode;       // inverte la modalità

    if (isLoginMode) {
        // MODALITÀ LOGIN
        registroButton.textContent = 'Accedi';
        registroSubtitle.textContent = 'Accedi al tuo sistema di monitoraggio';
        registroToggleText.textContent = 'Non hai un account? ';
        registroToggleLink.textContent = 'Registrati';
        // Nasconde i campi extra della registrazione
        registroConfirmGroup.style.display = 'none';
        nicknameGroup.style.display = 'none';
        emailGroup.style.display = 'none';
        // Mostra il campo "Email o Nickname"
        loginIdentifierGroup.style.display = 'block';
    } else {
        // MODALITÀ REGISTRAZIONE
        registroButton.textContent = 'Registrati';
        registroSubtitle.textContent = 'Crea il tuo account NEXORA';
        registroToggleText.textContent = 'Hai già un account? ';
        registroToggleLink.textContent = 'Accedi';
        // Mostra i campi per nickname, email e conferma password
        registroConfirmGroup.style.display = 'block';
        nicknameGroup.style.display = 'block';
        emailGroup.style.display = 'block';
        loginIdentifierGroup.style.display = 'none';
        // Assicura l'ordine visivo: nickname sopra email
        nicknameGroup.parentNode.insertBefore(nicknameGroup, emailGroup);
    }
});

// ========== AZIONE PRINCIPALE: CLICK SUL BOTTONE (Login / Registrati) ==========
registroButton.addEventListener('click', () => {
    hideError();   // pulisce errori precedenti
    const password = document.getElementById('password').value.trim();

    // Controllo base: password non vuota
    if (!password) {
        showError('❌ Inserisci la password');
        return;
    }

    // ---- CASO REGISTRAZIONE ----
    if (!isLoginMode) {
        const nickname = document.getElementById('nickname').value.trim();
        const email = document.getElementById('email').value.trim();
        const confirm = document.getElementById('confirmPassword').value.trim();

        // Validazioni successive
        if (!nickname) { showError('❌ Inserisci un nickname'); return; }
        if (!email || !validateEmail(email)) { showError('❌ Email non valida'); return; }
        if (password !== confirm) { showError('❌ Le password non coincidono'); return; }
        if (!validatePassword(password)) { 
            showError('❌ Password troppo debole (min 8 caratteri, maiuscola + numero)'); 
            return; 
        }

        // Controllo se email o nickname sono già usati
        if (usersDB.find(u => u.email === email || u.nickname === nickname)) {
            showError('❌ Email o nickname già in uso'); 
            return;
        }

        

        function resetMessageStyle() {
            const errorEl = document.getElementById('errorContainer');
            errorEl.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            errorEl.style.borderColor = '#ef4444';
            errorEl.style.color = '#ef4444';
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
                resetMessageStyle();
            }, 4000);
        }

        // Salva il nuovo utente
        usersDB.push({ email, nickname, password });
        localStorage.setItem('nexoraUsers', JSON.stringify(usersDB));
        showSuccess('✅ Account creato con successo!');
        setTimeout(() => {
            registroToggleLink.click();
        }, 2000);
        return;
        // Torna automaticamente alla schermata di login
        registroToggleLink.click();
        return;
    }

    // ---- CASO LOGIN ----
    const identifier = document.getElementById('identifier').value.trim();
    // Cerca un utente che corrisponda per email O nickname E che abbia la stessa password
    const user = usersDB.find(u => 
        (u.email === identifier || u.nickname === identifier) && u.password === password
    );

    if (user) {
        // Login normale: salva l'utente corrente (senza flag admin)
        localStorage.setItem('currentUser', JSON.stringify({ 
            nickname: user.nickname, 
            email: user.email, 
            isAdmin: false 
        }));
        // Reindirizza alla pagina di selezione dispositivo
        window.location.href = '../HTML/SelezioneDispositivo.html';
    } 
    // Login speciale per l'amministratore (credenziali hardcoded)
    else if (identifier === '#admin' && password === 'admin123') {
        localStorage.setItem('currentUser', JSON.stringify({ nickname: '#admin', isAdmin: true }));
        window.location.href = '../HTML/SelezioneDispositivo.html';
    } 
    else {
        showError('❌ Credenziali errate');
    }
});

// ========== SUPPORTO TASTO "INVIO" ==========
// Permette di inviare il form premendo Invio in qualsiasi campo input
const allInputs = document.querySelectorAll('input');
allInputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();   // evita comportamenti indesiderati
            registroButton.click();  // simula il click sul bottone principale
        }
    });
});

// ========== GESTIONE TEMA CHIARO/SCURO (persistente) ==========
const themeBtn = document.getElementById('themeToggleBtn');
// Legge il tema salvato o imposta 'dark' come default
let theme = localStorage.getItem('nexoraTheme') || 'dark';
// Applica il tema all'elemento radice (<html>) tramite attributo data-theme
document.documentElement.setAttribute('data-theme', theme);
// Imposta l'emoji del pulsante in base al tema corrente
themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';

themeBtn.addEventListener('click', () => {
    // Cambia tema alternando 'dark' e 'light'
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nexoraTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
});