const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const API_URL = "https://fridge-iot-production.up.railway.app/api/addFridgeDetail";

// CAMBIA LA PORTA CON LA TUA
const port = new SerialPort({
    path: "COM5",
    baudRate: 9600
});

const parser = port.pipe(
    new ReadlineParser({ delimiter: "\r\n" })
);

console.log("Arduino collegato. In attesa dati...");

parser.on("data", async (line) => {
    try {
        console.log("Ricevuto da Arduino:", line);

        const dati = JSON.parse(line);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dati)
        });

        const result = await response.text();

        console.log("Inviato al backend");
        console.log("Risposta:", result);

    } catch (error) {
        console.error("Errore:", error.message);
    }
});