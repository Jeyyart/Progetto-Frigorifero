-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Creato il: Apr 02, 2026 alle 22:58
-- Versione del server: 10.4.32-MariaDB
-- Versione PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `frigorifero`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `assegnazioni`
--

CREATE TABLE `assegnazioni` (
  `nickname` varchar(200) NOT NULL,
  `ID_Prodotto` varchar(9) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `prodotti`
--

CREATE TABLE `prodotti` (
  `ID_Prodotto` varchar(9) NOT NULL,
  `Tipo` varchar(200) NOT NULL,
  `Data_Produzione` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `users`
--

CREATE TABLE `users` (
  `nickname` varchar(200) NOT NULL,
  `Email` varchar(200) NOT NULL,
  `Password` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `assegnazioni`
--
ALTER TABLE `assegnazioni`
  ADD PRIMARY KEY (`nickname`,`ID_Prodotto`),
  ADD KEY `ID_Prodotto` (`ID_Prodotto`);

--
-- Indici per le tabelle `prodotti`
--
ALTER TABLE `prodotti`
  ADD PRIMARY KEY (`ID_Prodotto`);

--
-- Indici per le tabelle `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`nickname`,`Email`);

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `assegnazioni`
--
ALTER TABLE `assegnazioni`
  ADD CONSTRAINT `assegnazioni_ibfk_1` FOREIGN KEY (`ID_Prodotto`) REFERENCES `prodotti` (`ID_Prodotto`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assegnazioni_ibfk_2` FOREIGN KEY (`nickname`) REFERENCES `users` (`nickname`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
