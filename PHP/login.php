<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$identifier = trim($data['identifier'] ?? '');
$password   = $data['password'] ?? '';

if (!$identifier || !$password) {
    echo json_encode(['success' => false, 'message' => 'Credenziali incomplete']);
    exit;
}

// Cerca l'utente per nickname o email
$stmt = $pdo->prepare("SELECT nickname, Email, Password FROM users WHERE nickname = ? OR Email = ?");
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Dopo aver verificato le credenziali dell'utente dal database
if ($user && password_verify($password, $user['Password'])) {
    $isAdmin = ($user['nickname'] === 'admin');   // <- aggiungi questa riga
    $_SESSION['user'] = [
        'nickname' => $user['nickname'],
        'email'    => $user['Email'],
        'isAdmin'  => $isAdmin                     // <- ora admin avrà isAdmin = true
    ];
    echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
    exit;
} else {
    // Controllo login admin hardcoded (opzionale)
    if ($identifier === '#admin' && $password === 'admin123') {
        $_SESSION['user'] = [
            'nickname' => '#admin',
            'email'    => 'admin@nexora.local',
            'isAdmin'  => true
        ];
        echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Credenziali errate']);
    }
}
?>