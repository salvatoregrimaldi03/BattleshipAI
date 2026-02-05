// js/report.js
// Report grafico con nuova visualizzazione LINE CHART per l'andamento

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. RECUPERO DATI
    // ---------------------------------------------------------
    const rawData = localStorage.getItem('battleshipReport');
    
    if (!rawData) {
        alert("Nessun dato di battaglia trovato. Esegui prima una simulazione o una partita.");
        window.location.href = 'index.html';
        return;
    }

    const data = JSON.parse(rawData);
    const isHvA = data.params && data.params.mode === 'HVA';

    // ---------------------------------------------------------
    // 2. POPOLAMENTO UI
    // ---------------------------------------------------------
    document.getElementById('report-date').innerText = `DATA: ${data.timestamp || new Date().toLocaleDateString()}`;
    document.getElementById('total-turns').innerText = data.turns ?? 0;
    
    const winnerSpan = document.getElementById('winner-name');

    let labelA = "AGENTE A";
    let labelB = "AGENTE B";
    let colorA = "#00f2ff"; 
    let colorB = "#ff0055"; 

    if (isHvA) {
        labelA = "UTENTE";
        labelB = data.params.iaDifficultyLabel || (data.stats.B && data.stats.B.algo) || 'IA';

        if (data.winner === 'A') {
            winnerSpan.innerText = labelA + " (VITTORIA)";
            winnerSpan.style.color = colorA;
        } else {
            winnerSpan.innerText = "IA (VITTORIA)";
            winnerSpan.style.color = colorB;
        }
    } else {
        labelA = (data.stats && data.stats.A && data.stats.A.algo) ? data.stats.A.algo : 'IA_A';
        labelB = (data.stats && data.stats.B && data.stats.B.algo) ? data.stats.B.algo : 'IA_B';
        
        const winner = data.winner || '?';
        winnerSpan.innerText = (winner === 'A') ? `${labelA} HA VINTO` : `${labelB} HA VINTO`;
        winnerSpan.style.color = (winner === 'A') ? colorA : colorB;
    }

    document.getElementById('algo-a').innerText = labelA;
    document.getElementById('algo-b').innerText = labelB;

    const getStats = (statsObj) => {
        const hits = (statsObj && statsObj.hits) ? Number(statsObj.hits) : 0;
        const misses = (statsObj && statsObj.misses) ? Number(statsObj.misses) : 0;
        return { hits, misses, total: hits + misses };
    };

    const statsA = getStats(data.stats ? data.stats.A : null);
    const statsB = getStats(data.stats ? data.stats.B : null);

    const accA = statsA.total > 0 ? ((statsA.hits / statsA.total) * 100).toFixed(1) : '0.0';
    const accB = statsB.total > 0 ? ((statsB.hits / statsB.total) * 100).toFixed(1) : '0.0';

    document.getElementById('acc-a').innerText = `${accA}%`;
    document.getElementById('acc-b').innerText = `${accB}%`;

    // ---------------------------------------------------------
    // 3. GENERAZIONE GRAFICI
    // ---------------------------------------------------------
    
    const pieConfig = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } }
    };

    new Chart(document.getElementById('chartA'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [statsA.hits, statsA.misses],
                backgroundColor: [colorA, '#0b2326'],
                borderColor: colorA,
                borderWidth: 1
            }]
        },
        options: { cutout: '70%', ...pieConfig }
    });

    new Chart(document.getElementById('chartB'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [statsB.hits, statsB.misses],
                backgroundColor: [colorB, '#330b15'],
                borderColor: colorB,
                borderWidth: 1
            }]
        },
        options: { cutout: '70%', ...pieConfig }
    });

    // ---------------------------------------------------------
    // 4. GRAFICO DI COMPARAZIONE (LINE CHART TIMELINE)
    // ---------------------------------------------------------
    
    // Preparazione dati Timeline
    const history = data.history || [];
    const turns = data.turns || 0;
    
    // Creiamo array per i datapoint. 
    // Usiamo lo scatter style o line style dove X è il turno e Y sono i colpi cumulativi.
    
    let datasetA = [];
    let datasetB = [];
    
    let cumHitsA = 0;
    let cumHitsB = 0;
    
    // Mappa per riempire i buchi se un turno non ha eventi per un giocatore
    // Inizializziamo punto 0
    datasetA.push({x: 0, y: 0});
    datasetB.push({x: 0, y: 0});

    // Iteriamo sulla storia
    history.forEach(evt => {
        if (evt.shooter === 'A') {
            if (evt.isHit) cumHitsA++;
            datasetA.push({ x: evt.turn, y: cumHitsA });
        } else {
            if (evt.isHit) cumHitsB++;
            datasetB.push({ x: evt.turn, y: cumHitsB });
        }
    });

    // Aggiungi punto finale se necessario per pareggiare la lunghezza del grafico sull'asse X
    datasetA.push({ x: turns, y: cumHitsA });
    datasetB.push({ x: turns, y: cumHitsB });

    new Chart(document.getElementById('comparisonChart'), {
        type: 'line',
        data: {
            datasets: [
                {
                    label: labelA,
                    data: datasetA,
                    borderColor: colorA,
                    backgroundColor: colorA,
                    borderWidth: 2,
                    tension: 0.1, // Linea leggermente tesa, non curva troppo
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    stepped: false
                },
                {
                    label: labelB,
                    data: datasetB,
                    borderColor: colorB,
                    backgroundColor: colorB,
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    stepped: false
                }
            ]
        },
        options: {
            animation: false, // Disabilita animazione per PDF sicuro
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#fff', font: { family: 'monospace' } }
                },
                tooltip: {
                    enabled: true, // ABILITA TOOLTIP INTERATTIVI
                    backgroundColor: 'rgba(5, 10, 16, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: '#fff',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            return 'Turno: ' + context[0].parsed.x;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += context.parsed.y + ' Colpi a segno';
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'TURNI DI GIOCO', color: '#666' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888', font: { family: 'monospace' }, stepSize: 5 }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'NAVI COLPITE (Cumulativo)', color: '#666' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#888', font: { family: 'monospace' }, stepSize: 1 },
                    suggestedMax: 17 // Max navi in battleship standard
                }
            }
        }
    });

    // ---------------------------------------------------------
    // 5. DOWNLOAD PDF
    // ---------------------------------------------------------
    const downloadBtn = document.getElementById('download-pdf');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const element = document.getElementById('pdf-content');
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Mission_Report_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 3, 
                    backgroundColor: '#050a10',
                    useCORS: true,
                    scrollY: 0,
                    windowWidth: document.documentElement.offsetWidth
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            const originalText = downloadBtn.innerText;
            downloadBtn.innerText = "GENERAZIONE IN CORSO...";
            downloadBtn.style.opacity = "0.7";
            downloadBtn.disabled = true;
            window.scrollTo(0,0);

            html2pdf().set(opt).from(element).save().then(() => {
                downloadBtn.innerText = originalText;
                downloadBtn.style.opacity = "1";
                downloadBtn.disabled = false;
            }).catch(err => {
                console.error("Errore PDF:", err);
                downloadBtn.innerText = "ERRORE";
                setTimeout(() => downloadBtn.disabled = false, 3000);
            });
        });
    }
});
