async function checkAuthorization() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = '../HTML/registro.html';
        return false;
    }
    if (user.isAdmin) return true;

    // LOG: mostriamo cosa stiamo inviando
    console.log("Verifica autorizzazione per:", user.email, "fridge:", currentDeviceId);

    try {
        const url = `${PROXY_URL}?userId=${encodeURIComponent(user.email)}&fridgeId=${encodeURIComponent(currentDeviceId)}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Risposta API verifica:", data);   // <-- fondamentale

        if (data.authorized === true) return true;
        
        // Mostra il messaggio specifico restituito dall'API
        let errore = data.error || "Non autorizzato";
        alert(`❌ ${errore}\n\nUserId inviato: ${user.email}\nFrigo: ${currentDeviceId}`);
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return false;
    } catch (err) {
        console.error("Errore verifica:", err);
        alert("Errore di connessione al server. Riprova più tardi.");
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return false;
    }
}