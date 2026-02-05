// js/report.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Recupera dati da localStorage
    const raw = localStorage.getItem('battleshipReport');
    if (!raw) {
        alert("Nessun report trovato in localStorage (chiave: 'battleshipReport'). Esegui prima una simulazione.");
        window.location.href = 'index.html';
        return;
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error("Errore parsing JSON report:", e);
        alert("Dati report corrotti. Controlla la console.");
        return;
    }

    // --- Elementi DOM richiesti (compatibilità con report.html)
    const elDate = document.getElementById('report-date');
    const elWinner = document.getElementById('winner-name');
    const elAlgoA = document.getElementById('algo-a');
    const elAlgoB = document.getElementById('algo-b');
    const elAccA = document.getElementById('acc-a');
    const elAccB = document.getElementById('acc-b');
    const elTotalTurns = document.getElementById('total-turns');

    const canvasA = document.getElementById('chartA');
    const canvasB = document.getElementById('chartB');
    const canvasC = document.getElementById('comparisonChart');

    // --- Popola testi base
    elDate && (elDate.innerText = `DATA: ${data.timestamp || new Date().toLocaleString()}`);
    elTotalTurns && (elTotalTurns.innerText = (data.turns != null) ? data.turns : (data.log ? data.log.length : 0));

    // Determina nomi/agenti
    const isHvA = data.params && data.params.mode && String(data.params.mode).toUpperCase().includes('HVA');
    const nameA = (data.stats && data.stats.A && data.stats.A.algo) ? data.stats.A.algo : (isHvA ? 'UTENTE' : 'AGENTE A');
    const nameB = (data.stats && data.stats.B && data.stats.B.algo) ? data.stats.B.algo : (isHvA ? 'IA' : 'AGENTE B');

    elAlgoA && (elAlgoA.innerText = nameA);
    elAlgoB && (elAlgoB.innerText = nameB);

    // Winner
    const winner = data.winner || (data.result && data.result.winner) || null;
    if (elWinner) {
        if (winner === 'A' || winner === nameA) { elWinner.innerText = `${nameA} HA VINTO`; elWinner.style.color = '#00f2ff'; }
        else if (winner === 'B' || winner === nameB) { elWinner.innerText = `${nameB} HA VINTO`; elWinner.style.color = '#ff0055'; }
        else { elWinner.innerText = "NESSUN VINCITORE"; elWinner.style.color = '#ffffff'; }
    }

    // --- Statistiche: hits/misses (safe access)
    function statOf(side) {
        if (!data.stats || !data.stats[side]) return { hits: 0, misses: 0, total: 0 };
        const s = data.stats[side];
        const hits = Number(s.hits || 0);
        const misses = Number(s.misses || 0);
        return { hits, misses, total: hits + misses };
    }
    const sA = statOf('A');
    const sB = statOf('B');
    const accPercent = (s) => (s.total > 0 ? ((s.hits / s.total) * 100).toFixed(1) : '0.0');
    elAccA && (elAccA.innerText = `${accPercent(sA)}%`);
    elAccB && (elAccB.innerText = `${accPercent(sB)}%`);

    // --- Grafici Chart.js (disabilito animazioni per esport)
    const commonOpts = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } };
    const colorA = '#00f2ff';
    const colorB = '#ff0055';

    try {
        if (canvasA) {
            new Chart(canvasA.getContext('2d'), {
                type: 'doughnut',
                data: { labels: ['Colpito','Acqua'], datasets: [{ data: [sA.hits, sA.misses], backgroundColor: [colorA, '#071517'], borderWidth: 1 }] },
                options: { cutout: '70%', ...commonOpts }
            });
        }
        if (canvasB) {
            new Chart(canvasB.getContext('2d'), {
                type: 'doughnut',
                data: { labels: ['Colpito','Acqua'], datasets: [{ data: [sB.hits, sB.misses], backgroundColor: [colorB, '#2c0b10'], borderWidth: 1 }] },
                options: { cutout: '70%', ...commonOpts }
            });
        }
        if (canvasC) {
            new Chart(canvasC.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Colpi a Segno','Colpi a Vuoto'],
                    datasets: [
                        { label: nameA, data: [sA.hits, sA.misses], backgroundColor: 'rgba(0,242,255,0.6)', borderColor: colorA, borderWidth: 1 },
                        { label: nameB, data: [sB.hits, sB.misses], backgroundColor: 'rgba(255,0,85,0.6)', borderColor: colorB, borderWidth: 1 }
                    ]
                },
                options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: true } } }
            });
        }
    } catch (err) {
        console.warn("Errore creazione grafici:", err);
    }

    // --- Helpers: converti canvas in immagine ad alta risoluzione
    function canvasToImageDataURL(origCanvas, scale = 2) {
        if (!origCanvas || !origCanvas.toDataURL) return null;
        // dimensioni reali in pixel del canvas
        const w = origCanvas.width;
        const h = origCanvas.height;
        const tmp = document.createElement('canvas');
        // scale dinamico: più alto su schermi HiDPI
        const deviceScale = Math.max(2, (window.devicePixelRatio || 1) * scale);
        tmp.width = Math.max(1, Math.floor(w * deviceScale));
        tmp.height = Math.max(1, Math.floor(h * deviceScale));
        const tctx = tmp.getContext('2d');
        // riempi sfondo (manteniamo scuro come UI: #050a10) -> utile per fedeltà visiva
        tctx.fillStyle = '#050a10';
        tctx.fillRect(0, 0, tmp.width, tmp.height);
        tctx.drawImage(origCanvas, 0, 0, tmp.width, tmp.height);
        return tmp.toDataURL('image/png', 1.0);
    }

    // --- Miglior resa: applica piccole modifiche inline al clone per il PDF
    function polishCloneForPdf(cloneRoot) {
        if (!cloneRoot) return;
        // Evita che elementi vengano spezzati tra pagine
        const statCards = cloneRoot.querySelectorAll('.stat-card');
        statCards.forEach(el => {
            el.style.pageBreakInside = 'avoid';
            el.style.WebkitColumnBreakInside = 'avoid';
            el.style.breakInside = 'avoid';
        });
        // Assicura il banner "WINNER" molto visibile
        const banner = cloneRoot.querySelector('.winner-banner') || cloneRoot.querySelector('#winner-name');
        if (banner) {
            banner.style.boxSizing = 'border-box';
            banner.style.padding = '14px';
            banner.style.border = '2px solid rgba(255,255,255,0.06)';
            banner.style.marginBottom = '10px';
            banner.style.textAlign = 'center';
        }
        // Mantenere colori scuri in wrapper
        cloneRoot.style.background = '#050a10';
        cloneRoot.style.color = '#fff';
    }

    // --- Generazione PDF con html2pdf (download diretto) — senza prompt
    async function generateHighResPdf() {
        const btn = document.getElementById('download-pdf');
        const originalText = btn ? btn.innerText : null;
        if (btn) { btn.disabled = true; btn.innerText = 'GENERAZIONE...'; btn.style.opacity = '0.7'; }

        try {
            const element = document.getElementById('pdf-content');
            if (!element) throw new Error("Elemento #pdf-content non trovato.");

            // Clona l'elemento per non alterare il DOM visibile
            const clone = element.cloneNode(true);

            // Sostituisci i canvas all'interno del clone con immagini ad alta risoluzione prese dagli originali
            const origCanvases = element.querySelectorAll('canvas');
            const cloneCanvases = clone.querySelectorAll('canvas');

            cloneCanvases.forEach((c, idx) => {
                const parent = c.parentNode;
                const orig = origCanvases[idx];
                const dataUrl = canvasToImageDataURL(orig, 2.5); // alta qualità
                if (dataUrl) {
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.alt = 'chart';
                    img.style.display = 'block';
                    img.style.margin = '12px auto';
                    // mantieni le stesse dimensioni visive del canvas
                    img.style.width = getComputedStyle(c).width || '100%';
                    img.style.height = getComputedStyle(c).height || 'auto';
                    parent.replaceChild(img, c);
                } else {
                    // se non disponibile, rimuovi il canvas
                    c.remove();
                }
            });

            // Applica piccole migliorie al clone per il PDF
            polishCloneForPdf(clone);

            // Wrapper per html2pdf: manteniamo sfondo scuro così come appare in UI
            const wrapper = document.createElement('div');
            wrapper.style.background = '#050a10';
            wrapper.style.padding = '8px';
            wrapper.appendChild(clone);

            // Opzioni per html2pdf — ottimizzate per fedeltà visiva
            const opt = {
                margin:       [10, 10, 10, 10], // mm (top,right,bottom,left)
                filename:     `Mission_Report_${Date.now()}.pdf`,
                image:        { type: 'jpeg', quality: 0.96 },
                html2canvas:  {
                    scale: Math.min(3, (window.devicePixelRatio || 1) * 2.0),
                    useCORS: true,
                    backgroundColor: '#050a10', // conserva sfondo scuro
                    scrollY: 0
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Esegui salvataggio diretto
            await html2pdf().set(opt).from(wrapper).save();
        } catch (err) {
            console.error("Errore generazione PDF:", err);
            alert("Errore durante la generazione del PDF. Controlla la console per dettagli.");
        } finally {
            if (btn) { btn.disabled = false; btn.innerText = originalText; btn.style.opacity = '1'; }
        }
    }

    // --- Pulsante: scarica PDF DIRECT (nessun alert/confirm)
    const dlBtn = document.getElementById('download-pdf');
    if (dlBtn) {
        dlBtn.addEventListener('click', async (ev) => {
            // Clic normale: genera il PDF immagine ad alta fedeltà (layout visivo)
            // Se serve un PDF con testo selezionabile, tieni premuto SHIFT mentre clicchi (feature secondaria)
            if (ev.shiftKey) {
                // Shift+click apre la finestra di stampa per "Salva come PDF" (testo selezionabile)
                openPrintableWindow();
            } else {
                // Click normale: genera e scarica direttamente (nessun prompt)
                await generateHighResPdf();
            }
        });
        // piccolo aiuto UX: titolo del bottone
        dlBtn.title = "Clic: scarica PDF (aspetto grafico). Shift+Clic: apri Stampa (testo selezionabile)";
    }

    // --- Funzione per aprire la finestra di stampa (testo selezionabile) — usata solo con SHIFT+click
    function openPrintableWindow() {
        const content = document.getElementById('pdf-content');
        if (!content) { alert("Elemento di report non trovato."); return; }
        const clone = content.cloneNode(true);

        // converti i canvas in immagini (per preservare grafici nella stampa)
        const origCanvases = content.querySelectorAll('canvas');
        const cloneCanvases = clone.querySelectorAll('canvas');
        cloneCanvases.forEach((c, idx) => {
            const parent = c.parentNode;
            const orig = origCanvases[idx];
            const dataUrl = canvasToImageDataURL(orig, 2);
            if (dataUrl) {
                const img = document.createElement('img');
                img.src = dataUrl;
                img.className = 'chart';
                img.alt = 'chart';
                img.style.width = '100%';
                img.style.height = 'auto';
                parent.replaceChild(img, c);
            } else {
                c.remove();
            }
        });

        // setta tema per stampa leggibile (bianco)
        clone.style.background = '#fff';
        clone.style.color = '#000';

        const styleForPrint = `
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 12mm; color:#000; background:#fff; }
                .report-container { box-shadow: none !important; border: none !important; max-width: 780px; }
                h1 { font-size: 18px; margin: 0 0 6px 0; }
                h2 { font-size: 12px; margin: 8px 0 6px 0; }
                .stat-card { border:1px solid #ddd; padding:8px; margin-bottom:10px; page-break-inside: avoid; }
                .winner-banner { padding:8px; border:1px solid #ddd; background:#f5f5f5; margin-bottom:10px; text-transform:uppercase; }
                .data-label { font-size:10px; color:#666; text-transform:uppercase; }
                .data-val { font-weight:700; font-size:14px; }
                img.chart { display:block; margin:8px 0; max-width:100%; height:auto; }
                @page { size: A4; margin: 12mm; }
            </style>
        `;

        const win = window.open('', '_blank', 'noopener,noreferrer');
        if (!win) { alert("Pop-up bloccato: abilita popup e riprova."); return; }
        win.document.open();
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Mission Report - Stampa</title>${styleForPrint}</head><body>${clone.outerHTML}<script>window.onload=function(){setTimeout(()=>{window.print();},250);};</script></body></html>`);
        win.document.close();
        win.focus();
    }

    // Fine DOMContentLoaded
});
