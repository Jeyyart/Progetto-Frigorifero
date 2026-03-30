console.log('✅ scriptDashboard.js CARICATO');

let chart = null;
let currentChartType = 'temperature';
let readingsHistory = [];
let modelClosed = null;
let modelOpen = null;
let scene = null;
let camera = null;
let renderer = null;
let rotationY = 0;
let currentUser = null;
let currentDeviceId = null;

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
function parseTimestamp(ts) { return new Date(ts); }

function processReadings(readings) {
    return readings.map(r => ({
        timestamp: parseTimestamp(r.timestame || r.timestamp),
        temperature: Math.round(r.temperatura || r.temperature),
        humidity: Math.round(r.umidita || r.humidity),
        doorOpen: r.portaAperta || r.doorOpen
    }));
}

function updateMetrics(readings) {
    if (!readings.length) return;
    const latest = readings[readings.length - 1];
    document.getElementById('tempValue').textContent = latest.temperature;
    document.getElementById('humidityValue').textContent = latest.humidity;
    const isOpen = latest.doorOpen;
    document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    document.getElementById('doorTime').textContent = isOpen ? 'Aperta da 12 min' : 'Chiusa da 2h 45m';
    if (typeof window.update3D === 'function') window.update3D(isOpen);
}

function updateChart() {
    if (!chart) return;
    const labels = readingsHistory.map(r => formatTime(r.timestamp));
    const tempData = readingsHistory.map(r => r.temperature);
    const humData = readingsHistory.map(r => r.humidity);

    const lineColor = currentChartType === 'temperature' ? '#22c55e' : '#22d3ee';
    chart.data.labels = labels;
    chart.data.datasets[0].data = currentChartType === 'temperature' ? tempData : humData;
    chart.data.datasets[0].borderColor = lineColor;
    chart.data.datasets[0].backgroundColor = lineColor + '22';
    document.getElementById('chartTitle').textContent = currentChartType === 'temperature' ? 'Storico Temperatura (°C)' : 'Storico Umidità (%)';
    chart.update('none');
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

async function fetchAndUpdate() {
    try {
        let url = API_URL;
        if (currentDeviceId) url += `?id=${currentDeviceId}`;
        const res = await fetch(url);
        const data = res.ok ? await res.json() : mockReadings;
        readingsHistory = processReadings(Array.isArray(data) ? data : [data]);
    } catch(e) {
        readingsHistory = processReadings(mockReadings);
    }
    updateMetrics(readingsHistory);
    updateChart();
}

const mockReadings = [
    { timestame: "2026-03-30T19:00:00Z", temperatura: 6.8, umidita: 38, portaAperta: false },
    { timestame: "2026-03-30T19:30:00Z", temperatura: 7.4, umidita: 35, portaAperta: false },
    { timestame: "2026-03-30T20:00:00Z", temperatura: 8.9, umidita: 33, portaAperta: true }
];

function initChart() {
    const ctx = document.getElementById('dataChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], tension: 0.3, fill: true, borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#333' }, ticks: { color: '#ccc' } }, x: { grid: { color: '#333' }, ticks: { color: '#ccc' } } }
        }
    });
}
/* === 3D MODELLI === */
function init3D() {
    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3.5);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    const loader = new THREE.GLTFLoader();

    // Frigo chiuso
    loader.load('../BlenderModels/FRIGO-CHUSO.glb', gltf => {
        modelClosed = gltf.scene;
        modelClosed.scale.set(1.8, 1.8, 1.8);
        scene.add(modelClosed);
    }, undefined, err => console.warn('Closed model non trovato', err));

    // Frigo aperto
    loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => {
        modelOpen = gltf.scene;
        modelOpen.scale.set(1.8, 1.8, 1.8);
        modelOpen.visible = false;
        scene.add(modelOpen);
    }, undefined, err => console.warn('Open model non trovato', err));

    // Controlli mouse
    let isDragging = false, prevX = 0;
    canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; });
    window.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const delta = (e.clientX - prevX) * 0.008;
        rotationY += delta;
        if (modelClosed) modelClosed.rotation.y = rotationY;
        if (modelOpen) modelOpen.rotation.y = rotationY;
        prevX = e.clientX;
    });

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

window.update3D = function(isOpen) {
    if (modelClosed && modelOpen) {
        modelClosed.visible = !isOpen;
        modelOpen.visible = isOpen;
    }
};

function switchDeviceId(newId) {
    currentDeviceId = newId;
    window.history.replaceState({}, '', `?id=${newId}`);
    fetchAndUpdate();
}

function initAll() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return window.location.href = '../HTML/registro.html';

    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    const greetingEl = document.getElementById('userNameHeader2');
    if (greetingEl) greetingEl.textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    if (currentUser.nickname === 'J') currentDeviceId = null;

    initChart();
    addTabListeners();
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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', window.logout);
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = initAll;