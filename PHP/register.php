<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$nickname = trim($data['nickname'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$nickname || !$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'Dati mancanti']);
    exit;
}

// Validazioni lato server (uguali a quelle lato client)
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/\.(com|it|net|org|eu)$/i', $email)) {
    echo json_encode(['success' => false, 'message' => 'Email non valida']);
    exit;
}
if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
    echo json_encode(['success' => false, 'message' => 'Password troppo debole (min 8 caratteri, maiuscola + numero)']);
    exit;
}

// Controlla se nickname o email esistono già
$stmt = $pdo->prepare("SELECT nickname, Email FROM users WHERE nickname = ? OR Email = ?");
$stmt->execute([$nickname, $email]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Nickname o email già in uso']);
    exit;
}

// Hash della password
$hashed = password_hash($password, PASSWORD_DEFAULT);

// Inserisci nuovo utente
$stmt = $pdo->prepare("INSERT INTO users (nickname, Email, Password) VALUES (?, ?, ?)");
if ($stmt->execute([$nickname, $email, $hashed])) {
    echo json_encode(['success' => true, 'message' => 'Account creato con successo']);
} else {
    echo json_encode(['success' => false, 'message' => 'Errore durante la registrazione']);
}
?>