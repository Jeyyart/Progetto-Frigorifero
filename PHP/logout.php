<?php
require_once 'config.php';
session_destroy();
header('Location: ../PHP/registro.php'); // reindirizza al login
exit;
?>