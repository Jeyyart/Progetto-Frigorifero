<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXORA Smart Fridge - Accedi</title>
    <link rel="stylesheet" href="../CSS/styleRegistro.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="../IMG/logo.png">
    <script src="../JS/scriptRegistro.js" defer></script>
</head>
<body>
    <div class="global-logo">
        <img src="../IMG/logo.png" alt="NEXORA" class="logo-img">
        <h1>NEXORA Smart Fridge</h1>
    </div>
    <button id="themeToggleBtn" class="theme-toggle-global">☀️</button>
    <div class="containerRegistro">
        <div class="registroHeader">
            <h2 id="registroSubtitle">Accedi al tuo sistema di monitoraggio</h2>
        </div>
        <div id="errorContainer" class="error-message" style="display:none;"></div>
        <div class="registroForm">
            <div class="RegistroForm" id="loginIdentifierGroup">
                <label for="identifier">Email o Nickname</label>
                <input type="text" id="identifier" placeholder="Esempio@email.com o Nickname" required>
            </div>
            <div class="RegistroForm" id="nicknameGroup" style="display:none;">
                <label for="nickname">Nickname</label>
                <input type="text" id="nickname" placeholder="Il tuo nome">
            </div>
            <div class="RegistroForm" id="emailGroup" style="display:none;">
                <label for="email">Email</label>
                <input type="text" id="email" placeholder="tua@email.com">
            </div>
            <div class="RegistroForm">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="••••••••" required>
            </div>
            <div class="RegistroForm" id="registroConfirmPasswordGroup" style="display:none;">
                <label for="confirmPassword">Conferma Password</label>
                <input type="password" id="confirmPassword" placeholder="••••••••">
            </div>
            <button id="registroButton" class="registroButton">Accedi</button>
            <div class="registroToggle">
                <span id="registroToggleText">Non hai un account? </span>
                <a id="registroToggleLink">Registrati</a>
            </div>
        </div>
    </div>
</body>
</html>