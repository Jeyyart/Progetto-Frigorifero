console.log('✅ scriptDashboard.js CARICATO CORRETTAMENTE');

let chart = null;
let currentChartType = 'temperature';
let readingsHistory = [];
let modelOpen = null;
let modelClosed = null;

const mockReadings = [
    { timestame: "2026-03-29T19:00:00Z", temperatura: 8.8, umidita: 34, portaAperta: false },
    { timestame: "2026-03-29T19:30:00Z", temperatura: 7.2, umidita: 36, portaAperta: false },
    { timestame: "2026-03-29T20:00:00Z", temperatura: 9.1, umidita: 32, portaAperta: true }
];

const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
function parseTimestamp(ts) { return new Date(ts); }

function processReadings(readings) {
    return readings.map(r => ({
        timestamp: parseTimestamp(r.timestame),
        temperature: r.temperatura,
        humidity: r.umidita,
        doorOpen: r.portaAperta
    }));
}

function updateMetrics(readings) {
    console.log('📊 updateMetrics chiamato con', readings.length, 'valori');
    if (!readings.length) return;
    const latest = readings[readings.length-1];
    document.getElementById('tempValue').textContent = latest.temperature.toFixed(1);
    document.getElementById('humidityValue').textContent = Math.round(latest.humidity);
    const isOpen = latest.doorOpen;
    document.getElementById('doorStatus').textContent = isOpen ? 'Aperta' : 'Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    document.getElementById('doorTime').textContent = isOpen ? 'Aperta da 12 min' : 'Chiusa da 2h 45m';
}

function updateChart() {
    if (!chart) return;
    const labels = readingsHistory.map(r => formatTime(r.timestamp));
    const temp = readingsHistory.map(r => r.temperature);
    const hum = readingsHistory.map(r => r.humidity);
    chart.data.labels = labels;
    chart.data.datasets[0].data = currentChartType === 'temperature' ? temp : hum;
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

async function fetchAndUpdate() {
    console.log('📡 Tentativo fetch API...');
    try {
        const res = await fetch(API_URL);
        const data = res.ok ? await res.json() : mockReadings;
        readingsHistory = processReadings(data);
    } catch(e) {
        console.log('🔧 Uso mock (API non raggiungibile)');
        readingsHistory = processReadings(mockReadings);
    }
    updateMetrics(readingsHistory);
    updateChart();
    console.log('✅ Dashboard aggiornata con dati');
}

function initChart() {
    const ctx = document.getElementById('dataChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: '#FFD966', backgroundColor: 'rgba(255,217,102,0.1)', tension: 0, fill: true, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#333' }, ticks: { color: '#ccc' } }, x: { grid: { color: '#333' }, ticks: { color: '#ccc' } } }
        }
    });
}

function initAll() {
    console.log('🚀 initAll() PARTITO');

    const themeBtn = document.getElementById('themeToggleBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    initChart();
    addTabListeners();
    fetchAndUpdate();           // <-- FORZA i dati subito
    setInterval(fetchAndUpdate, 30000);

    logoutBtn.addEventListener('click', () => window.location.href = '../HTML/registro.html');
    if (themeBtn) themeBtn.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

    console.log('🎉 Dashboard completamente inizializzata - dovresti vedere i dati ora!');
}

window.onload = initAll;