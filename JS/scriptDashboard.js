console.log('✅ scriptDashboard.js CARICATO - layout originale ripristinato');

// ========== VARIABILI GLOBALI ==========
let chart = null;               // istanza del grafico Chart.js
let currentChartType = 'temperature';   // 'temperature' o 'humidity'
let readingsHistory = [];       // storico dei dati (array di oggetti con timestamp, temperatura, umidità, porta)
let modelGroup = null;          // gruppo Three.js che contiene il modello 3D
let modelClosed = null;         // modello 3D del frigorifero chiuso
let modelOpen = null;           // modello 3D del frigorifero aperto
let currentModel = null;        // modello attualmente visualizzato (chiuso o aperto)
let scene = null;               // scena Three.js
let camera = null;              // telecamera Three.js
let renderer = null;            // renderer Three.js
let rotationY = 0;              // rotazione attuale del modello attorno all'asse Y
let autoRotateSpeed = 0.002;    // velocità di rotazione automatica
let currentUser = null;         // utente loggato
let currentDeviceId = null;     // ID del frigorifero selezionato (es. FRG-987654)
let modelsReady = false;        // flag: true quando entrambi i modelli 3D sono caricati
let pendingDoorState = false;   // stato della porta in attesa che i modelli siano pronti

const urlParams = new URLSearchParams(window.location.search);
currentDeviceId = urlParams.get('id');
if (!currentDeviceId) {
  console.error("Nessun ID frigorifero specificato");
  // Mostra un messaggio all'utente o usa un default
  currentDeviceId = "FRG-987654";
}


// URL dell'API per recuperare i dati del frigorifero (backend su Railway)
const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';

// ========== FUNZIONI DI UTILITÀ ==========
// Formatta un oggetto Date in "HH:MM"
function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
// Converte una stringa timestamp in oggetto Date
function parseTimestamp(ts) { return new Date(ts); }

// Elabora i dati grezzi letti dall'API: normalizza i nomi dei campi e crea array di oggetti leggibili
function processReadings(readings) {
    return readings.map(r => ({
        timestamp: parseTimestamp(r.timestame || r.timestamp),
        temperature: r.temperatura || r.temperature,   // supporta entrambe le nomenclature
        humidity: r.umidita || r.humidity,
        doorOpen: r.portaAperta || r.doorOpen
    }));
}

// === FORMATTAZIONE CON UN DECIMALE (come nella versione mobile) ===
// Arrotonda a un decimale, ma se il risultato è .0 toglie la parte decimale (es. 7.0 → 7)
function formatValueWithDecimal(value) {
    const rounded = Math.round(value * 10) / 10;
    const str = rounded.toFixed(1);
    return str.endsWith('.0') ? Math.round(rounded).toString() : str;
}

// Applica la formattazione a temperatura e umidità
function formatTemperatureHumidity(temp, hum) {
    return {
        temp: formatValueWithDecimal(temp),
        hum: formatValueWithDecimal(hum)
    };
}

// Trova i cambi di stato della porta (aperta → chiusa o viceversa) nella sequenza di letture
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

// Calcola da quanto tempo la porta è nello stato attuale (aperta o chiusa)
function getLastStateDuration(readings, currentState) {
    if (readings.length === 0) return 'dati non disponibili';
    const changes = getDoorStateChanges(readings);
    let lastChange = null;
    // Cerca l'ultimo cambiamento che ha portato allo stato attuale
    for (let i = changes.length-1; i >= 0; i--) {
        if (changes[i].state === currentState) {
            lastChange = changes[i];
            break;
        }
    }
    if (!lastChange) {
        // Se non ci sono cambiamenti, assume che lo stato iniziale sia quello della prima lettura
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

// Restituisce gli eventi di apertura/chiusura della porta avvenuti oggi
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

// Aggiorna le metriche in alto (temperatura, umidità, stato porta) in base all'ultima lettura
function updateMetrics(readings) {
    if (!readings.length) return;
    const latest = readings[readings.length - 1];
    const { temp, hum } = formatTemperatureHumidity(latest.temperature, latest.humidity);
    
    document.getElementById('tempValue').textContent = temp;
    document.getElementById('humidityValue').textContent = hum;

    const isOpen = latest.doorOpen;
    document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    const duration = getLastStateDuration(readings, isOpen);
    document.getElementById('doorTime').textContent = `${isOpen ? 'Aperta' : 'Chiusa'} da ${duration}`;
}

// Aggiorna il grafico (Chart.js) con i dati correnti (temperatura o umidità)
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

// Aggiunge i listener ai pulsanti "Temperatura"/"Umidità"
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

// Aggiunge lo swipe (touch) sul grafico per cambiare tipo (utile su mobile)
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

// Recupera i dati dall'API e aggiorna dashboard, grafico e timeline
async function fetchAndUpdate() {
    try {
        let url = API_URL;
        if (currentDeviceId) url += `?id=${currentDeviceId}`;
        
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "FRIDGE-KEY": currentDeviceId
            }
        });

        const data = res.ok ? await res.json() : mockReadings;
        readingsHistory = processReadings(Array.isArray(data) ? data : [data]);
    } catch(e) {
        // In caso di errore (es. nessuna connessione), usa dati fittizi di esempio
        readingsHistory = processReadings(mockReadings);
    }
    updateMetrics(readingsHistory);
    updateChart();
    updateTimeline();
}

// DATI DI ESEMPIO (mock) usati se l'API non risponde
const mockReadings = [
    { timestame: "2026-03-30T19:00:00Z", temperatura: 6.8, umidita: 38, portaAperta: false },
    { timestame: "2026-03-30T19:30:00Z", temperatura: 7.4, umidita: 35, portaAperta: false },
    { timestame: "2026-03-30T20:00:00Z", temperatura: 8.9, umidita: 33, portaAperta: true }
];

// ========== FUNZIONI PER IL MODELLO 3D ==========
// Centra il modello 3D (porta l'origine al centro della bounding box)
function centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y, -center.z);
}

// Cambia il modello visualizzato tra chiuso e aperto in base allo stato della porta
function switchModel(isOpen) {
    if (!modelsReady) return;
    const targetModel = isOpen ? modelOpen : modelClosed;
    if (currentModel === targetModel) return;
    if (currentModel) modelGroup.remove(currentModel);
    if (targetModel) {
        modelGroup.add(targetModel);
        currentModel = targetModel;
    }
}

// Inizializza la scena 3D con Three.js, carica i modelli GLTF e gestisce interazione
function init3D() {
    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    scene.background = new THREE.Color(isLight ? 0xf8fafc : 0x111111);

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.8, 15.0);
    camera.lookAt(0, 0, 0);

    // Luci per illuminare il modello
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const loader = new THREE.GLTFLoader();
    
    // Carica modello frigorifero chiuso
    loader.load('../BlenderModels/FRIGO-CHIUSO.glb', gltf => {
        modelClosed = gltf.scene;
        modelClosed.scale.set(1.8, 1.8, 1.8);
        centerModel(modelClosed);
        checkModelsReady();
    });
    
    // Carica modello frigorifero aperto
    loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => {
        modelOpen = gltf.scene;
        modelOpen.scale.set(1.8, 1.8, 1.8);
        centerModel(modelOpen);
        checkModelsReady();
    });

    // Verifica se entrambi i modelli sono stati caricati
    function checkModelsReady() {
        if (modelClosed && modelOpen && !modelsReady) {
            modelsReady = true;
            switchModel(pendingDoorState);
        }
    }

    // Interazione: trascinamento del mouse per ruotare manualmente il modello
    let isDragging = false, prevX = 0;
    canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; });
    window.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        rotationY += (e.clientX - prevX) * 0.008;
        prevX = e.clientX;
    });

    // Animazione: rotazione automatica continua
    function animate() {
        requestAnimationFrame(animate);
        rotationY += autoRotateSpeed;
        if (modelGroup) modelGroup.rotation.y = rotationY;
        renderer.render(scene, camera);
    }
    animate();

    // Adatta il canvas al ridimensionamento della finestra
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// Aggiorna la timeline (elenco aperture della porta oggi)
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

// Inizializza il grafico Chart.js
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

    // Osserva i cambi di tema per aggiornare i colori del grafico e lo sfondo 3D
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
    // Recupera utente corrente dal localStorage (impostato al login)
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return window.location.href = '../HTML/registro.html';

    // Mostra il nome utente nei vari elementi
    const name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // Inizializza grafico, listener, modello 3D
    initChart();
    addTabListeners();
    addSwipeListener();
    init3D();
    fetchAndUpdate();                // primo fetch immediato
    setInterval(fetchAndUpdate, 30000);  // aggiorna ogni 30 secondi

    // Gestione tema (scuro/chiaro)
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

    // Pulsante logout
    document.getElementById('logoutBtn').addEventListener('click', window.logout);

    // Pannello admin (visibile solo se l'utente è admin)
    if (currentUser.isAdmin) {
        document.getElementById('adminPanel').style.display = 'block';
        window.switchDeviceId = function(id) {
            currentDeviceId = id;
            fetchAndUpdate();
        };
    }
}

// Funzione di logout (esposta globalmente per essere usata da onclick)
window.logout = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../HTML/registro.html';
};

// Avvio dell'applicazione quando la pagina è completamente caricata
window.onload = initAll;