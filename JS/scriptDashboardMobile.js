console.log('✅ scriptDashboardMobile.js caricato - redirect automatico');

let chart = null;
let currentChartType = 'temperature';
let readingsHistory = [];
let modelGroup = null, modelClosed = null, modelOpen = null, currentModel = null;
let scene = null, camera = null, renderer = null;
let rotationY = 0, autoRotateSpeed = 0.002;
let currentUser = null, currentDeviceId = null;
let modelsLoaded = false, pendingDoorState = false;
let targetCameraZ = 24.0;
const closedCameraZ = 18.0, openCameraZ = 23.0, cameraY = 2.2, modelYOffset = 1.4;

const urlParams = new URLSearchParams(window.location.search);
let idParam = urlParams.get('id');
if (!idParam || !idParam.startsWith('FRG-')) {
    console.warn(`ID non valido: "${idParam}", uso FRG-001`);
    currentDeviceId = "FRG-001";
} else {
    currentDeviceId = idParam;
}
console.log(`Device ID: ${currentDeviceId}`);

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';
const PROXY_URL = '/api/verifica';

// ========== VERIFICA E REDIRECT IMMEDIATO ==========
async function checkAndRedirect() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!user) {
        // Non loggato: vai a FridgeAuth
        window.location.href = `../HTML/FridgeAuth.html?id=${currentDeviceId}`;
        return false;
    }
    
    if (user.isAdmin) return true;
    
    try {
        const url = `${PROXY_URL}?userId=${encodeURIComponent(user.email)}&fridgeId=${encodeURIComponent(currentDeviceId)}`;
        const response = await fetch(url, { method: 'GET' });
        const data = await response.json();
        if (data.authorized === true) return true;
        else {
            window.location.href = `../HTML/FridgeAuth.html?id=${currentDeviceId}`;
            return false;
        }
    } catch (err) {
        console.error("Errore verifica:", err);
        window.location.href = `../HTML/FridgeAuth.html?id=${currentDeviceId}`;
        return false;
    }
}
// ========== UTILITÀ ==========
function showUserError(msg) {
    const statusDiv = document.getElementById('apiStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `<span style="background:#e74c3c; color:white; padding:4px 8px; border-radius:8px;">⚠️ ${msg}</span>`;
        setTimeout(() => { if (statusDiv) statusDiv.innerHTML = ''; }, 5000);
    }
}
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

function formatValueWithDecimal(v) { return (Math.round(v*10)/10).toFixed(1).replace(/\.0$/,''); }
function formatTemperatureHumidity(t, h) { return { temp: formatValueWithDecimal(t), hum: formatValueWithDecimal(h) }; }

function getDoorStateChanges(readings) {
    let changes = [];
    for (let i=1; i<readings.length; i++) {
        if (readings[i-1].doorOpen !== readings[i].doorOpen) {
            changes.push({ timestamp: readings[i].timestamp, state: readings[i].doorOpen, changedTo: readings[i].doorOpen ? 'aperta' : 'chiusa' });
        }
    }
    return changes;
}

function getLastStateDuration(readings, currentState) {
    if (!readings.length) return 'dati non disponibili';
    let changes = getDoorStateChanges(readings);
    let lastChange = changes.findLast(c => c.state === currentState);
    if (!lastChange) lastChange = { timestamp: readings[0].timestamp, state: currentState };
    let diffMs = Date.now() - lastChange.timestamp.getTime();
    let diffHours = Math.floor(diffMs / (1000*60*60));
    let diffMinutes = Math.floor((diffMs % (1000*60*60)) / (1000*60));
    return `${diffHours>0 ? diffHours+'h ' : ''}${diffMinutes}min`;
}

function getTodayEvents(readings) {
    let changes = getDoorStateChanges(readings);
    let today = new Date(); today.setHours(0,0,0,0);
    let tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    return changes.filter(ev => ev.timestamp >= today && ev.timestamp < tomorrow)
                  .map(ev => ({ time: ev.timestamp.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}), action: ev.changedTo }));
}

function updateMetrics(readings) {
    if (!readings.length) return;
    let latest = readings[readings.length-1];
    let isOpen = latest.doorOpen;
    if (modelsLoaded) { switchModel(isOpen); updateCameraZoom(isOpen); }
    else pendingDoorState = isOpen;
    let { temp, hum } = formatTemperatureHumidity(latest.temperature, latest.humidity);
    document.getElementById('tempValue').textContent = temp;
    document.getElementById('humidityValue').textContent = hum;
    document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    document.getElementById('doorTime').textContent = `${isOpen ? 'Aperta' : 'Chiusa'} da ${getLastStateDuration(readings, isOpen)}`;
}

function updateChart() {
    if (!chart) return;
    let labels = readingsHistory.map(r => formatTime(r.timestamp));
    let data = currentChartType === 'temperature' ? readingsHistory.map(r => r.temperature) : readingsHistory.map(r => r.humidity);
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].borderColor = currentChartType === 'temperature' ? '#22c55e' : '#22d3ee';
    chart.data.datasets[0].backgroundColor = currentChartType === 'temperature' ? '#22c55e22' : '#22d3ee22';
    document.getElementById('chartTitle').textContent = currentChartType === 'temperature' ? 'Storico Temperatura' : 'Storico Umidità';
    chart.update('none');
}

function updateTimeline() {
    let events = getTodayEvents(readingsHistory);
    let container = document.getElementById('timelineEvents');
    if (!container) return;
    if (!events.length) { container.innerHTML = '<div class="timeline-empty">Nessuna apertura oggi</div>'; return; }
    container.innerHTML = `<div class="timeline-events-list">${events.map(ev => `<div class="timeline-event">${ev.time} – ${ev.action === 'aperta' ? '🚪 Aperta' : '🚪 Chiusa'}</div>`).join('')}</div>`;
}

function generateDynamicMock(deviceId) {
    console.warn(`⚠️ Fallback dinamico per ${deviceId}`);
    let now = Date.now();
    let baseTemp = deviceId === 'FRG-TEMPLATE' ? 3.8 : 4.5;
    let baseHum = deviceId === 'FRG-TEMPLATE' ? 48 : 42;
    return [
        { timestame: new Date(now-3600000).toISOString(), temperatura: baseTemp-0.2, umidita: baseHum-2, portaAperta: false },
        { timestame: new Date(now-1800000).toISOString(), temperatura: baseTemp+0.5, umidita: baseHum+3, portaAperta: true },
        { timestame: new Date(now).toISOString(), temperatura: baseTemp + (Math.random()-0.5)*0.6, umidita: baseHum + (Math.random()-0.5)*3, portaAperta: (Math.floor(now/60000)%10)<2 }
    ];
}

async function fetchAndUpdate() {
    console.log(`🔄 Richiesta API per ${currentDeviceId}`);
    try {
        let res = await fetch(API_URL, { method: "GET", headers: { "FRIDGE_KEY": currentDeviceId, "Cache-Control": "no-cache" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        let readingsArray = Array.isArray(data) ? data : (data.data || data.readings);
        if (!readingsArray) throw new Error("Formato dati errato");
        if (readingsArray[0]?.deviceId) readingsArray = readingsArray.filter(r => r.deviceId === currentDeviceId);
        if (!readingsArray.length) throw new Error("Nessun dato");
        readingsHistory = processReadings(readingsArray);
        console.log(`✅ Dati API: ${readingsHistory.length} letture`);
        showUserError('');
    } catch (err) {
        console.error("Errore API:", err);
        showUserError(`Dati dimostrativi (API: ${err.message})`);
        readingsHistory = processReadings(generateDynamicMock(currentDeviceId));
    }
    updateMetrics(readingsHistory);
    updateChart();
    updateTimeline();
}

// ========== MODELLO 3D ==========
function centerModel(model) {
    let box = new THREE.Box3().setFromObject(model);
    let center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y + modelYOffset, -center.z);
}
function switchModel(isOpen) {
    if (!modelsLoaded) return;
    let target = isOpen ? modelOpen : modelClosed;
    if (currentModel === target) return;
    if (currentModel) modelGroup.remove(currentModel);
    if (target) { modelGroup.add(target); currentModel = target; }
}
function updateCameraZoom(isOpen) { targetCameraZ = isOpen ? openCameraZ : closedCameraZ; }

function init3D() {
    let canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    scene = new THREE.Scene();
    let isLight = document.documentElement.getAttribute('data-theme') === 'light';
    scene.background = new THREE.Color(isLight ? 0xf8fafc : 0x111111);
    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
    camera.position.set(0, cameraY, closedCameraZ);
    camera.lookAt(0,0,0);
    let ambient = new THREE.AmbientLight(0xffffff,0.8);
    scene.add(ambient);
    let dirLight = new THREE.DirectionalLight(0xffffff,1.2);
    dirLight.position.set(10,15,10);
    scene.add(dirLight);
    modelGroup = new THREE.Group();
    scene.add(modelGroup);
    let loader = new THREE.GLTFLoader();
    loader.load('../BlenderModels/FRIGO-CHIUSO.glb', gltf => { modelClosed = gltf.scene; modelClosed.scale.set(1.8,1.8,1.8); centerModel(modelClosed); checkReady(); });
    loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => { modelOpen = gltf.scene; modelOpen.scale.set(1.8,1.8,1.8); centerModel(modelOpen); checkReady(); });
    function checkReady() { if(modelClosed && modelOpen && !modelsLoaded) { modelsLoaded=true; switchModel(pendingDoorState); updateCameraZoom(pendingDoorState); } }
    let isDragging=false, prevX=0;
    canvas.addEventListener('touchstart', e => { isDragging=true; prevX=e.touches[0].clientX; e.preventDefault(); });
    canvas.addEventListener('touchmove', e => { if(!isDragging) return; rotationY += (e.touches[0].clientX-prevX)*0.008; prevX=e.touches[0].clientX; e.preventDefault(); });
    canvas.addEventListener('touchend', () => isDragging=false);
    canvas.addEventListener('mousedown', e => { isDragging=true; prevX=e.clientX; });
    window.addEventListener('mouseup', () => isDragging=false);
    canvas.addEventListener('mousemove', e => { if(!isDragging) return; rotationY += (e.clientX-prevX)*0.008; prevX=e.clientX; });
    function animate() { requestAnimationFrame(animate); rotationY += autoRotateSpeed; if(modelGroup) modelGroup.rotation.y = rotationY; let curZ = camera.position.z; let delta = targetCameraZ - curZ; if(Math.abs(delta)>0.01) { camera.position.z += delta*0.1; camera.lookAt(0,0,0); } renderer.render(scene,camera); }
    animate();
    window.addEventListener('resize', () => { camera.aspect = canvas.clientWidth/canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight); });
    setTimeout(() => { if(!modelsLoaded) { console.warn('Modelli 3D non caricati, uso chiuso'); modelsLoaded=true; switchModel(pendingDoorState); updateCameraZoom(pendingDoorState); } }, 5000);
}

function initChart() {
    let ctx = document.getElementById('dataChart').getContext('2d');
    chart = new Chart(ctx, {
        type:'line', data:{ labels:[], datasets:[{ data:[], tension:0.3, fill:true, borderWidth:3 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
            scales:{ y:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } }, x:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } } }
        }
    });
    let observer = new MutationObserver(() => {
        if(!chart) return;
        let isLight = document.documentElement.getAttribute('data-theme') === 'light';
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
    let area = document.getElementById('chartSwipeArea');
    let startX=0;
    area.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    area.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].screenX;
        if(Math.abs(startX-endX) < 80) return;
        currentChartType = currentChartType === 'temperature' ? 'humidity' : 'temperature';
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.toggle('active', t.dataset.type === currentChartType));
        updateChart();
    });
}

async function initAll() {
    const ok = await checkAndRedirect();
    if (!ok) return;

    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = '../HTML/registro.html'; return; }
    
    let name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // Admin panel (opzionale)
    if (currentUser.isAdmin) {
        const adminPanel = document.getElementById('adminPanelMobile');
        if (adminPanel) {
            adminPanel.style.display = 'block';
            const selectEl = document.getElementById('adminIdSelectMobile');
            selectEl.innerHTML = `<option value="FRG-001">FRG-001</option><option value="FRG-TEMPLATE">FRG-TEMPLATE</option>`;
            if (currentDeviceId === 'FRG-001' || currentDeviceId === 'FRG-TEMPLATE') selectEl.value = currentDeviceId;
            else selectEl.value = 'FRG-001';
            selectEl.onchange = () => { window.location.href = `../HTML/DashboardMobile.html?id=${selectEl.value}`; };
        }
    }

    initChart();
    addTabListeners();
    addSwipeListener();
    init3D();
    fetchAndUpdate();
    setInterval(fetchAndUpdate, 30000);

    let themeBtn = document.getElementById('themeToggleBtn');
    let theme = localStorage.getItem('nexoraTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
        let newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('nexoraTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('currentUser'); window.location.href = '../HTML/registro.html'; });
}

window.onload = initAll;