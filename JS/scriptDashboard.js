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

// Legge l'ID dalla URL con validazione
const urlParams = new URLSearchParams(window.location.search);
let idParam = urlParams.get('id');
if (!idParam || idParam.trim() === '' || idParam === 'FRG-') {
    console.warn("ID non valido o vuoto, uso FRG-001");
    currentDeviceId = "FRG-001";
} else {
    currentDeviceId = idParam;
}
console.log("Device ID utilizzato:", currentDeviceId);

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

// ========== UTILITÀ ==========
function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }); }
function parseTimestamp(ts) { return new Date(ts); }

function processReadings(readings) {
  return readings.map(r => {
    let date = parseTimestamp(r.timestame || r.timestamp);
    // Aggiunge 2 ore ai timestamp ricevuti
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

// ========== AGGIORNAMENTO UI ==========
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

function updateTimeline() {
  const events = getTodayEvents(readingsHistory);
  const timelineContainer = document.getElementById('timelineEvents');
  if(!timelineContainer) return;
  if(events.length===0){ timelineContainer.innerHTML='<div class="timeline-empty">Nessuna apertura oggi</div>'; return; }
  timelineContainer.innerHTML = `<div class="timeline-events-list">${events.map(ev => `<div class="timeline-event">${ev.time} – ${ev.action === 'aperta' ? '🚪 Aperta' : '🚪 Chiusa'}</div>`).join('')}</div>`;
}

// ========== GENERAZIONE MOCK DINAMICO (SOLO FALLBACK) ==========
function generateDynamicMock(deviceId) {
    console.warn(`⚠️ Utilizzo fallback dinamico per ${deviceId} (API non disponibile)`);
    const now = Date.now();
    let baseTemp, baseHum;
    if (deviceId === 'FRG-TEMPLATE') {
        baseTemp = 3.8;
        baseHum = 48;
    } else {
        baseTemp = 4.5;
        baseHum = 42;
    }
    const variationTemp = (Math.random() - 0.5) * 0.6;
    const variationHum = (Math.random() - 0.5) * 3;
    const doorOpen = (Math.floor(Date.now() / 60000) % 10) < 2;

    return [
        { timestame: new Date(now - 3600000).toISOString(), temperatura: baseTemp - 0.2, umidita: baseHum - 2, portaAperta: false },
        { timestame: new Date(now - 1800000).toISOString(), temperatura: baseTemp + 0.5, umidita: baseHum + 3, portaAperta: true },
        { timestame: new Date(now).toISOString(), temperatura: baseTemp + variationTemp, umidita: baseHum + variationHum, portaAperta: doorOpen }
    ];
}

// ========== CHIAMATA API ==========
async function fetchAndUpdate() {
    console.log(`🔄 Richiesta API per device: ${currentDeviceId}`);
    try {
        const res = await fetch(API_URL, {
            method: "GET",
            headers: {
                "FRIDGE_KEY": currentDeviceId,
                "Cache-Control": "no-cache"
            }
        });

        console.log(`📡 Status: ${res.status}`);

        if (res.status === 403) {
            console.error("❌ API Key non valida o non autorizzata. Verifica che l'ID frigorifero sia corretto.");
            // Mostra un messaggio nell'interfaccia (opzionale)
            const errorDiv = document.getElementById('apiErrorMsg') || (() => {
                let div = document.createElement('div');
                div.id = 'apiErrorMsg';
                div.style.cssText = 'background: #ef4444; color: white; padding: 10px; border-radius: 8px; margin: 10px 0; text-align: center;';
                document.querySelector('.DashboardContent')?.prepend(div);
                return div;
            })();
            errorDiv.textContent = `⚠️ Errore di connessione: ID "${currentDeviceId}" non autorizzato. Usa un ID valido (es. FRG-001).`;
            errorDiv.style.display = 'block';
            // Usa fallback dinamico
            readingsHistory = processReadings(generateDynamicMock(currentDeviceId));
            updateMetrics(readingsHistory);
            updateChart();
            updateTimeline();
            return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let data = await res.json();
        let readingsArray = Array.isArray(data) ? data : (data.data || data.readings);
        if (!readingsArray) throw new Error("Formato dati non riconosciuto");

        if (readingsArray[0]?.deviceId) {
            readingsArray = readingsArray.filter(r => r.deviceId === currentDeviceId);
        }

        readingsHistory = processReadings(readingsArray);
        console.log(`✅ Dati API ricevuti: ${readingsHistory.length} letture`);
        // Nascondi eventuale messaggio di errore
        const errorDiv = document.getElementById('apiErrorMsg');
        if (errorDiv) errorDiv.style.display = 'none';
    } catch (e) {
        console.error("❌ Errore API, uso fallback dinamico:", e);
        readingsHistory = processReadings(generateDynamicMock(currentDeviceId));
    }
    updateMetrics(readingsHistory);
    updateChart();
    updateTimeline();
}

// ========== MODELLO 3D ==========
function centerModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -center.y, -center.z);
}

function switchModel(isOpen) {
  if (!modelsReady) return;
  const targetModel = isOpen ? modelOpen : modelClosed;
  if (currentModel === targetModel) return;
  if (currentModel) modelGroup.remove(currentModel);
  if (targetModel) { modelGroup.add(targetModel); currentModel = targetModel; }
}

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
  const ambient = new THREE.AmbientLight(0xffffff,0.8);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff,1.2);
  dirLight.position.set(10,15,10);
  scene.add(dirLight);
  modelGroup = new THREE.Group();
  scene.add(modelGroup);
  const loader = new THREE.GLTFLoader();
  loader.load('../BlenderModels/FRIGO-CHIUSO.glb', gltf => { modelClosed = gltf.scene; modelClosed.scale.set(1.8,1.8,1.8); centerModel(modelClosed); checkModelsReady(); });
  loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => { modelOpen = gltf.scene; modelOpen.scale.set(1.8,1.8,1.8); centerModel(modelOpen); checkModelsReady(); });
  function checkModelsReady() { if(modelClosed && modelOpen && !modelsReady){ modelsReady=true; switchModel(pendingDoorState); } }
  let isDragging=false, prevX=0;
  canvas.addEventListener('mousedown', e => { isDragging=true; prevX=e.clientX; });
  window.addEventListener('mouseup', () => isDragging=false);
  canvas.addEventListener('mousemove', e => { if(!isDragging) return; rotationY += (e.clientX-prevX)*0.008; prevX=e.clientX; });
  function animate(){ requestAnimationFrame(animate); rotationY += autoRotateSpeed; if(modelGroup) modelGroup.rotation.y = rotationY; renderer.render(scene,camera); }
  animate();
  window.addEventListener('resize', () => { camera.aspect = canvas.clientWidth/canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight); });
  setTimeout(() => {
    if (!modelsReady) {
        console.warn('⚠️ Modelli 3D non caricati entro 5 secondi. Uso modello chiuso di default.');
        modelsReady = true;
        switchModel(pendingDoorState);
    }
  }, 5000);
}

function initChart() {
  const ctx = document.getElementById('dataChart').getContext('2d');
  chart = new Chart(ctx, {
    type:'line', data:{ labels:[], datasets:[{ data:[], tension:0.3, fill:true, borderWidth:3 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ y:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } }, x:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } } }
    }
  });
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

// ========== INIZIALIZZAZIONE ==========
function initAll() {
  currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if(!currentUser) return window.location.href = '../HTML/registro.html';
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

  document.getElementById('logoutBtn').addEventListener('click', window.logout);

  if (currentUser.isAdmin) {
    document.getElementById('adminPanel').style.display = 'block';
    const selectEl = document.getElementById('adminIdSelect');
    selectEl.innerHTML = `<option value="FRG-001">FRG-001 (Principale)</option><option value="FRG-TEMPLATE">FRG-TEMPLATE (Template di prova)</option>`;
    if (currentDeviceId === 'FRG-001' || currentDeviceId === 'FRG-TEMPLATE') selectEl.value = currentDeviceId;
    else selectEl.value = 'FRG-001';
    window.switchDeviceId = function(id) { currentDeviceId = id; fetchAndUpdate(); };
    selectEl.onchange = () => window.switchDeviceId(selectEl.value);
  }
}

window.logout = function() { localStorage.removeItem('currentUser'); window.location.href = '../HTML/registro.html'; };
window.onload = initAll;