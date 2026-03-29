let isLoginMode = true;

const registroButton = document.getElementById('registroButton');
const registroToggleLink = document.getElementById('registroToggleLink');
const registroConfirmGroup = document.getElementById('registroConfirmPasswordGroup');
const registroSubtitle = document.getElementById('registroSubtitle');
const registroToggleText = document.getElementById('registroToggleText');

// Configurazione database (mock)
const DB_LOGIN_URL    = 'https://TUO-ENDPOINT.com/api/login';
const DB_REGISTER_URL = 'https://TUO-ENDPOINT.com/api/register';

registroToggleLink.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        registroButton.textContent = 'Accedi';
        registroSubtitle.textContent = 'Accedi al tuo sistema di monitoraggio';
        registroToggleText.textContent = 'Non hai un account? ';
        registroToggleLink.textContent = 'Registrati';
        registroConfirmGroup.style.display = 'none';
    } else {
        registroButton.textContent = 'Registrati';
        registroSubtitle.textContent = 'Crea il tuo account';
        registroToggleText.textContent = 'Hai già un account? ';
        registroToggleLink.textContent = 'Accedi';
        registroConfirmGroup.style.display = 'block';
    }
});

registroButton.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Compila tutti i campi');
        return;
    }
    if (!isLoginMode) {
        const confirm = document.getElementById('confirmPassword').value;
        if (password !== confirm) {
            alert('Le password non coincidono');
            return;
        }
    }

    const endpoint = isLoginMode ? DB_LOGIN_URL : DB_REGISTER_URL;

    if (endpoint.includes('TUO-ENDPOINT.com')) {
        console.log('✅ Modalità test → redirect a selezione dispositivo');
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return;
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            window.location.href = '../HTML/SelezioneDispositivo.html';
        } else {
            alert('Errore dal server');
        }
    } catch (err) {
        console.warn('⚠️ Modalità test attiva');
        window.location.href = '../HTML/SelezioneDispositivo.html';
    }
});