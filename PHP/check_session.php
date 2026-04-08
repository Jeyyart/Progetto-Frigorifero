<?php
header('Content-Type: application/json');
require_once 'config.php';

if (isset($_SESSION['user'])) {
    echo json_encode(['loggedIn' => true, 'user' => $_SESSION['user']]);
} else {
    echo json_encode(['loggedIn' => false]);
}
?>