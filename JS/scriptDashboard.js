// ============================================================
// FILE: scriptDashboard.js (versione desktop)
// ============================================================
// Dashboard per schermi grandi (desktop/tablet). Gestisce:
// - Modello 3D interattivo del frigorifero (aperto/chiuso)
// - Metriche in tempo reale (temperatura, umidità, stato porta)
// - Grafico storico (Chart.js) con swipe e tab
// - Timeline aperture porta
// - Pannello admin per cambiare ID frigorifero
// - Tema chiaro/scuro e logout

console.log('✅ scriptDashboard.js CARICATO - con verifica GET diretta');

// ---------- VARIABILI GLOBALI ----------
let chart = null;               // Istanza del grafico Chart.js
let currentChartType = 'temperature'; // 'temperature' o 'humidity'
let readingsHistory = [];       // Array storico delle letture
let modelGroup = null, modelClosed = null, modelOpen = null, currentModel = null; // Modelli 3D
let scene = null, camera = null, renderer = null; // Oggetti Three.js
let rotationY = 0;              // Rotazione attuale del modello (in radianti)
let autoRotateSpeed = 0.002;   // Velocità di rotazione automatica
let currentUser = null, currentDeviceId = null; // Utente loggato e ID frigorifero
let modelsReady = false;        // Flag: modelli 3D caricati?
let pendingDoorState = false;   // Stato porta in attesa (se modelli non pronti)

// ---------- OTTIENI ID FRIGORIFERO DALL'URL ----------
const urlParams = new URLSearchParams(window.location.search);
currentDeviceId = urlParams.get('id');
if (!currentDeviceId) {
  console.warn("Nessun ID frigorifero, uso FRG-001");
  currentDeviceId = "FRG-001";
}

// URL delle API (backend Railway)
const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';
const VERIFICA_URL = 'https://phpusersbytolentino-production.up.railway.app/verifica-associazione.php';

// ========== VERIFICA AUTORIZZAZIONE (GET diretta) ==========
// Controlla se l'utente loggato è autorizzato a vedere i dati di questo frigorifero
async function checkAuthorization() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = '../HTML/registro.html';
        return false;
    }
    if (user.isAdmin) return true; // Gli admin vedono tutto

    try {
        // Chiamata GET al server di verifica con userId e fridgeId in query string
        const url = `${VERIFICA_URL}?userId=${encodeURIComponent(user.email)}&fridgeId=${encodeURIComponent(currentDeviceId)}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Risposta verifica:", data);
        if (data.authorized === true) return true;
        
        let errore = data.error || "Non autorizzato";
        alert(`❌ ${errore}\n\nUtente: ${user.email}\nFrigo: ${currentDeviceId}`);
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return false;
    } catch (err) {
        console.error("Errore verifica:", err);
        alert("Errore di connessione al server. Riprova più tardi.");
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return false;
    }
}

// ========== FUNZIONI DI UTILITÀ ==========
// Formatta un oggetto Date in "HH:MM"
function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }); }

// Converte una stringa timestamp in oggetto Date
function parseTimestamp(ts) { return new Date(ts); }

// Processa le letture grezze: normalizza nomi campi, aggiunge +2 ore per fuso orario
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

// Arrotonda a 1 decimale e toglie ".0" se intero
function formatValueWithDecimal(value) {
  const rounded = Math.round(value * 10) / 10;
  const str = rounded.toFixed(1);
  return str.endsWith('.0') ? Math.round(rounded).toString() : str;
}

// Restituisce oggetto con temperatura e umidità formattate
function formatTemperatureHumidity(temp, hum) {
  return { temp: formatValueWithDecimal(temp), hum: formatValueWithDecimal(hum) };
}

// Trova i cambiamenti di stato della porta (aperta/chiusa)
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

// Calcola da quanto tempo la porta è nello stato attuale
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

// Restituisce gli eventi di apertura/chiusura della porta avvenuti oggi
function getTodayEvents(readings) {
  const changes = getDoorStateChanges(readings);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  return changes.filter(ev => ev.timestamp >= today && ev.timestamp < tomorrow)
                .map(ev => ({ time: ev.timestamp.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}), action: ev.changedTo }));
}

// ========== AGGIORNAMENTO UI ==========
// Aggiorna le card metriche (temperatura, umidità, stato porta)
function updateMetrics(readings) {
  if (!readings.length) return;
  const latest = readings[readings.length-1];
  const isOpen = latest.doorOpen;
  // Se i modelli 3D sono pronti, cambia modello (aperto/chiuso)
  if (modelsReady) switchModel(isOpen);
  else pendingDoorState = isOpen;
  const { temp, hum } = formatTemperatureHumidity(latest.temperature, latest.humidity);
  document.getElementById('tempValue').textContent = temp;
  document.getElementById('humidityValue').textContent = hum;
  document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
  document.getElementById('doorCard').classList.toggle('open', isOpen);
  document.getElementById('doorTime').textContent = `${isOpen ? 'Aperta' : 'Chiusa'} da ${getLastStateDuration(readings, isOpen)}`;
}

// Aggiorna il grafico con i dati correnti
function updateChart() {
  if (!chart) return;
  const labels = readingsHistory.map(r => formatTime(r.timestamp));
  const tempData = readingsHistory.map(r => r.temperature);
  const humData = readingsHistory.map(r => r.humidity);
  chart.data.labels = labels;
  chart.data.datasets[0].data = currentChartType === 'temperature' ? tempData : humData;
  chart.data.datasets[0].borderColor = currentChartType === 'temperature' ? '#22c55e' : '#22d3ee';
  chart.data.datasets[0].backgroundColor = currentChartType === 'temperature' ? '#22c55e22' : '#22d3ee22';
  document.getElementById('chartTitle').textContent = currentChartType === 'temperature' ? 'Storico Temperatura' : 'Storico Umidità';
  chart.update('none');
}

// Aggiorna la timeline delle aperture
function updateTimeline() {
  const events = getTodayEvents(readingsHistory);
  const timelineContainer = document.getElementById('timelineEvents');
  if(!timelineContainer) return;
  if(events.length===0){ timelineContainer.innerHTML='<div class="timeline-empty">Nessuna apertura oggi</div>'; return; }
  timelineContainer.innerHTML = `<div class="timeline-events-list">${events.map(ev => `<div class="timeline-event">${ev.time} – ${ev.action === 'aperta' ? '🚪 Aperta' : '🚪 Chiusa'}</div>`).join('')}</div>`;
}

// ========== MOCK DINAMICO (FALLBACK) ==========
// Genera dati fittizi in caso di errore API
function generateDynamicMock(deviceId) {
    console.warn(`⚠️ Utilizzo fallback dinamico per ${deviceId}`);
    const now = Date.now();
    let baseTemp, baseHum;
    if (deviceId === 'FRG-TEMPLATE') { baseTemp = 3.8; baseHum = 48; }
    else { baseTemp = 4.5; baseHum = 42; }
    const variationTemp = (Math.random() - 0.5) * 0.6;
    const variationHum = (Math.random() - 0.5) * 3;
    const doorOpen = (Math.floor(Date.now() / 60000) % 10) < 2;
    return [
        { timestame: new Date(now - 3600000).toISOString(), temperatura: baseTemp - 0.2, umidita: baseHum - 2, portaAperta: false },
        { timestame: new Date(now - 1800000).toISOString(), temperatura: baseTemp + 0.5, umidita: baseHum + 3, portaAperta: true },
        { timestame: new Date(now).toISOString(), temperatura: baseTemp + variationTemp, umidita: baseHum + variationHum, portaAperta: doorOpen }
    ];
}

// Recupera i dati dall'API (o fallback) e aggiorna tutto
async function fetchAndUpdate() {
    console.log(`🔄 Richiesta API per device: ${currentDeviceId}`);
    try {
        const res = await fetch(API_URL, { method: "GET", headers: { "FRIDGE_KEY": currentDeviceId, "Cache-Control": "no-cache" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        let readingsArray = Array.isArray(data) ? data : (data.data || data.readings);
        if (!readingsArray) throw new Error("Formato dati non riconosciuto");
        if (readingsArray[0]?.deviceId) readingsArray = readingsArray.filter(r => r.deviceId === currentDeviceId);
        readingsHistory = processReadings(readingsArray);
        console.log(`✅ Dati API: ${readingsHistory.length} letture`);
    } catch (e) {
        console.error("❌ Errore API, uso fallback:", e);
        readingsHistory = processReadings(generateDynamicMock(currentDeviceId));
    }
    updateMetrics(readingsHistory);
    updateChart();
    updateTimeline();
}

// ========== MODELLO 3D ==========
// Centra il modello nella scena (posizionamento corretto)
function centerModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -center.y, -center.z);
}

// Cambia modello visualizzato (aperto/chiuso)
function switchModel(isOpen) {
  if (!modelsReady) return;
  const targetModel = isOpen ? modelOpen : modelClosed;
  if (currentModel === targetModel) return;
  if (currentModel) modelGroup.remove(currentModel);
  if (targetModel) { modelGroup.add(targetModel); currentModel = targetModel; }
}

// Inizializza la scena 3D con Three.js e carica i modelli GLTF
function init3D() {
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  scene = new THREE.Scene();
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  scene.background = new THREE.Color(isLight ? 0xf8fafc : 0x111111);
  camera = new THREE.PerspectiveCamera(50, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
  camera.position.set(0,1.8,15.0);
  camera.lookAt(0,0,0);
  // Luci
  const ambient = new THREE.AmbientLight(0xffffff,0.8);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff,1.2);
  dirLight.position.set(10,15,10);
  scene.add(dirLight);
  modelGroup = new THREE.Group();
  scene.add(modelGroup);
  const loader = new THREE.GLTFLoader();
  // Carica modello chiuso
  loader.load('../BlenderModels/FRIGO-CHIUSO.glb', gltf => { modelClosed = gltf.scene; modelClosed.scale.set(1.8,1.8,1.8); centerModel(modelClosed); checkModelsReady(); });
  // Carica modello aperto
  loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => { modelOpen = gltf.scene; modelOpen.scale.set(1.8,1.8,1.8); centerModel(modelOpen); checkModelsReady(); });
  // Controlla quando entrambi sono caricati
  function checkModelsReady() { if(modelClosed && modelOpen && !modelsReady){ modelsReady=true; switchModel(pendingDoorState); } }
  // Interazioni mouse per ruotare il modello
  let isDragging=false, prevX=0;
  canvas.addEventListener('mousedown', e => { isDragging=true; prevX=e.clientX; });
  window.addEventListener('mouseup', () => isDragging=false);
  canvas.addEventListener('mousemove', e => { if(!isDragging) return; rotationY += (e.clientX-prevX)*0.008; prevX=e.clientX; });
  // Animazione: rotazione automatica
  function animate(){ requestAnimationFrame(animate); rotationY += autoRotateSpeed; if(modelGroup) modelGroup.rotation.y = rotationY; renderer.render(scene,camera); }
  animate();
  // Ridimensionamento finestra
  window.addEventListener('resize', () => { camera.aspect = canvas.clientWidth/canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight); });
  // Timeout di sicurezza: se i modelli non si caricano entro 5 secondi, forza stato chiuso
  setTimeout(() => {
    if (!modelsReady) { console.warn('⚠️ Modelli 3D non caricati, uso default'); modelsReady=true; switchModel(pendingDoorState); }
  }, 5000);
}

// ========== GRAFICO ==========
// Inizializza Chart.js e osserva i cambiamenti di tema per aggiornare i colori
function initChart() {
  const ctx = document.getElementById('dataChart').getContext('2d');
  chart = new Chart(ctx, {
    type:'line', data:{ labels:[], datasets:[{ data:[], tension:0.3, fill:true, borderWidth:3 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ y:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } }, x:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } } }
    }
  });
  // MutationObserver per cambiare colori del grafico al cambio tema
  const observer = new MutationObserver(() => {
    if(!chart) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    chart.options.scales.y.ticks.color = isLight ? '#111827' : '#ccc';
    chart.options.scales.x.ticks.color = isLight ? '#111827' : '#ccc';
    chart.options.scales.y.grid.color = isLight ? '#cbd5e1' : '#333';
    chart.options.scales.x.grid.color = isLight ? '#cbd5e1' : '#333';
    chart.update();
    if(scene) scene.background = new THREE.Color(isLight ? 0xf8fafc : 0x111111);
  });
  observer.observe(document.documentElement, { attributes:true });
}

// Listener per i tab (Temperatura/Umidità)
function addTabListeners() {
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentChartType = tab.dataset.type;
      updateChart();
    });
  });
}

// Swipe sull'area del grafico per cambiare tipo (utile su touch screen)
function addSwipeListener() {
  const swipeArea = document.getElementById('chartSwipeArea');
  let startX = 0;
  swipeArea.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
  swipeArea.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].screenX;
    if (Math.abs(startX - endX) < 80) return;
    currentChartType = currentChartType === 'temperature' ? 'humidity' : 'temperature';
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.toggle('active', t.dataset.type === currentChartType));
    updateChart();
  });
}

// ========== INIZIALIZZAZIONE PRINCIPALE ==========
async function initAll() {
    // Verifica autorizzazione
    const authorized = await checkAuthorization();
    if (!authorized) return;

    // Carica utente
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // Inizializza componenti
    initChart();
    addTabListeners();
    addSwipeListener();
    init3D();
    fetchAndUpdate();
    setInterval(fetchAndUpdate, 30000); // aggiornamento ogni 30 secondi

    // Tema
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

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '../HTML/registro.html';
    });

    // Pannello admin (solo per utenti admin)
    if (currentUser.isAdmin) {
        document.getElementById('adminPanel').style.display = 'block';
        const selectEl = document.getElementById('adminIdSelect');
        selectEl.innerHTML = '<option value="FRG-001">FRG-001 (Principale)</option><option value="FRG-TEMPLATE">FRG-TEMPLATE (Template di prova)</option>';
        if (currentDeviceId === 'FRG-001' || currentDeviceId === 'FRG-TEMPLATE') selectEl.value = currentDeviceId;
        else selectEl.value = 'FRG-001';
        selectEl.onchange = () => { window.location.href = `../HTML/Dashboard.html?id=${selectEl.value}`; };
    }
}

// Funzione globale logout (richiamabile anche da onclick nell'HTML)
window.logout = function() { localStorage.removeItem('currentUser'); window.location.href = '../HTML/registro.html'; };

// Avvio al caricamento della pagina
window.onload = initAll;