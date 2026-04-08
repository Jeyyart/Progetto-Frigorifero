#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ---------------- PIN ----------------
#define DHTPIN 2
#define DHTTYPE DHT11

#define TRIG 9
#define ECHO 10
#define LED 7

// ---------------- COMPONENTI ----------------
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 20, 4); // 20x4 LCD

// ---------------- VARIABILI ----------------
float temperatura = 0;
float umidita = 0;
float distanza = 0;
bool portaAperta = false;

// ---------------- TEMPI ----------------
unsigned long lastUpdateLCD = 0;
unsigned long lastSendBackend = 0;

const unsigned long intervalLCD = 5000;       // 5 secondo
const unsigned long intervalBackend = 15000;  // 15 secondi

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(9600);
  dht.begin();

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED, OUTPUT);

  lcd.init();
  lcd.backlight();

  // Schermata iniziale
  lcd.setCursor(0, 0);
  lcd.print("Benvenuto su");
  lcd.setCursor((20 - 16)/2, 1); // centrare "Mini Frigo NEXORA"
  lcd.print("Mini Frigo NEXORA");
  lcd.setCursor(0, 2);
  lcd.print("Avvio...");
  delay(2000);
  lcd.clear();
}

// ---------------- LETTURA DISTANZA ----------------
float leggiDistanza() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG, LOW);

  long durata = pulseIn(ECHO, HIGH);

  if (durata == 0) return 0;

  return durata * 0.034 / 2;
}

// ---------------- LOOP ----------------
void loop() {
  unsigned long currentMillis = millis();

  // -------- LETTURA SENSORI --------
  temperatura = dht.readTemperature();
  umidita = dht.readHumidity();

  if (isnan(temperatura) || isnan(umidita)) {
    temperatura = 0;
    umidita = 0;
  } else {
    temperatura = temperatura - 6;
  }

  distanza = leggiDistanza();
  portaAperta = distanza > 6;
  digitalWrite(LED, portaAperta ? HIGH : LOW);

  // -------- AGGIORNA DISPLAY LCD OGNI 1 SEC --------
  if (currentMillis - lastUpdateLCD >= intervalLCD) {
    lastUpdateLCD = currentMillis;

    lcd.clear();

    // Riga 0: titolo centrato
    String titolo = "MINI FRIGO NEXORA";
    lcd.setCursor((20 - titolo.length())/2, 0);
    lcd.print(titolo);

    // Riga 1: temperatura
    lcd.setCursor(0, 1);
    lcd.print("Temperatura: ");
    lcd.print(temperatura, 1);
    lcd.print((char)223); // simbolo °C

    // Riga 2: umidità
    lcd.setCursor(0, 2);
    lcd.print("Umidita': ");
    lcd.print(umidita, 0);
    lcd.print("%");

    // Riga 3: porta
    lcd.setCursor(0, 3);
    lcd.print("Porta: ");
    lcd.print(portaAperta ? "APERTA" : "CHIUSA");
  }

  // -------- INVIO DATI AL BACKEND OGNI 30 SEC --------
  if (currentMillis - lastSendBackend >= intervalBackend) {
    lastSendBackend = currentMillis;

    String json = "{";
    json += "\"temperatura\":" + String(temperatura, 1) + ",";
    json += "\"umidita\":" + String(umidita, 1) + ",";
    json += "\"portaAperta\":" + String(portaAperta ? "true" : "false");
    json += "}";

    Serial.println(json); // Node.js leggerà questa riga
  }
}