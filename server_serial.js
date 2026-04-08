const { SerialPort } = require("serialport");               // Importa la libreria per comunicare con la porta seriale (dove è collegato Arduino)
const { ReadlineParser } = require("@serialport/parser-readline"); // Importa il parser che divide i dati ricevuti riga per riga (\r\n)

const API_URL = "https://fridge-iot-production.up.railway.app/api/addFridgeDetail"; // URL dell'API del backend a cui inviare i dati letti da Arduino

const port = new SerialPort({
    path: "COM5",                                            // Porta seriale dove è connesso Arduino (va modificata in base al PC)
    baudRate: 9600                                           // Velocità di comunicazione seriale (deve coincidere con Serial.begin(9600))
});

const parser = port.pipe(                                   // Collega un parser alla porta seriale
    new ReadlineParser({ delimiter: "\r\n" })               // Divide i messaggi in base all'invio di una nuova riga (\r\n)
);

console.log("Arduino collegato. In attesa dati...");        // Messaggio di conferma visualizzato nel terminale all’avvio

parser.on("data", async (line) => {                         // Evento: viene eseguito ogni volta che Arduino invia una riga di dati
    try {
        console.log("Ricevuto da Arduino:", line);           // Mostra nel terminale il messaggio ricevuto da Arduino (formato JSON)

        const dati = JSON.parse(line);                       // Converte la riga di testo ricevuta in un oggetto JavaScript (interpretando il JSON)

        const response = await fetch(API_URL, {              // Invia i dati al backend tramite una richiesta HTTP POST
            method: "POST",
            headers: {
                "Content-Type": "application/json"           // Specifica che il formato dei dati inviati è JSON
            },
            body: JSON.stringify(dati)                       // Converte l’oggetto "dati" in stringa JSON per inviarlo nel corpo della richiesta
        });

        const result = await response.text();                // Attende e legge la risposta del server come testo

        console.log("Inviato al backend");                   // Conferma che i dati sono stati inviati correttamente
        console.log("Risposta:", result);                    // Mostra nel terminale cosa ha risposto il server (ad es. “OK” o messaggi di log)

    } catch (error) {
        console.error("Errore:", error.message);             // Se avviene un errore (formato JSON errato, connessione persa ecc.) lo comunica nel terminale
    }
});
