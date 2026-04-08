<?php
require_once '../PHP/config.php';
if (!isset($_SESSION['user'])) {
    header('Location: registro.php');
    exit;
}
$currentUser = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>NEXORA Smart Fridge - Connetti Frigorifero</title>
    <link rel="stylesheet" href="../CSS/styleConnetti.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="../IMG/logo.png">
    <script>
        const currentUser = <?php echo json_encode($currentUser); ?>;
    </script>
    <script src="../JS/scriptConnetti.js" defer></script>
</head>
<body>
    <div class="containerSito">
        <div class="header">
            <div class="header-left">
                <div class="logo-placeholder">
                    <img src="../IMG/logo.png" alt="NEXORA" class="logo-img">
                    <h1>NEXORA Smart Fridge</h1>
                </div>
            </div>
            <div class="header-right">
                <button id="themeToggleBtn" class="theme-toggle-global">☀️</button>
                <button onclick="logout()" class="logout-btn">ESCI</button>
                <div id="userDisplay" class="user-display">👤 <span id="userNameHeader"></span></div>
            </div>
        </div>
        <p id="greetingText" class="greeting">Ciao <span id="userNameHeader2"></span>, collega il tuo frigorifero</p>
        <h1 class="page-title">Connetti al tuo Frigorifero</h1>
        <div class="connect-container">
            <div class="connect-card">
                <h2>📱 Scansiona dal telefono</h2>
                <p>Usa la fotocamera del tuo telefono per connetterti</p>
                <div class="qr-wrapper">
                    <img id="qrImage" src="../IMG/QRSitoTelefono.png" alt="QR Code" class="qr-code-img">
                    <p class="qr-hint">Scansiona questo QR con il telefono</p>
                </div>
            </div>
            <div class="connect-card">
                <h2>🔢 Inserisci ID</h2>
                <p>Non riesci a usare il QR?</p>
                <div id="errorContainer" class="error-message" style="display:none;"></div>
                <br>
                <input type="text" id="deviceId" placeholder="ID del frigorifero (es. FRG-987654)" class="manual-input">
                <button onclick="connectManual()" class="registroButton">Connetti</button>
            </div>
        </div>
    </div>
</body>
</html>