// js/multi_sim.js - Versione Finale con PDF Fix Colori e Statistiche

const SIZE = 12;
const SHIPS_CONFIG = [
    { name: "Portaerei", len: 5 },
    { name: "Incrociatore", len: 3 },
    { name: "Incrociatore", len: 3 },
    { name: "Cacciatorpediniere", len: 2 },
    { name: "Cacciatorpediniere", len: 2 },
    { name: "Sottomarino", len: 1 }
];

const PRETTY_NAMES = { 
    'easy': 'Random', 
    'medium': 'Hunt & Target', 
    'hard': 'Prob. Map' 
};

// Totale navi da colpire (17 solitamente)
const TOTAL_HITS_WIN = SHIPS_CONFIG.reduce((a, b) => a + b.len, 0);

// --- EVENT LISTENER AVVIO ---
document.getElementById('start-mass-sim').addEventListener('click', async () => {
    const countInput = document.getElementById('sim-count');
    let count = parseInt(countInput.value);
    if(isNaN(count) || count < 1) count = 10;

    // Reset UI
    document.getElementById('start-mass-sim').disabled = true;
    document.getElementById('setup-area').style.display = 'none'; 
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('results-area').style.display = 'none';
    document.getElementById('charts-container').innerHTML = ''; 
    document.getElementById('analysis-text').innerHTML = '';
    
    // Imposta data report
    document.getElementById('report-date').innerText = new Date().toLocaleString();

    const taskLabel = document.getElementById('current-task');
    const progressBar = document.getElementById('progress-bar');
    
    const pairs = [['easy', 'medium'], ['easy', 'hard'], ['medium', 'hard']];
    const finalResults = {};

    let totalMatches = pairs.length * count;
    let completed = 0;

    for (let pair of pairs) {
        const p1 = pair[0];
        const p2 = pair[1];
        const key = `${p1}_vs_${p2}`;
        
        finalResults[key] = { 
            algoA: p1, 
            algoB: p2, 
            aWins: 0, 
            bWins: 0,
            turnsHistory: [],
            timelineSumA: new Array(200).fill(0), 
            timelineSumB: new Array(200).fill(0),
            maxTurnsReached: 0
        };

        taskLabel.innerText = `Simulazione: ${PRETTY_NAMES[p1]} vs ${PRETTY_NAMES[p2]}...`;

        for (let i = 0; i < count; i++) {
            const match = runSingleMatchWithTimeline(p1, p2);
            
            if (match.winner === 'A') finalResults[key].aWins++;
            else finalResults[key].bWins++;
            
            finalResults[key].turnsHistory.push(match.totalTurns);

            if (match.totalTurns > finalResults[key].maxTurnsReached) {
                finalResults[key].maxTurnsReached = match.totalTurns;
            }

            for (let t = 0; t < match.timelineA.length; t++) {
                if (!finalResults[key].timelineSumA[t]) finalResults[key].timelineSumA[t] = 0;
                finalResults[key].timelineSumA[t] += match.timelineA[t];
            }
            for (let t = 0; t < match.timelineB.length; t++) {
                if (!finalResults[key].timelineSumB[t]) finalResults[key].timelineSumB[t] = 0;
                finalResults[key].timelineSumB[t] += match.timelineB[t];
            }

            completed++;
            const pct = Math.floor((completed / totalMatches) * 100);
            progressBar.style.width = pct + '%';
            
            if (completed % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }
    }

    taskLabel.innerText = "COMPLETATO - Generazione Report...";
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        document.getElementById('progress-container').style.display = 'none';
        displayFinalAnalysis(finalResults, count);
    }, 500);
});

// --- EVENT LISTENER DOWNLOAD PDF ---
document.getElementById('download-pdf-btn').addEventListener('click', async () => {
    const btn = document.getElementById('download-pdf-btn');
    const originalText = btn.innerText;
    
    btn.innerText = "GENERAZIONE PDF...";
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const element = document.getElementById('pdf-export-area');
        await generatePdfFromElement(element);
    } catch (err) {
        console.error("Errore PDF:", err);
        alert("Errore generazione PDF.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
});

// --- LOGICA SIMULAZIONE ---
function runSingleMatchWithTimeline(algoA, algoB) {
    let boardA = createEmptyBoard();
    let boardB = createEmptyBoard();
    
    placeShipsSeeded(boardA);
    placeShipsSeeded(boardB);

    let hitsA = 0, hitsB = 0;
    let turns = 0;
    
    let triedA = new Set(), triedB = new Set();
    let stackA = [], stackB = [];
    
    let timelineA = [];
    let timelineB = [];

    // Limite 200 turni
    while (hitsA < TOTAL_HITS_WIN && hitsB < TOTAL_HITS_WIN && turns < 200) {
        turns++; 

        let moveA = getTacticalMove(algoA, boardB, triedA, stackA);
        triedA.add(`${moveA.r},${moveA.c}`);
        if (boardB[moveA.r][moveA.c] > 0) {
            hitsA++;
            updateTargetStack(stackA, moveA.r, moveA.c, triedA);
        }
        
        let moveB = getTacticalMove(algoB, boardA, triedB, stackB);
        triedB.add(`${moveB.r},${moveB.c}`);
        if (boardA[moveB.r][moveB.c] > 0) {
            hitsB++;
            updateTargetStack(stackB, moveB.r, moveB.c, triedB);
        }

        timelineA.push(hitsA);
        timelineB.push(hitsB);
        
        if (hitsA >= TOTAL_HITS_WIN || hitsB >= TOTAL_HITS_WIN) break;
    }

    return { 
        winner: hitsA >= TOTAL_HITS_WIN ? 'A' : 'B', 
        totalTurns: turns,
        timelineA: timelineA,
        timelineB: timelineB
    };
}

function getTacticalMove(type, enemyBoard, tried, stack) {
    if (type !== 'easy' && stack.length > 0) return stack.pop();
    if (type === 'hard') return calculateProbabilityMove(tried);
    return getRandomMove(tried);
}

function calculateProbabilityMove(tried) {
    let weights = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
    const shipLengths = [5, 3, 2]; 

    shipLengths.forEach(len => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (c + len <= SIZE) {
                    let possible = true;
                    for (let i = 0; i < len; i++) if (tried.has(`${r},${c+i}`)) { possible = false; break; }
                    if (possible) for (let i = 0; i < len; i++) weights[r][c+i]++;
                }
                if (r + len <= SIZE) {
                    let possible = true;
                    for (let i = 0; i < len; i++) if (tried.has(`${r+i},${c}`)) { possible = false; break; }
                    if (possible) for (let i = 0; i < len; i++) weights[r+i][c]++;
                }
            }
        }
    });

    let maxVal = -1, best = { r: 0, c: 0 }, found = false;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (!tried.has(`${r},${c}`)) {
                if (weights[r][c] > maxVal) { maxVal = weights[r][c]; best = { r, c }; found = true; }
            }
        }
    }
    return found ? best : getRandomMove(tried);
}

function createEmptyBoard() { return Array(SIZE).fill(0).map(() => Array(SIZE).fill(0)); }
function placeShipsSeeded(board) {
    SHIPS_CONFIG.forEach(ship => {
        let placed = false, attempts = 0;
        while (!placed && attempts < 100) {
            attempts++;
            let r = Math.floor(Math.random() * SIZE), c = Math.floor(Math.random() * SIZE), vert = Math.random() > 0.5;
            if (canPlace(board, r, c, ship.len, vert)) {
                for (let i=0; i<ship.len; i++) {
                    if (vert) board[r+i][c] = ship.len; else board[r][c+i] = ship.len;
                }
                placed = true;
            }
        }
    });
}
function canPlace(board, r, c, len, vert) {
    if (vert && r + len > SIZE) return false;
    if (!vert && c + len > SIZE) return false;
    for (let i=0; i<len; i++) if (board[vert ? r+i : r][vert ? c : c+i] !== 0) return false;
    return true;
}
function getRandomMove(tried) {
    let r, c;
    do { r = Math.floor(Math.random() * SIZE); c = Math.floor(Math.random() * SIZE); } while (tried.has(`${r},${c}`));
    return { r, c };
}
function updateTargetStack(stack, r, c, tried) {
    [[r-1,c], [r+1,c], [r,c-1], [r,c+1]].forEach(([nr, nc]) => {
        if (nr>=0 && nr<SIZE && nc>=0 && nc<SIZE && !tried.has(`${nr},${nc}`)) stack.push({r: nr, c: nc});
    });
}

// --- VISUALIZZAZIONE & GRAFICI ---
function displayFinalAnalysis(results, count) {
    const resultsArea = document.getElementById('results-area');
    resultsArea.style.display = 'block';
    
    // 1. Genera Grafici
    renderAllCharts(results, count);

    // 2. Genera Testo Statistico
    const textDiv = document.getElementById('analysis-text');
    let html = ``;

    for (let key in results) {
        const r = results[key];
        const avgTurns = (r.turnsHistory.reduce((a,b) => a+b, 0) / count).toFixed(1);
        const winPctA = ((r.aWins / count) * 100).toFixed(1);
        const winPctB = ((r.bWins / count) * 100).toFixed(1);
        
        // Stile inline forte per garantire visibilità nel PDF
        html += `
        <div style="margin-bottom:15px; padding:15px; border-left:5px solid #00f2ff; background:#111; border-radius:4px; page-break-inside: avoid;">
            <div style="font-size: 1.2em; margin-bottom: 8px; font-weight:bold; border-bottom:1px solid #333; padding-bottom:5px;">
                <span style="color:#00f2ff">${PRETTY_NAMES[r.algoA]}</span> 
                <span style="color:#fff; font-size:0.8em;">VS</span> 
                <span style="color:#ff0055">${PRETTY_NAMES[r.algoB]}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:1em;">
                <div style="text-align:center;">
                    <div style="color:#888; font-size:0.8em;">VITTORIE BLU</div>
                    <div style="color:#00f2ff; font-weight:bold; font-size:1.4em;">${winPctA}%</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#888; font-size:0.8em;">MEDIA TURNI</div>
                    <div style="color:#ffee00; font-weight:bold; font-size:1.4em;">${avgTurns}</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#888; font-size:0.8em;">VITTORIE ROSSO</div>
                    <div style="color:#ff0055; font-weight:bold; font-size:1.4em;">${winPctB}%</div>
                </div>
            </div>
        </div>`;
    }
    textDiv.innerHTML = html;
}

function renderAllCharts(results, count) {
    const container = document.getElementById('charts-container');
    
    for (let key in results) {
        const r = results[key];
        
        const wrapper = document.createElement('div');
        wrapper.className = 'multi-chart-wrapper no-break'; 
        // Sfondo leggermente trasparente per lo schermo, ma solido per il PDF
        wrapper.style.cssText = "position: relative; height: 300px; width: 100%; border: 1px solid rgba(255,255,255,0.1); padding: 10px; background: rgba(0,0,0,0.5); border-radius: 6px; margin-bottom: 20px;";
        
        const canvas = document.createElement('canvas');
        canvas.id = `chart_${key}`;
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const limitX = Math.min(r.maxTurnsReached, 120); 
        const labels = Array.from({length: limitX}, (_, i) => i + 1);
        
        const dataA = [];
        const dataB = [];

        for (let i = 0; i < limitX; i++) {
            dataA.push((r.timelineSumA[i] || 0) / count);
            dataB.push((r.timelineSumB[i] || 0) / count);
        }

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: PRETTY_NAMES[r.algoA],
                        data: dataA,
                        borderColor: '#00f2ff',
                        backgroundColor: '#00f2ff',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        tension: 0.4
                    },
                    {
                        label: PRETTY_NAMES[r.algoB],
                        data: dataB,
                        borderColor: '#ff0055',
                        backgroundColor: '#ff0055',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: `${PRETTY_NAMES[r.algoA]} vs ${PRETTY_NAMES[r.algoB]} (Media Trend)`,
                        color: '#fff',
                        font: { family: 'Courier New', size: 14 }
                    },
                    legend: { labels: { color: '#ccc', font: { family: 'monospace' } } },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        titleColor: '#fff',
                        borderColor: '#fff',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'TURNI', color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888' }
                    },
                    y: {
                        title: { display: true, text: 'NAVI COLPITE', color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#888' },
                        max: 17 
                    }
                }
            }
        });
    }
}

// --- FUNZIONE GENERAZIONE PDF CORRETTA ---
async function generatePdfFromElement(element) {
    if (!element) throw new Error("Elemento PDF non trovato");

    // 1. Reset scroll per evitare immagini nere
    const originalScroll = window.scrollY || 0;
    window.scrollTo(0, 0);

    // 2. Nascondi la scanline e i controlli
    const scanline = document.querySelector('.scanline');
    if (scanline) scanline.classList.add('pdf-hidden');
    
    const controls = Array.from(document.querySelectorAll('.btn-neon, .btn-reset, .setup-controls'));
    controls.forEach(el => el.classList.add('pdf-hidden'));

    // 3. Ridimensiona i grafici per farli entrare nella pagina
    const chartContainers = Array.from(element.querySelectorAll('.multi-chart-wrapper'));
    const savedHeights = [];
    chartContainers.forEach((c) => {
        savedHeights.push({ el: c, height: c.style.height || '' });
        c.style.height = '160px'; // Riduce altezza per PDF
    });

    // 4. Converti CANVAS in IMMAGINI (Cruciale per non avere grafici vuoti)
    const canvases = Array.from(element.querySelectorAll('canvas'));
    const replacements = [];
    for (const canvas of canvases) {
        try {
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const img = document.createElement('img');
            img.className = 'chart-pdf-img';
            img.src = dataUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            
            const parent = canvas.parentNode;
            const displayStyle = canvas.style.display || '';
            canvas.style.display = 'none';
            parent.appendChild(img);
            
            replacements.push({ canvas, img, displayStyle });
        } catch (err) { console.warn(err); }
    }

    // Pausa tecnica per rendering DOM
    await new Promise(res => setTimeout(res, 200));

    // 5. Configurazione HTML2PDF per Dark Mode
    const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-').replace('T','_');
    const filename = `StressTest_Report-${timestamp}.pdf`;
    
    const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#050a10', // Sfondo scuro FORZATO
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error(err);
        alert("Errore PDF");
    } finally {
        // 6. Ripristina tutto
        replacements.forEach(r => {
            r.img.remove();
            r.canvas.style.display = r.displayStyle;
        });
        savedHeights.forEach(h => {
            h.el.style.height = h.height;
        });
        if (scanline) scanline.classList.remove('pdf-hidden');
        controls.forEach(el => el.classList.remove('pdf-hidden'));
        window.scrollTo(0, originalScroll);
    }
}
