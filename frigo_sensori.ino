#include <DHT.h>                   // Libreria per il sensore DHT (temperatura e umidità)
#include <Wire.h>                  // Libreria per la comunicazione I2C
#include <LiquidCrystal_I2C.h>     // Libreria per il display LCD con interfaccia I2C


// ---------------- PIN ----------------
#define DHTPIN 2                   // Pin collegato al sensore DHT11
#define DHTTYPE DHT11              // Tipo di sensore DHT utilizzato

#define TRIG 9                     // Pin di trigger del sensore ultrasonico (uscita)
#define ECHO 10                    // Pin di echo del sensore ultrasonico (entrata)
#define LED 7                      // Pin collegato al LED per lo stato della porta


// ---------------- COMPONENTI ----------------
DHT dht(DHTPIN, DHTTYPE);          // Creazione oggetto DHT per lettura temperatura/umidità
LiquidCrystal_I2C lcd(0x27, 20, 4); // Inizializzazione display LCD: indirizzo I2C (0x27), 20 colonne, 4 righe


// ---------------- VARIABILI ----------------
float temperatura = 0;             // Variabile che memorizza la temperatura
float umidita = 0;                 // Variabile che memorizza l'umidità
float distanza = 0;                // Distanza letta dal sensore ultrasonico
bool portaAperta = false;          // Stato della porta (true = aperta, false = chiusa)


// ---------------- TEMPI ----------------
unsigned long lastUpdateLCD = 0;   // Timestamp ultimo aggiornamento LCD
unsigned long lastSendBackend = 0; // Timestamp ultimo invio al backend

const unsigned long intervalLCD = 5000;       // 5 secondi tra gli aggiornamenti LCD
const unsigned long intervalBackend = 15000;  // 15 secondi tra gli invii al backend


// ---------------- SETUP ----------------
void setup() {
  Serial.begin(9600);              // Apertura comunicazione seriale a 9600 baud
  dht.begin();                     // Avvio sensore DHT

  pinMode(TRIG, OUTPUT);           // Pin trigger come output
  pinMode(ECHO, INPUT);            // Pin echo come input (riceve il segnale)
  pinMode(LED, OUTPUT);            // LED impostato come output

  lcd.init();                      // Inizializzazione LCD
  lcd.backlight();                 // Attivazione della retroilluminazione

  // Schermata iniziale
  lcd.setCursor(0, 0);
  lcd.print("Benvenuto su");
  lcd.setCursor((20 - 16)/2, 1);   // Centra il testo "Mini Frigo NEXORA" sul display (formula di centratura)
  lcd.print("Mini Frigo NEXORA");
  lcd.setCursor(0, 2);
  lcd.print("Avvio...");
  delay(2000);                     // Pausa di 2 secondi per mostrare la schermata iniziale
  lcd.clear();                     // Pulizia dello schermo LCD
}


// ---------------- LETTURA DISTANZA ----------------
float leggiDistanza() {            // Funzione che calcola la distanza con sensore ultrasonico
  digitalWrite(TRIG, LOW);         // Inizia con impulso basso per resettare il trigger
  delayMicroseconds(2);            // Attesa minima richiesta dal sensore

  digitalWrite(TRIG, HIGH);        // Invia un impulso alto di 10 microsecondi
  delayMicroseconds(10);           // Durata dell'impulso
  
  digitalWrite(TRIG, LOW);         // Riporta il trigger a livello basso

  long durata = pulseIn(ECHO, HIGH); // Legge il tempo che il segnale impiega a tornare (in microsecondi)

  if (durata == 0) return 0;       // Se il sensore non riceve eco, restituisce 0

  return durata * 0.034 / 2;       // Calcola la distanza in cm (velocità del suono: 0.034 cm/µs, diviso 2 per l’andata e ritorno)
}


// ---------------- LOOP ----------------
void loop() {
  unsigned long currentMillis = millis();     // Legge il tempo trascorso dall'avvio del programma (millisecondi)

  // -------- LETTURA SENSORI --------
  temperatura = dht.readTemperature();        // Legge temperatura dal sensore DHT
  umidita = dht.readHumidity();               // Legge umidità dal sensore DHT

  // Controllo di validità delle letture (evita errori se il sensore non risponde)
  if (isnan(temperatura) || isnan(umidita)) {
    temperatura = 0;
    umidita = 0;
  } else {
    temperatura = temperatura - 6;            // Correzione temperatura (offset manuale per calibrazione)
  }

  distanza = leggiDistanza();                 // Misura la distanza effettiva con la funzione dedicata
  portaAperta = distanza > 6;                 // Porta aperta se distanza maggiore di 6 cm
  digitalWrite(LED, portaAperta ? HIGH : LOW);// Accende il LED se porta aperta, lo spegne se chiusa

  // -------- AGGIORNA DISPLAY LCD OGNI 5 SEC --------
  if (currentMillis - lastUpdateLCD >= intervalLCD) {
    lastUpdateLCD = currentMillis;            // Aggiorna tempo di riferimento LCD

    lcd.clear();                              // Pulisce il display prima di ogni aggiornamento

    // Riga 0: titolo centrato
    String titolo = "MINI FRIGO NEXORA";
    lcd.setCursor((20 - titolo.length())/2, 0);  // Calcolo dinamico centratura
    lcd.print(titolo);                        // Stampa titolo

    // Riga 1: temperatura
    lcd.setCursor(0, 1);
    lcd.print("Temperatura: ");
    lcd.print(temperatura, 1);                // Mostra temperatura con una cifra decimale
    lcd.print((char)223);                     // Stampa il simbolo °C (223 è il codice ASCII)

    // Riga 2: umidità
    lcd.setCursor(0, 2);
    lcd.print("Umidita': ");
    lcd.print(umidita, 0);                    // Mostra umidità senza decimali
    lcd.print("%");                           // Aggiunge simbolo percentuale

    // Riga 3: porta
    lcd.setCursor(0, 3);
    lcd.print("Porta: ");
    lcd.print(portaAperta ? "APERTA" : "CHIUSA");  // Mostra stato porta sul display
  }

  // -------- INVIO DATI AL BACKEND OGNI 15 SEC --------
  if (currentMillis - lastSendBackend >= intervalBackend) {
    lastSendBackend = currentMillis;          // Aggiorna timestamp per invio backend

    // Creazione oggetto JSON con i dati rilevati
    String json = "{";
    json += "\"temperatura\":" + String(temperatura, 1) + ",";
    json += "\"umidita\":" + String(umidita, 1) + ",";
    json += "\"portaAperta\":" + String(portaAperta ? "true" : "false");
    json += "}";

    Serial.println(json);                     // Invia il JSON sulla Serial, da leggere lato Node.js
  }
}
