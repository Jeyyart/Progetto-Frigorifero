<?php
session_start(); // avvia la sessione per tutte le pagine che lo includono

$host = 'localhost';
$dbname = 'frigorifero';
$username = 'root';      // cambia con il tuo user MySQL
$password = '';          // cambia con la tua password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Errore di connessione: " . $e->getMessage());
}
?>