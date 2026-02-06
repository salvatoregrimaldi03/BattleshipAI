// report.js — versione aggiornata per forzare PDF su 1 pagina
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const reportType = params.get('type'); // 'viewing', 'current', o null (default)

    let storageKey = 'battleshipReport';
    if (reportType === 'viewing') 
        storageKey = 'battleshipReport_viewing';
    
    else if (reportType === 'current') 
        storageKey = 'battleshipReport_current';

    console.log(`Caricamento report. Tipo: ${reportType}, Chiave: ${storageKey}`);

    const rawData = localStorage.getItem(storageKey);
    if (!rawData) {
        alert("Nessun dato di battaglia trovato per la tipologia richiesta.");
        window.close();
        return;
    }

    const data = JSON.parse(rawData);
    const isHvA = data.params && data.params.mode === 'HVA';

    // Popola i metadati UI
    const reportDateEl = document.getElementById('report-date');
    if (reportDateEl) reportDateEl.innerText = `DATA: ${data.timestamp || new Date().toLocaleDateString()}`;
    const totalTurnsEl = document.getElementById('total-turns');
    if (totalTurnsEl) totalTurnsEl.innerText = data.turns ?? 0;

    const winnerSpan = document.getElementById('winner-name');
    let labelA = "AGENTE A", labelB = "AGENTE B";
    const colorA = "#00f2ff", colorB = "#ff0055";

    if (winnerSpan) {
        if (isHvA) {
            labelA = "UTENTE";
            labelB = data.params.iaDifficultyLabel || (data.stats && data.stats.B && data.stats.B.algo) || 'IA';
            winnerSpan.innerText = (data.winner === 'A') ? `${labelA} (VITTORIA)` : `IA (VITTORIA)`;
            winnerSpan.style.color = (data.winner === 'A') ? colorA : colorB;
        } else {
            labelA = (data.stats && data.stats.A && data.stats.A.algo) ? data.stats.A.algo : 'IA_A';
            labelB = (data.stats && data.stats.B && data.stats.B.algo) ? data.stats.B.algo : 'IA_B';
            const winner = data.winner || '?';
            winnerSpan.innerText = (winner === 'A') ? `${labelA} HA VINTO` : `${labelB} HA VINTO`;
            winnerSpan.style.color = (winner === 'A') ? colorA : colorB;
        }
    }

    const algoAEl = document.getElementById('algo-a');
    const algoBEl = document.getElementById('algo-b');
    if (algoAEl) algoAEl.innerText = labelA;
    if (algoBEl) algoBEl.innerText = labelB;

    // Statistiche di base
    const getStats = s => {
        const hits = s && s.hits ? Number(s.hits) : 0;
        const misses = s && s.misses ? Number(s.misses) : 0;
        return { hits, misses, total: hits + misses };
    };
    const statsA = getStats(data.stats && data.stats.A);
    const statsB = getStats(data.stats && data.stats.B);
    const accA = statsA.total > 0 ? ((statsA.hits / statsA.total) * 100).toFixed(1) : '0.0';
    const accB = statsB.total > 0 ? ((statsB.hits / statsB.total) * 100).toFixed(1) : '0.0';

    const accAel = document.getElementById('acc-a');
    const accBel = document.getElementById('acc-b');
    if (accAel) accAel.innerText = `${accA}%`;
    if (accBel) accBel.innerText = `${accB}%`;

    // Charts (Chart.js deve essere incluso nella pagina)
    try {
        const pieConfig = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } } };

        if (document.getElementById('chartA')) {
            new Chart(document.getElementById('chartA'), {
                type: 'doughnut',
                data: { labels: ['Colpito', 'Acqua'], datasets: [{ data: [statsA.hits, statsA.misses], backgroundColor: [colorA, '#0b2326'], borderColor: 'transparent', borderWidth: 0 }] },
                options: { cutout: '70%', ...pieConfig }
            });
        }

        if (document.getElementById('chartB')) {
            new Chart(document.getElementById('chartB'), {
                type: 'doughnut',
                data: { labels: ['Colpito', 'Acqua'], datasets: [{ data: [statsB.hits, statsB.misses], backgroundColor: [colorB, '#330b15'], borderColor: 'transparent', borderWidth: 0 }] },
                options: { cutout: '70%', ...pieConfig }
            });
        }

        // Comparison line
        const history = data.history || [];
        const turns = data.turns || 0;
        let datasetA = [{ x: 0, y: 0 }], datasetB = [{ x: 0, y: 0 }];
        let cumA = 0, cumB = 0;
        history.forEach(evt => {
            if (evt.shooter === 'A') { if (evt.isHit) cumA++; datasetA.push({ x: evt.turn, y: cumA }); }
            else { if (evt.isHit) cumB++; datasetB.push({ x: evt.turn, y: cumB }); }
        });
        datasetA.push({ x: turns, y: cumA });
        datasetB.push({ x: turns, y: cumB });

        if (document.getElementById('comparisonChart')) {
            new Chart(document.getElementById('comparisonChart'), {
                type: 'line',
                data: { datasets: [
                    { label: labelA, data: datasetA, borderColor: colorA, backgroundColor: colorA, borderWidth: 2, tension: 0.1, pointRadius: 3 },
                    { label: labelB, data: datasetB, borderColor: colorB, backgroundColor: colorB, borderWidth: 2, tension: 0.1, pointRadius: 3 }
                ] },
                options: {
                    animation: false, responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, labels: { color: '#fff', font: { family: 'monospace' } } },
                        tooltip: {
                            enabled: true, backgroundColor: 'rgba(5,10,16,0.9)', titleColor: '#fff', bodyColor: '#ccc',
                            borderColor: '#fff', borderWidth: 1, displayColors: true,
                            callbacks: {
                                title: ctx => 'Turno: ' + ctx[0].parsed.x,
                                label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y} Colpi a segno`
                            }
                        }
                    },
                    scales: {
                        x: { type: 'linear', title: { display: true, text: 'TURNI DI GIOCO', color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', font: { family: 'monospace' } } },
                        y: { beginAtZero: true, title: { display: true, text: 'NAVI COLPITE (Cumulativo)', color: '#666' }, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#888', font: { family: 'monospace' } }, suggestedMax: 17 }
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Chart rendering error:', e);
    }

    // DOWNLOAD PDF
    const downloadBtn = document.getElementById('download-pdf');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const originalText = downloadBtn.innerText;
            downloadBtn.innerText = "GENERAZIONE IN CORSO...";
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.7';
            try {
                await generatePdfFromElement(document.getElementById('pdf-content'), reportType);
            } catch (err) {
                console.error("Errore PDF:", err);
                alert("Errore durante la generazione del PDF. Controlla la console.");
            } finally {
                downloadBtn.innerText = originalText;
                downloadBtn.disabled = false;
                downloadBtn.style.opacity = '1';
            }
        });
    }

    // --- Funzione migliorata per generare il PDF (1 pagina solo) ---
    async function generatePdfFromElement(element, reportType) {
        if (!element) throw new Error("Elemento PDF non trovato");

        // SALVA stato
        const originalScroll = window.scrollY || 0;
        window.scrollTo(0, 0);

        // parametri di pagina in mm (A4)
        const pageHeightMm = 297;
        const pageWidthMm = 210;
        // margini che useremo per html2pdf (top, right, bottom, left) in mm
        const marginMm = 8; // usiamo 8mm per lato — compatto
        const printableHeightMm = pageHeightMm - (marginMm * 2);

        // elementi da rimuovere temporaneamente (li salviamo per ripristino)
        const removedNodes = [];
        const genNodes = Array.from(element.querySelectorAll('.generated-by, .footer-note'));
        genNodes.forEach(n => {
            // sposta in array e poi rimuovi dal DOM
            removedNodes.push({ node: n, parent: n.parentNode, nextSibling: n.nextSibling });
            n.parentNode.removeChild(n);
        });

        // nascondi elementi UI globali (classe .pdf-hidden definita in CSS)
        const controls = Array.from(document.querySelectorAll('.scanline, .controls-area, .btn-neon, .btn-reset'));
        controls.forEach(el => el.classList.add('pdf-hidden'));

        // SALVA e riduci temporaneamente le altezze dei chart per far sì che tutto entri in una pagina
        const chartContainers = Array.from(element.querySelectorAll('.chart-container'));
        const comparisonContainers = Array.from(element.querySelectorAll('.comparison-container'));
        const savedHeights = [];

        chartContainers.forEach((c, i) => {
            savedHeights.push({ el: c, height: c.style.height || '' });
            c.style.height = '190px'; // più compatto
        });
        comparisonContainers.forEach((c, i) => {
            savedHeights.push({ el: c, height: c.style.height || '' });
            c.style.height = '230px';
        });

        // Forza max-height del contenuto in mm (usa unità mm per avere comportamento coerente con A4)
        const originalMaxHeight = element.style.maxHeight || '';
        const originalOverflow = element.style.overflow || '';
        element.style.maxHeight = printableHeightMm + 'mm';
        element.style.overflow = 'hidden';
        element.style.boxSizing = 'border-box';

        // converte canvas in immagini temporanee (per evitare artefatti)
        const canvases = Array.from(element.querySelectorAll('canvas'));
        const replacements = []; // { canvas, img, canvasDisplay }
        for (const canvas of canvases) {
            try {
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                const img = document.createElement('img');
                img.className = 'chart-pdf-image';
                img.src = dataUrl;
                img.style.width = canvas.style.width || canvas.width + 'px';
                img.style.height = 'auto';
                img.alt = 'chart';
                replacements.push({ canvas, img, canvasDisplay: canvas.style.display || '' });
                canvas.parentNode.insertBefore(img, canvas);
                canvas.style.display = 'none';
            } catch (err) {
                console.warn('Impossibile convertire canvas:', err);
            }
        }

        // attendi repaint
        await new Promise(res => setTimeout(res, 220));

        // opzioni html2pdf — margin in mm coerente con @page CSS
        const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-').replace('T','_');
        const filename = `Battleship_Mission_Report-${timestamp}.pdf`;
        const opt = {
            margin: [marginMm, marginMm, marginMm, marginMm], // mm: top, right, bottom, left
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)), // qualità/peso
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#050a10',
                scrollY: 0,
                scrollX: 0,
                windowWidth: document.documentElement.clientWidth || 1200
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        try {
            // genera e salva
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('Errore generazione PDF:', err);
            throw err;
        } finally {
            // ripristina canvas / immagini temporanee
            replacements.forEach(r => {
                try { r.img.remove(); } catch (e) {}
                if (r.canvas) r.canvas.style.display = r.canvasDisplay || 'block';
            });

            // ripristina altezze dei chart
            savedHeights.forEach(h => {
                try { h.el.style.height = h.height; } catch (e) {}
            });

            // ripristina maxHeight / overflow
            element.style.maxHeight = originalMaxHeight;
            element.style.overflow = originalOverflow;

            // ripristina elementi rimossi
            removedNodes.forEach(r => {
                try {
                    if (r.nextSibling) r.parent.insertBefore(r.node, r.nextSibling);
                    else r.parent.appendChild(r.node);
                } catch (e) {
                    // fallback: append
                    try { r.parent.appendChild(r.node); } catch (e2) {}
                }
            });

            // ripristina controlli visibilità
            controls.forEach(el => el.classList.remove('pdf-hidden'));

            // ripristina scroll
            window.scrollTo(0, originalScroll);
        }
    }
});
