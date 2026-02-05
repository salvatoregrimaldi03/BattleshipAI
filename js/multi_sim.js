// js/multi_sim.js - Versione Professionale con Cambio Seed e Analisi Statistica

const SIZE = 12;
const SHIPS_CONFIG = [
    { name: "Portaerei", len: 5 },
    { name: "Incrociatore", len: 3 },
    { name: "Incrociatore", len: 3 },
    { name: "Cacciatorpediniere", len: 2 },
    { name: "Cacciatorpediniere", len: 2 },
    { name: "Sottomarino", len: 1 }
];

const ALGO_NAMES = { 'easy': 'Random', 'medium': 'Hunt & Target', 'hard': 'Prob. Map' };

document.getElementById('start-mass-sim').addEventListener('click', async () => {
    const count = parseInt(document.getElementById('sim-count').value);
    const results = {};
    const pairs = [['easy', 'medium'], ['easy', 'hard'], ['medium', 'hard']];

    // Reset UI
    document.getElementById('start-mass-sim').disabled = true;
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('results-area').style.display = 'none';
    
    let totalMatches = pairs.length * count;
    let completed = 0;

    for (let pair of pairs) {
        const key = `${pair[0]}_vs_${pair[1]}`;
        results[key] = { aWins: 0, bWins: 0, turnsHistory: [] };

        for (let i = 0; i < count; i++) {
            // CAMBIO SEED: Math.random() viene richiamato per ogni nuovo match
            // garantendo che le boardA e boardB siano sempre diverse.
            const match = runSingleMatch(pair[0], pair[1]);
            
            if (match.winner === 'A') results[key].aWins++;
            else results[key].bWins++;
            
            results[key].turnsHistory.push(match.turns);

            completed++;
            document.getElementById('progress-bar').style.width = (completed / totalMatches * 100) + '%';
            
            // Permette l'aggiornamento della UI ogni 20 match
            if (completed % 20 === 0) await new Promise(r => setTimeout(r, 0));
        }
    }

    displayFinalAnalysis(results, count);
});

function runSingleMatch(algoA, algoB) {
    let boardA = createEmptyBoard();
    let boardB = createEmptyBoard();
    
    // Il piazzamento usa Math.random(), quindi cambia ad ogni chiamata del loop
    placeShipsSeeded(boardA);
    placeShipsSeeded(boardB);

    let hitsToWin = SHIPS_CONFIG.reduce((a, b) => a + b.len, 0);
    let hitsA = 0, hitsB = 0;
    let turns = 0;
    let turn = 'A';

    let triedA = new Set(), triedB = new Set();
    let stackA = [], stackB = [];

    while (hitsA < hitsToWin && hitsB < hitsToWin && turns < 1000) {
        if (turn === 'A') {
            let move = getTacticalMove(algoA, boardB, triedA, stackA);
            triedA.add(`${move.r},${move.c}`);
            if (boardB[move.r][move.c] > 0) {
                hitsA++;
                updateTargetStack(stackA, move.r, move.c, triedA);
            }
            turn = 'B';
        } else {
            let move = getTacticalMove(algoB, boardA, triedB, stackB);
            triedB.add(`${move.r},${move.c}`);
            if (boardA[move.r][move.c] > 0) {
                hitsB++;
                updateTargetStack(stackB, move.r, move.c, triedB);
            }
            turn = 'A';
            turns++;
        }
    }
    return { winner: hitsA >= hitsToWin ? 'A' : 'B', turns };
}

function getTacticalMove(type, enemyBoard, tried, stack) {
    // Se c'è una nave colpita, finiscila (comportamento comune a Medium e Hard)
    if (type !== 'easy' && stack.length > 0) return stack.pop();

    if (type === 'hard') {
        return calculateProbabilityMove(tried);
    }
    
    // Default / Easy / Random
    return getRandomMove(tried);
}

function calculateProbabilityMove(tried) {
    let weights = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
    const shipLengths = [5, 4, 3, 2, 1];

    shipLengths.forEach(len => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                // Orizzontale
                if (c + len <= SIZE) {
                    let possible = true;
                    for (let i = 0; i < len; i++) if (tried.has(`${r},${c+i}`)) possible = false;
                    if (possible) for (let i = 0; i < len; i++) weights[r][c+i]++;
                }
                // Verticale
                if (r + len <= SIZE) {
                    let possible = true;
                    for (let i = 0; i < len; i++) if (tried.has(`${r+i},${c}`)) possible = false;
                    if (possible) for (let i = 0; i < len; i++) weights[r+i][c]++;
                }
            }
        }
    });

    let maxVal = -1;
    let best = { r: 0, c: 0 };
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (!tried.has(`${r},${c}`) && weights[r][c] > maxVal) {
                maxVal = weights[r][c];
                best = { r, c };
            }
        }
    }
    return best;
}

// --- FUNZIONI UTILITY ---
function createEmptyBoard() { return Array(SIZE).fill(0).map(() => Array(SIZE).fill(0)); }

function placeShipsSeeded(board) {
    SHIPS_CONFIG.forEach(ship => {
        let placed = false;
        while (!placed) {
            let r = Math.floor(Math.random() * SIZE);
            let c = Math.floor(Math.random() * SIZE);
            let vert = Math.random() > 0.5;
            if (canPlace(board, r, c, ship.len, vert)) {
                for (let i=0; i<ship.len; i++) {
                    if (vert) board[r+i][c] = ship.len;
                    else board[r][c+i] = ship.len;
                }
                placed = true;
            }
        }
    });
}

function canPlace(board, r, c, len, vert) {
    if (vert && r + len > SIZE) return false;
    if (!vert && c + len > SIZE) return false;
    for (let i=0; i<len; i++) {
        let currR = vert ? r+i : r;
        let currC = vert ? c : c+i;
        if (board[currR][currC] !== 0) return false;
    }
    return true;
}

function getRandomMove(tried) {
    let r, c;
    do { r = Math.floor(Math.random() * SIZE); c = Math.floor(Math.random() * SIZE); } 
    while (tried.has(`${r},${c}`));
    return { r, c };
}

function updateTargetStack(stack, r, c, tried) {
    [[r-1,c], [r+1,c], [r,c-1], [r,c+1]].forEach(([nr, nc]) => {
        if (nr>=0 && nr<SIZE && nc>=0 && nc<SIZE && !tried.has(`${nr},${nc}`)) {
            stack.push({r: nr, c: nc});
        }
    });
}

function displayFinalAnalysis(results, count) {
    document.getElementById('start-mass-sim').disabled = false;
    document.getElementById('results-area').style.display = 'block';
    
    const textDiv = document.getElementById('analysis-text');
    let html = `<h3>REPORT STATISTICO POST-SIMULAZIONE (${count} match/coppia)</h3>`;
    
    for (let key in results) {
        const r = results[key];
        const avgTurns = (r.turnsHistory.reduce((a,b) => a+b, 0) / count).toFixed(1);
        const winRateB = ((r.bWins / count) * 100).toFixed(1);
        
        html += `<div style="margin-bottom:20px; padding:10px; border-left:4px solid #00f2ff; background:rgba(255,255,255,0.05);">
            <b style="color:#00f2ff">${key.replace('_vs_', ' VS ').toUpperCase()}</b><br>
            Vittorie Destra: <span style="color:#ff0055">${winRateB}%</span> | 
            Media Turni: <span style="color:#ffee00">${avgTurns}</span><br>
            <i>${winRateB > 95 ? "Dominanza Assoluta: L'algoritmo non lascia spazio al caso." : "Competizione Attiva: Il seed variabile permette recuperi."}</i>
        </div>`;
    }
    textDiv.innerHTML = html;
}