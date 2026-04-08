<?php
require_once 'config.php';

echo "<pre>";

// 1. Inserisci i prodotti se non esistono
$stmt = $pdo->prepare("INSERT IGNORE INTO prodotti (ID_Prodotto, Tipo, Data_Produzione) VALUES 
    ('FRG-001', 'Frigorifero principale', '2024-01-01'),
    ('FRG-TEMPLATE', 'Frigorifero template di prova', '2024-01-01')");
$stmt->execute();
echo "✅ Prodotti inseriti (se non esistevano).\n";

// 2. Controlla se l'utente admin esiste già
$stmt = $pdo->prepare("SELECT nickname FROM users WHERE nickname = 'admin'");
$stmt->execute();
if (!$stmt->fetch()) {
    // Hash della password 'admin123'
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (nickname, Email, Password) VALUES ('admin', 'admin@nexora.local', ?)");
    $stmt->execute([$hash]);
    echo "✅ Utente 'admin' creato con password 'admin123'.\n";
} else {
    echo "ℹ️ L'utente 'admin' esiste già.\n";
}

// 3. Assegna i frigoriferi all'utente admin (tabella assegnazioni)
$stmt = $pdo->prepare("INSERT IGNORE INTO assegnazioni (nickname, ID_Prodotto) VALUES 
    ('admin', 'FRG-001'),
    ('admin', 'FRG-TEMPLATE')");
$stmt->execute();
echo "✅ Assegnazioni completate: admin → FRG-001, FRG-TEMPLATE.\n";

echo "</pre>";
?>