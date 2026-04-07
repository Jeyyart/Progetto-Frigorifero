console.log('Dashboard Mobile caricata');

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
let modelsLoaded = false;
let pendingDoorState = false;
let targetCameraZ = 24.0;
const closedCameraZ = 18.0;
const openCameraZ = 23.0;
const cameraY = 2.2;
const modelYOffset = 1.4;

// Legge l'ID dalla URL, se assente o non valido usa FRG-001
const urlParams = new URLSearchParams(window.location.search);
let idParam = urlParams.get('id');
if (!idParam || !idParam.startsWith('FRG-')) {
  console.warn(`ID non valido o mancante: "${idParam}". Uso FRG-001 come default.`);
  currentDeviceId = "FRG-001";
} else {
  currentDeviceId = idParam;
}

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

// ========== FUNZIONI DI UTILITÀ ==========
function formatTime(date) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
function parseTimestamp(ts) {
    return new Date(ts);
}

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
    return {
        temp: formatValueWithDecimal(temp),
        hum: formatValueWithDecimal(hum)
    };
}

function getDoorStateChanges(readings) {
    const changes = [];
    for (let i = 1; i < readings.length; i++) {
        const prev = readings[i-1];
        const curr = readings[i];
        if (prev.doorOpen !== curr.doorOpen) {
            changes.push({
                timestamp: curr.timestamp,
                state: curr.doorOpen,
                changedTo: curr.doorOpen ? 'aperta' : 'chiusa'
            });
        }
    }
    return changes;
}

function getLastStateDuration(readings, currentState) {
    if (readings.length === 0) return 'dati non disponibili';
    const changes = getDoorStateChanges(readings);
    let lastChange = null;
    for (let i = changes.length-1; i >= 0; i--) {
        if (changes[i].state === currentState) {
            lastChange = changes[i];
            break;
        }
    }
    if (!lastChange) {
        lastChange = { timestamp: readings[0].timestamp, state: currentState };
    }
    const diffMs = Date.now() - lastChange.timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    let duration = '';
    if (diffHours > 0) duration += `${diffHours}h `;
    duration += `${diffMinutes}min`;
    return duration;
}

function getTodayEvents(readings) {
    const changes = getDoorStateChanges(readings);
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return changes.filter(ev => ev.timestamp >= today && ev.timestamp < tomorrow)
                  .map(ev => ({
                      time: ev.timestamp.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }),
                      action: ev.changedTo
                  }));
}

// ========== AGGIORNAMENTO METRICHE E MODELLO ==========
function updateMetrics(readings) {
    if (!readings.length) return;
    const latest = readings[readings.length - 1];
    const isOpen = latest.doorOpen;

    if (modelsLoaded) {
        switchModel(isOpen);
        updateCameraZoom(isOpen);
    } else {
        pendingDoorState = isOpen;
    }

    const { temp, hum } = formatTemperatureHumidity(latest.temperature, latest.humidity);
    document.getElementById('tempValue').textContent = temp;
    document.getElementById('humidityValue').textContent = hum;
    document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    const duration = getLastStateDuration(readings, isOpen);
    document.getElementById('doorTime').textContent = `${isOpen ? 'Aperta' : 'Chiusa'} da ${duration}`;
}

function updateCameraZoom(isOpen) {
    targetCameraZ = isOpen ? openCameraZ : closedCameraZ;
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
    if (!timelineContainer) return;
    if (events.length === 0) {
        timelineContainer.innerHTML = '<div class="timeline-empty">Nessuna apertura oggi</div>';
        return;
    }
    const list = events.map(ev => `<div class="timeline-event">${ev.time} – ${ev.action === 'aperta' ? '🚪 Aperta' : '🚪 Chiusa'}</div>`).join('');
    timelineContainer.innerHTML = `<div class="timeline-events-list">${list}</div>`;
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
        const diff = startX - endX;
        if (Math.abs(diff) < 80) return;
        
        currentChartType = currentChartType === 'temperature' ? 'humidity' : 'temperature';
        const tabs = document.querySelectorAll('.chart-tab');
        tabs.forEach(t => t.classList.toggle('active', t.dataset.type === currentChartType));
        updateChart();
    });
}

// ========== GENERAZIONE MOCK DINAMICO (SOLO FALLBACK) ==========
function generateDynamicMock(deviceId) {
    console.warn(`⚠️ Utilizzo fallback dinamico per ${deviceId} (API non disponibile o 403)`);
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

        if (!res.ok) {
            // Se la risposta non è ok (es. 403), lanciamo un errore per andare al fallback
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        let data = await res.json();
        let readingsArray = Array.isArray(data) ? data : (data.data || data.readings);
        if (!readingsArray) throw new Error("Formato dati non riconosciuto");

        if (readingsArray[0]?.deviceId) {
            readingsArray = readingsArray.filter(r => r.deviceId === currentDeviceId);
        }

        if (readingsArray.length === 0) {
            console.warn(`Nessun dato per device ${currentDeviceId}, uso fallback`);
            throw new Error("Nessun dato trovato");
        }

        readingsHistory = processReadings(readingsArray);
        console.log(`✅ Dati API ricevuti: ${readingsHistory.length} letture`);
    } catch (e) {
        console.error("❌ Errore API, uso fallback dinamico:", e);
        readingsHistory = processReadings(generateDynamicMock(currentDeviceId));
        // Mostra un avviso visibile all'utente (opzionale)
        const warningDiv = document.getElementById('apiWarning') || (() => {
            const div = document.createElement('div');
            div.id = 'apiWarning';
            div.style.cssText = 'position:fixed; bottom:10px; left:10px; right:10px; background:#e74c3c; color:white; padding:8px; border-radius:8px; text-align:center; font-size:12px; z-index:1000;';
            div.textContent = `⚠️ Dati dimostrativi (API non raggiungibile per ${currentDeviceId})`;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 5000);
            return div;
        })();
    }
    updateMetrics(readingsHistory);
    updateChart();
    updateTimeline();
}

// ========== FUNZIONI PER IL MODELLO 3D ==========
function centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y + modelYOffset, -center.z);
}

function switchModel(isOpen) {
    if (!modelsLoaded) return;
    const targetModel = isOpen ? modelOpen : modelClosed;
    if (currentModel === targetModel) return;
    if (currentModel) modelGroup.remove(currentModel);
    if (targetModel) {
        modelGroup.add(targetModel);
        currentModel = targetModel;
    }
}

function init3D() {
    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    scene.background = new THREE.Color(isLight ? 0xf8fafc : 0x111111);

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, cameraY, closedCameraZ);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const loader = new THREE.GLTFLoader();
    loader.load('../BlenderModels/FRIGO-CHIUSO.glb', gltf => {
        modelClosed = gltf.scene;
        modelClosed.scale.set(1.8, 1.8, 1.8);
        centerModel(modelClosed);
        checkModelsReady();
    });
    loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => {
        modelOpen = gltf.scene;
        modelOpen.scale.set(1.8, 1.8, 1.8);
        centerModel(modelOpen);
        checkModelsReady();
    });

    function checkModelsReady() {
        if (modelClosed && modelOpen && !modelsLoaded) {
            modelsLoaded = true;
            switchModel(pendingDoorState);
            updateCameraZoom(pendingDoorState);
        }
    }

    let isDragging = false, prevX = 0;
    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        prevX = e.touches[0].clientX;
        e.preventDefault();
    });
    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - prevX;
        rotationY += dx * 0.008;
        prevX = e.touches[0].clientX;
        e.preventDefault();
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevX = e.clientX; });
    window.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        rotationY += (e.clientX - prevX) * 0.008;
        prevX = e.clientX;
    });

    function animate() {
        requestAnimationFrame(animate);
        rotationY += autoRotateSpeed;
        if (modelGroup) modelGroup.rotation.y = rotationY;
        const currentZ = camera.position.z;
        const delta = targetCameraZ - currentZ;
        if (Math.abs(delta) > 0.01) {
            camera.position.z += delta * 0.1;
            camera.lookAt(0, 0, 0);
        }
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    setTimeout(() => {
        if (!modelsLoaded) {
            console.warn('⚠️ Modelli 3D non caricati entro 5 secondi. Uso modello chiuso di default.');
            modelsLoaded = true;
            switchModel(pendingDoorState);
            updateCameraZoom(pendingDoorState);
        }
    }, 5000);
}

function initChart() {
    const ctx = document.getElementById('dataChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], tension: 0.3, fill: true, borderWidth: 3 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#333' }, ticks: { color: '#ccc' } },
                x: { grid: { color: '#333' }, ticks: { color: '#ccc' } }
            }
        }
    });

    const observer = new MutationObserver(() => {
        if (!chart) return;
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        chart.options.scales.y.ticks.color = isLight ? '#111827' : '#ccc';
        chart.options.scales.x.ticks.color = isLight ? '#111827' : '#ccc';
        chart.options.scales.y.grid.color = isLight ? '#cbd5e1' : '#333';
        chart.options.scales.x.grid.color = isLight ? '#cbd5e1' : '#333';
        chart.update();
        if (scene) {
            scene.background = new THREE.Color(isLight ? 0xf8fafc : 0x111111);
        }
    });
    observer.observe(document.documentElement, { attributes: true });
}

// ========== INIZIALIZZAZIONE PRINCIPALE ==========
function initAll() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '../HTML/registro.html';
        return;
    }

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
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = initAll;