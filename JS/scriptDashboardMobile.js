// ============================================================
// FILE: scriptDashboardMobile.js
// ============================================================
// Dashboard mobile con grafico 3D, metriche in tempo reale e timeline.
// Gestisce la visualizzazione dei dati del frigorifero selezionato.

console.log('✅ scriptDashboardMobile.js caricato - con verifica GET diretta');

// ---------- VARIABILI GLOBALI ----------
let chart = null;               // Istanza del grafico Chart.js
let currentChartType = 'temperature'; // 'temperature' o 'humidity'
let readingsHistory = [];       // Array storico delle letture (temperature, umidità, stato porta)
let modelGroup = null, modelClosed = null, modelOpen = null, currentModel = null; // Modelli 3D
let scene = null, camera = null, renderer = null; // Oggetti Three.js
let rotationY = 0;              // Rotazione attuale del modello (in radianti)
let autoRotateSpeed = 0.002;   // Velocità di rotazione automatica
let currentUser = null, currentDeviceId = null; // Utente loggato e ID frigorifero
let modelsLoaded = false;       // Flag: modelli 3D caricati?
let pendingDoorState = false;   // Stato porta in attesa (se i modelli non sono ancora pronti)
let targetCameraZ = 24.0;       // Posizione Z target della camera (per zoom)
const closedCameraZ = 18.0;     // Zoom quando porta chiusa
const openCameraZ = 23.0;       // Zoom quando porta aperta
const cameraY = 2.2;            // Altezza camera
const modelYOffset = 1.4;       // Offset verticale del modello

// ---------- OTTIENI ID FRIGORIFERO DALL'URL ----------
const urlParams = new URLSearchParams(window.location.search);
let idParam = urlParams.get('id');
if (!idParam || !idParam.startsWith('FRG-')) {
    console.warn(`ID non valido: "${idParam}", uso FRG-001`);
    currentDeviceId = "FRG-001";
} else {
    currentDeviceId = idParam;
}
console.log(`Device ID: ${currentDeviceId}`);

// URL delle API (backend Railway)
const API_URL = 'https://fridge-iot-production.up.railway.app/api/getFridgeDetails';
const VERIFICA_URL = 'https://phpusersbytolentino-production.up.railway.app/verifica-associazione.php';

// ========== VERIFICA AUTORIZZAZIONE (POST al proxy) ==========
// Controlla se l'utente loggato è autorizzato a vedere i dati di questo frigorifero
async function checkAuthorization() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { // Se non c'è utente, rimanda al login
        window.location.href = '../HTML/registro.html';
        return false;
    }
    if (user.isAdmin) return true; // Gli admin possono vedere qualsiasi frigorifero

    try {
        // Chiamata GET al server di verifica con userId e fridgeId
        const url = `${VERIFICA_URL}?userId=${encodeURIComponent(user.email)}&fridgeId=${encodeURIComponent(currentDeviceId)}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Risposta verifica mobile:", data);
        if (data.authorized === true) return true;
        
        let errore = data.error || "Non autorizzato";
        alert(`❌ ${errore}\n\nUtente: ${user.email}\nFrigo: ${currentDeviceId}`);
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return false;
    } catch (err) {
        console.error("Errore verifica mobile:", err);
        alert("Errore di connessione al server. Riprova più tardi.");
        window.location.href = '../HTML/SelezioneDispositivo.html';
        return false;
    }
}

// ========== UTILITÀ ==========
// Mostra un messaggio di errore temporaneo nell'area apiStatus
function showUserError(msg) {
    const statusDiv = document.getElementById('apiStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `<span style="background:#e74c3c; color:white; padding:4px 8px; border-radius:8px;">⚠️ ${msg}</span>`;
        setTimeout(() => { if (statusDiv) statusDiv.innerHTML = ''; }, 5000);
    }
}

// Formatta un oggetto Date in "HH:MM"
function formatTime(date) { return date.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }); }

// Converte una stringa timestamp in oggetto Date
function parseTimestamp(ts) { return new Date(ts); }

// Processa le letture grezze dell'API: normalizza i nomi dei campi e aggiunge +2 ore al timestamp (fuso orario)
function processReadings(readings) {
    return readings.map(r => {
        let date = parseTimestamp(r.timestame || r.timestamp);
        date = new Date(date.getTime() + 7200000); // +2 ore
        return {
            timestamp: date,
            temperature: r.temperatura || r.temperature,
            humidity: r.umidita || r.humidity,
            doorOpen: r.portaAperta || r.doorOpen
        };
    });
}

// Arrotonda un valore a 1 decimale e rimuove ".0" se intero
function formatValueWithDecimal(v) { return (Math.round(v*10)/10).toFixed(1).replace(/\.0$/,''); }

// Restituisce un oggetto con temperatura e umidità formattate
function formatTemperatureHumidity(t, h) { return { temp: formatValueWithDecimal(t), hum: formatValueWithDecimal(h) }; }

// Trova i cambiamenti di stato della porta (da chiusa ad aperta e viceversa)
function getDoorStateChanges(readings) {
    let changes = [];
    for (let i=1; i<readings.length; i++) {
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

// Calcola da quanto tempo la porta è nello stato attuale (es. "2h 15min")
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

// Restituisce gli eventi di apertura/chiusura della porta avvenuti oggi
function getTodayEvents(readings) {
    let changes = getDoorStateChanges(readings);
    let today = new Date(); today.setHours(0,0,0,0);
    let tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    return changes.filter(ev => ev.timestamp >= today && ev.timestamp < tomorrow)
                  .map(ev => ({ 
                      time: ev.timestamp.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}), 
                      action: ev.changedTo 
                  }));
}

// ========== AGGIORNAMENTO UI ==========
// Aggiorna le card metriche (temperatura, umidità, porta) con i dati più recenti
function updateMetrics(readings) {
    if (!readings.length) return;
    let latest = readings[readings.length-1];
    let isOpen = latest.doorOpen;
    // Se i modelli 3D sono pronti, cambia il modello (aperto/chiuso) e aggiorna zoom
    if (modelsLoaded) { 
        switchModel(isOpen); 
        updateCameraZoom(isOpen); 
    } else {
        pendingDoorState = isOpen; // salva lo stato per quando i modelli saranno pronti
    }
    let { temp, hum } = formatTemperatureHumidity(latest.temperature, latest.humidity);
    document.getElementById('tempValue').textContent = temp;
    document.getElementById('humidityValue').textContent = hum;
    document.getElementById('doorStatus').textContent = isOpen ? '🚪 Aperta' : '🚪 Chiusa';
    document.getElementById('doorCard').classList.toggle('open', isOpen);
    document.getElementById('doorTime').textContent = `${isOpen ? 'Aperta' : 'Chiusa'} da ${getLastStateDuration(readings, isOpen)}`;
}

// Aggiorna il grafico (Chart.js) con i dati correnti e il tipo selezionato
function updateChart() {
    if (!chart) return;
    let labels = readingsHistory.map(r => formatTime(r.timestamp));
    let data = currentChartType === 'temperature' ? readingsHistory.map(r => r.temperature) : readingsHistory.map(r => r.humidity);
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    // Cambia colore della linea in base al tipo (verde per temperatura, ciano per umidità)
    chart.data.datasets[0].borderColor = currentChartType === 'temperature' ? '#22c55e' : '#22d3ee';
    chart.data.datasets[0].backgroundColor = currentChartType === 'temperature' ? '#22c55e22' : '#22d3ee22';
    document.getElementById('chartTitle').textContent = currentChartType === 'temperature' ? 'Storico Temperatura' : 'Storico Umidità';
    chart.update('none'); // aggiorna senza animazione per prestazioni
}

// Aggiorna la timeline delle aperture della porta (solo eventi di oggi)
function updateTimeline() {
    let events = getTodayEvents(readingsHistory);
    let container = document.getElementById('timelineEvents');
    if (!container) return;
    if (!events.length) { 
        container.innerHTML = '<div class="timeline-empty">Nessuna apertura oggi</div>'; 
        return; 
    }
    container.innerHTML = `<div class="timeline-events-list">${events.map(ev => `<div class="timeline-event">${ev.time} – ${ev.action === 'aperta' ? '🚪 Aperta' : '🚪 Chiusa'}</div>`).join('')}</div>`;
}

// ========== MOCK DINAMICO (FALLBACK) ==========
// Genera dati fittizi in caso di errore dell'API, per dimostrare il funzionamento
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

// Recupera i dati dall'API (o fallback) e aggiorna tutte le UI
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
        showUserError(''); // cancella eventuale errore precedente
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
// Centra il modello nella scena (posizionamento corretto)
function centerModel(model) {
    let box = new THREE.Box3().setFromObject(model);
    let center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y + modelYOffset, -center.z);
}

// Cambia il modello visualizzato (aperto o chiuso) in base allo stato della porta
function switchModel(isOpen) {
    if (!modelsLoaded) return;
    let target = isOpen ? modelOpen : modelClosed;
    if (currentModel === target) return;
    if (currentModel) modelGroup.remove(currentModel);
    if (target) { modelGroup.add(target); currentModel = target; }
}

// Imposta la variabile targetCameraZ in base allo stato della porta (per transizione zoom)
function updateCameraZoom(isOpen) { targetCameraZ = isOpen ? openCameraZ : closedCameraZ; }

// Inizializza la scena 3D con Three.js, carica i modelli GLTF e gestisce interazioni touch/mouse
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
    // Luci
    let ambient = new THREE.AmbientLight(0xffffff,0.8);
    scene.add(ambient);
    let dirLight = new THREE.DirectionalLight(0xffffff,1.2);
    dirLight.position.set(10,15,10);
    scene.add(dirLight);
    // Gruppo che conterrà il modello attivo
    modelGroup = new THREE.Group();
    scene.add(modelGroup);
    let loader = new THREE.GLTFLoader();
    // Carica modello frigorifero chiuso
    loader.load('../BlenderModels/FRIGO-CHIUSO.glb', gltf => { 
        modelClosed = gltf.scene; 
        modelClosed.scale.set(1.8,1.8,1.8); 
        centerModel(modelClosed); 
        checkReady(); 
    });
    // Carica modello frigorifero aperto
    loader.load('../BlenderModels/FRIGO-APERTO.glb', gltf => { 
        modelOpen = gltf.scene; 
        modelOpen.scale.set(1.8,1.8,1.8); 
        centerModel(modelOpen); 
        checkReady(); 
    });
    // Funzione che controlla se entrambi i modelli sono caricati
    function checkReady() { 
        if(modelClosed && modelOpen && !modelsLoaded) { 
            modelsLoaded=true; 
            switchModel(pendingDoorState); 
            updateCameraZoom(pendingDoorState); 
        } 
    }
    // Interazioni: drag per ruotare (touch e mouse)
    let isDragging=false, prevX=0;
    canvas.addEventListener('touchstart', e => { isDragging=true; prevX=e.touches[0].clientX; e.preventDefault(); });
    canvas.addEventListener('touchmove', e => { if(!isDragging) return; rotationY += (e.touches[0].clientX-prevX)*0.008; prevX=e.touches[0].clientX; e.preventDefault(); });
    canvas.addEventListener('touchend', () => isDragging=false);
    canvas.addEventListener('mousedown', e => { isDragging=true; prevX=e.clientX; });
    window.addEventListener('mouseup', () => isDragging=false);
    canvas.addEventListener('mousemove', e => { if(!isDragging) return; rotationY += (e.clientX-prevX)*0.008; prevX=e.clientX; });
    // Animazione: rotazione automatica e zoom fluido
    function animate() { 
        requestAnimationFrame(animate); 
        rotationY += autoRotateSpeed; 
        if(modelGroup) modelGroup.rotation.y = rotationY; 
        let curZ = camera.position.z; 
        let delta = targetCameraZ - curZ; 
        if(Math.abs(delta)>0.01) { camera.position.z += delta*0.1; camera.lookAt(0,0,0); } 
        renderer.render(scene,camera); 
    }
    animate();
    window.addEventListener('resize', () => { 
        camera.aspect = canvas.clientWidth/canvas.clientHeight; 
        camera.updateProjectionMatrix(); 
        renderer.setSize(canvas.clientWidth, canvas.clientHeight); 
    });
    // Timeout di sicurezza: se i modelli non si caricano entro 5 secondi, forza lo stato chiuso
    setTimeout(() => { 
        if(!modelsLoaded) { 
            console.warn('Modelli 3D non caricati, uso chiuso'); 
            modelsLoaded=true; 
            switchModel(pendingDoorState); 
            updateCameraZoom(pendingDoorState); 
        } 
    }, 5000);
}

// ========== GRAFICO ==========
// Inizializza il grafico Chart.js e imposta un observer per cambiare i colori in base al tema
function initChart() {
    let ctx = document.getElementById('dataChart').getContext('2d');
    chart = new Chart(ctx, {
        type:'line', 
        data:{ labels:[], datasets:[{ data:[], tension:0.3, fill:true, borderWidth:3 }] },
        options:{ 
            responsive:true, 
            maintainAspectRatio:false, 
            plugins:{ legend:{ display:false } },
            scales:{ 
                y:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } }, 
                x:{ grid:{ color:'#333' }, ticks:{ color:'#ccc' } } 
            }
        }
    });
    // Osserva i cambiamenti dell'attributo data-theme sull'html per aggiornare i colori del grafico
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

// Aggiunge i listener ai pulsanti delle tab (Temperatura/Umidità) per cambiare il grafico
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

// Aggiunge lo swipe (scorrimento) sull'area del grafico per cambiare tipo (mobile)
function addSwipeListener() {
    let area = document.getElementById('chartSwipeArea');
    let startX=0;
    area.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    area.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].screenX;
        if(Math.abs(startX-endX) < 80) return; // sensibilità minima 80px
        currentChartType = currentChartType === 'temperature' ? 'humidity' : 'temperature';
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.toggle('active', t.dataset.type === currentChartType));
        updateChart();
    });
}

// ========== INIZIALIZZAZIONE PRINCIPALE ==========
async function initAll() {
    // 1. Verifica autorizzazione (se fallisce, reindirizza)
    const authorized = await checkAuthorization();
    if (!authorized) return;

    // 2. Carica utente corrente dal localStorage
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if(!currentUser) { window.location.href = '../HTML/registro.html'; return; }
    let name = currentUser.nickname || 'Utente';
    document.getElementById('userNameHeader').textContent = name;
    document.getElementById('userNameHeader2').textContent = name;
    document.getElementById('userDisplay').innerHTML = `👤 ${name}`;

    // 3. Pannello admin mobile (se utente è admin)
    if (currentUser.isAdmin) {
        const adminPanel = document.getElementById('adminPanelMobile');
        if (adminPanel) {
            adminPanel.style.display = 'block';
            const selectEl = document.getElementById('adminIdSelectMobile');
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
                window.location.href = `../HTML/DashboardMobile.html?id=${selectEl.value}`;
            };
        }
    }

    // 4. Inizializza grafico, listener, 3D
    initChart();
    addTabListeners();
    addSwipeListener();
    init3D();
    // 5. Primo fetch dati
    fetchAndUpdate();
    // 6. Aggiornamento automatico ogni 30 secondi
    setInterval(fetchAndUpdate, 30000);

    // 7. Gestione tema chiaro/scuro
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
    // 8. Logout
    document.getElementById('logoutBtn').addEventListener('click', () => { 
        localStorage.removeItem('currentUser'); 
        window.location.href = '../HTML/registro.html'; 
    });
}

// Avvia tutto al caricamento della pagina
window.onload = initAll;