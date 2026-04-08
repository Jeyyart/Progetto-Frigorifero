console.log('✅ scriptDashboard.js CARICATO - layout originale ripristinato');

// ========== VARIABILI GLOBALI ==========
let chart = null;
let currentChartType = 'temperature';
let readingsHistory = [];
let modelGroup = null;
let modelClosed = null;
let modelOpen = null;
let currentModel = null;
let scene = null;
let camera = null;
let renderer = null;
let rotationY = 0;
let autoRotateSpeed = 0.002;
let currentUser = null;
let currentDeviceId = null;
let modelsReady = false;
let pendingDoorState = false;

const urlParams = new URLSearchParams(window.location.search);
currentDeviceId = urlParams.get('id');
if (!currentDeviceId) {
  console.warn("Nessun ID frigorifero specificato, uso FRG-001");
  currentDeviceId = "FRG-001";
}

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

// ========== UTILITÀ (invariate) ==========
function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }); }
function parseTimestamp(ts) { return new Date(ts); }

function processReadings(readings) {
  return readings.map(r => {
    let date = parseTimestamp(r.timestame || r.timestamp);
    date = new Date(date.getTime() + 7200000);
    return {
      timestamp: date,
      temperature: r.temperatura || r.temperature,
      humidity: r.umidita || r.humidity,
      doorOpen: r.portaAperta || r.doorOpen
    };
  });
}

function formatValueWithDecimal(value) {
  const rounded = Math.round(value * 10) / 10;
  const str = rounded.toFixed(1);
  return str.endsWith('.0') ? Math.round(rounded).toString() : str;
}

function formatTemperatureHumidity(temp, hum) {
  return { temp: formatValueWithDecimal(temp), hum: formatValueWithDecimal(hum) };
}

function getDoorStateChanges(readings) {
  const changes = [];
  for (let i = 1; i < readings.length; i++) {
    if (readings[i-1].doorOpen !== readings[i].doorOpen) {
      changes.push({
        timestamp: readings[i].timestamp,
        state: readings[i].doorOpen,
        changedTo: readings[i].doorOpen ? 'aperta' : 'chiusa'
      });
    }
  }
  return changes;
}

function getLastStateDuration(readings, currentState) {
  if (!readings.length) return 'dati non disponibili';
  const changes = getDoorStateChanges(readings);
  let lastChange = changes.findLast(c => c.state === currentState);
  if (!lastChange) lastChange = { timestamp: readings[0].timestamp, state: currentState };
  const diffMs = Date.now() - lastChange.timestamp.getTime();
  const diffHours = Math.floor(diffMs / (1000*60*60));
  const diffMinutes = Math.floor((diffMs % (1000*60*60)) / (1000*60));
  let duration = '';
  if (diffHours > 0) duration += `${diffHours}h `;
  duration += `${diffMinutes}min`;
  return duration;
}

function getTodayEvents(readings) {
  const changes = getDoorStateChanges(readings);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  return changes.filter(ev => ev.timestamp >= today && ev.timestamp < tomorrow)
                .map(ev => ({ time: ev.timestamp.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}), action: ev.changedTo }));
}

function updateMetrics(readings) {
  if (!readings.length) return;
  const latest = readings[readings.length-1];
  const isOpen = latest.doorOpen;

  if (modelsReady) {
    switchModel(isOpen);
  } else {
    pendingDoorState = isOpen;
  }

  const { temp, hum } = formatTemperatureHumidity(latest.temperature, latest.humidity);
  document.getElementById('tempValue').textContent = temp;
  document.getElementById('humidityValue').textContent = hum;
  document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
  document.getElementById('doorCard').classList.toggle('open', isOpen);
  document.getElementById('doorTime').textContent = `${isOpen ? 'Aperta' : 'Chiusa'} da ${getLastStateDuration(readings, isOpen)}`;
}

function updateChart() { /* identico */ }
function updateTimeline() { /* identico */ }
function generateDynamicMock(deviceId) { /* identico */ }
async function fetchAndUpdate() { /* identico */ }
function centerModel(model) { /* identico */ }
function switchModel(isOpen) { /* identico */ }
function init3D() { /* identico */ }
function initChart() { /* identico */ }
function addTabListeners() { /* identico */ }
function addSwipeListener() { /* identico */ }

// ========== INIZIALIZZAZIONE MODIFICATA ==========
function initAll() {
  // Usa la variabile globale currentUser passata da PHP
  currentUser = (typeof window.currentUser !== 'undefined') ? window.currentUser : null;
  if(!currentUser) return window.location.href = '../PHP/registro.php';
  const name = currentUser.nickname || 'Utente';
  document.getElementById('userNameHeader').textContent = name;
  document.getElementById('userNameHeader2').textContent = name;
  document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

  initChart();
  addTabListeners();
  addSwipeListener();
  init3D();
  fetchAndUpdate();
  setInterval(fetchAndUpdate, 30000);

  const themeBtn = document.getElementById('themeToggleBtn');
  let theme = localStorage.getItem('nexoraTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nexoraTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    fetch('../PHP/logout.php', { method: 'POST', credentials: 'include' })
      .then(() => window.location.href = '../PHP/registro.php');
  });

  if (currentUser.isAdmin) {
    document.getElementById('adminPanel').style.display = 'block';
    const selectEl = document.getElementById('adminIdSelect');
    selectEl.innerHTML = `
      <option value="FRG-001">FRG-001 (Principale)</option>
      <option value="FRG-TEMPLATE">FRG-TEMPLATE (Template di prova)</option>
    `;
    if (currentDeviceId === 'FRG-001' || currentDeviceId === 'FRG-TEMPLATE') {
        selectEl.value = currentDeviceId;
    } else {
        selectEl.value = 'FRG-001';
    }
    selectEl.onchange = () => {
        window.location.href = `../PHP/Dashboard.php?id=${selectEl.value}`;
    };
  }
}

window.onload = initAll;