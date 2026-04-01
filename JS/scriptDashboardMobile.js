console.log('Dashboard Mobile caricata');

let chart = null;
let currentChartType = 'temperature';
let readingsHistory = [];
let modelGroup = null;
let modelClosed = null;
let modelOpen = null;
let scene = null;
let camera = null;
let renderer = null;
let rotationY = 0;
let autoRotateSpeed = 0.002;
let currentUser = null;
let currentDeviceId = null;
let modelsLoaded = false;
let currentDoorState = false;

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

function formatTime(date) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
function parseTimestamp(ts) {
    return new Date(ts);
}

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
    currentDoorState = isOpen;
    document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    document.getElementById('doorTime').textContent = isOpen ? 'Aperta da 12 min' : 'Chiusa da 2h 45m';
    update3DModel(isOpen);
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

// Swipe per telefono
function addSwipeListener() {
    const swipeArea = document.getElementById('chartSwipeArea');
    let startX = 0;
    swipeArea.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    swipeArea.addEventListener('touchend', e => {
        const endX = e.changedTouches[0].screenX;
        const diff = startX - endX;
        if (Math.abs(diff) < 80) return;
        
        const tabs = document.querySelectorAll('.chart-tab');
        if (diff > 0) {
            currentChartType = currentChartType === 'temperature' ? 'humidity' : 'temperature';
        } else {
            currentChartType = currentChartType === 'temperature' ? 'humidity' : 'temperature';
        }
        tabs.forEach(t => t.classList.toggle('active', t.dataset.type === currentChartType));
        updateChart();
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
    updateTimeline();
}

const mockReadings = [
    { timestame: "2026-03-30T19:00:00Z", temperatura: 6.8, umidita: 38, portaAperta: false },
    { timestame: "2026-03-30T19:30:00Z", temperatura: 7.4, umidita: 35, portaAperta: false },
    { timestame: "2026-03-30T20:00:00Z", temperatura: 8.9, umidita: 33, portaAperta: true }
];

function centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y, -center.z);
}

function update3DModel(isOpen) {
    if (!modelsLoaded) return;
    if (modelClosed && modelOpen) {
        modelClosed.visible = !isOpen;
        modelOpen.visible = isOpen;
    }
}

function init3D() {
    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.8, 14.0);
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
        modelClosed.visible = false;
        modelGroup.add(modelClosed);
        checkModelsReady();
    });
    
    loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => {
        modelOpen = gltf.scene;
        modelOpen.scale.set(1.8, 1.8, 1.8);
        centerModel(modelOpen);
        modelOpen.visible = false;
        modelGroup.add(modelOpen);
        checkModelsReady();
    });

    function checkModelsReady() {
        if (modelClosed && modelOpen && !modelsLoaded) {
            modelsLoaded = true;
            update3DModel(currentDoorState);
        }
    }

    // Touch drag per ruotare
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
    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });
    // Mouse per debug su desktop
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
}

function updateTimeline() {
    const hasOpenings = readingsHistory.some(r => r.doorOpen);
    document.getElementById('timelineMessage').textContent = hasOpenings ? 'Aperture rilevate oggi' : 'Nessuna apertura oggi';
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
            scales: { y: { grid: { color: '#333' }, ticks: { color: '#ccc' } }, x: { grid: { color: '#333' }, ticks: { color: '#ccc' } } }
        }
    });

    // Adatta colori al tema
    const observer = new MutationObserver(() => {
        if (!chart) return;
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        chart.options.scales.y.ticks.color = isLight ? '#111827' : '#ccc';
        chart.options.scales.x.ticks.color = isLight ? '#111827' : '#ccc';
        chart.options.scales.y.grid.color = isLight ? '#cbd5e1' : '#333';
        chart.options.scales.x.grid.color = isLight ? '#cbd5e1' : '#333';
        chart.update();
    });
    observer.observe(document.documentElement, { attributes: true });
}

function initAll() {
    // Recupera parametro ID dall'URL se presente
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('id');

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

    document.getElementById('logoutBtn').addEventListener('click', window.logout);
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

window.onload = initAll;