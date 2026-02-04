// js/ai_vs_ai.js
// Simulazione Battleship IA vs IA — console private per ogni agente

// ---------------- CONFIG ----------------
const SIZE = 12;
const SHIPS_CONFIG = [
    {name: "Portaerei", len: 5},
    {name: "Incrociatore", len: 3},
    {name: "Incrociatore", len: 3},
    {name: "Cacciatorpediniere", len: 2},
    {name: "Cacciatorpediniere", len: 2},
    {name: "Sottomarino", len: 1}
];

// ---------------- STATO GLOBALE ----------------
let boardA, boardB, knowA, knowB;
let turn = 'A';
let simTurnCount = 0;
let running = false;
let simTimeout = null;
let stackA = [], stackB = [];
let showShipsA = false, showShipsB = false;

// ---------------- LOGGING ----------------
/**
 * logSim(msg, target, type)
 * target: 'A' | 'B' | 'all'
 * type: 'info' | 'warn'
 */
function logSim(msg, target = 'A', type = 'info') {
    const write = (el) => {
        if (!el) return;
        const d = document.createElement('div');
        d.innerHTML = `&gt; [${new Date().toLocaleTimeString()}] ${msg}`;
        d.className = (type === 'warn') ? 'console-msg-warn' : 'console-msg-info';
        el.prepend(d);
    };

    if (target === 'A' || target === 'all') {
        write(document.getElementById('sim-console-A'));
    }
    if (target === 'B' || target === 'all') {
        write(document.getElementById('sim-console-B'));
    }
}

// ---------------- HELPERS UI ----------------
function setLogicLocked(locked) {
    const iaA = document.getElementById('iaA-select');
    const iaB = document.getElementById('iaB-select');
    if (iaA) iaA.disabled = locked;
    if (iaB) iaB.disabled = locked;

    // opzionale: aggiungi una classe per styling visivo (se vuoi)
    if (iaA) iaA.classList.toggle('disabled', locked);
    if (iaB) iaB.classList.toggle('disabled', locked);
}

// ---------------- INIT & RENDER ----------------
function resetSim() {
    boardA = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    boardB = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    knowA  = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    knowB  = Array.from({length: SIZE}, () => Array(SIZE).fill(0));

    simTurnCount = 0;
    turn = 'A';
    running = false;
    stackA = [];
    stackB = [];
    showShipsA = false;
    showShipsB = false;

    clearTimeout(simTimeout);

    document.getElementById('sim-status').innerText = 'FERMA';
    document.getElementById('sim-turn').innerText = '0';

    placeRandomShips(boardA);
    placeRandomShips(boardB);

    renderSimBoard('boardA', boardA, true);
    renderSimBoard('boardB', boardB, true);

    document.getElementById('sim-console-A').innerHTML = '';
    document.getElementById('sim-console-B').innerHTML = '';

    // alla reset/ripristino, riabilitiamo la scelta della logica
    setLogicLocked(false);

    logSim('Simulazione resettata. Navi piazzate.', 'all', 'info');
}

function placeRandomShips(board) {
    SHIPS_CONFIG.forEach(s => {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 500) {
            attempts++;
            const r = Math.floor(Math.random() * SIZE);
            const c = Math.floor(Math.random() * SIZE);
            const o = Math.random() > 0.5 ? 'H' : 'V';

            if (canFit(board, r, c, s.len, o)) {
                for (let i = 0; i < s.len; i++) {
                    if (o === 'H') board[r][c + i] = 1;
                    else board[r + i][c] = 1;
                }
                placed = true;
            }
        }
    });
}

function canFit(board, r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (board[r][c + i] !== 0) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (board[r + i][c] !== 0) return false;
    }
    return true;
}

function renderSimBoard(id, board, hideShips) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            if (board[r][c] === 1 && !hideShips) cell.classList.add('ship');
            if (board[r][c] === 2) cell.classList.add('miss');
            if (board[r][c] === 3) cell.classList.add('hit');

            el.appendChild(cell);
        }
    }
}

// ---------------- STRATEGIE ----------------
function getRandomShot(knowledge) {
    let r, c;
    do {
        r = Math.floor(Math.random() * SIZE);
        c = Math.floor(Math.random() * SIZE);
    } while (knowledge[r][c] >= 2);
    return {r, c};
}

function getMediumShot(knowledge, stack) {
    while (stack.length > 0) {
        const s = stack.pop();
        if (s && s.r >= 0 && s.r < SIZE && s.c >= 0 && s.c < SIZE && knowledge[s.r][s.c] < 2)
            return s;
    }
    return getRandomShot(knowledge);
}

function getHardShot(knowledge) {
    const pMap = Array.from({length: SIZE}, () => Array(SIZE).fill(0));

    SHIPS_CONFIG.forEach(s => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (canFitProb(knowledge, r, c, s.len, 'H'))
                    for (let i = 0; i < s.len; i++) pMap[r][c + i]++;
                if (canFitProb(knowledge, r, c, s.len, 'V'))
                    for (let i = 0; i < s.len; i++) pMap[r + i][c]++;
            }
        }
    });

    let max = -1, best = {r: 0, c: 0};
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (knowledge[r][c] < 2 && pMap[r][c] > max) {
                max = pMap[r][c];
                best = {r, c};
            }
        }
    }
    return best;
}

function canFitProb(knowledge, r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (knowledge[r][c + i] >= 2) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (knowledge[r + i][c] >= 2) return false;
    }
    return true;
}

// ---------------- APPLY SHOT ----------------
function applyShot(shooter, targetBoard, knowledge, stack) {
    const logic = document.getElementById(
        shooter === 'A' ? 'iaA-select' : 'iaB-select'
    ).value;

    let shot;
    if (logic === 'hard') shot = getHardShot(knowledge);
    else if (logic === 'medium') shot = getMediumShot(knowledge, stack);
    else shot = getRandomShot(knowledge);

    const {r, c} = shot;

    if (targetBoard[r][c] === 1) {
        targetBoard[r][c] = 3;
        knowledge[r][c] = 3;

        stack.push(
            {r: r - 1, c}, {r: r + 1, c},
            {r, c: c - 1}, {r, c: c + 1}
        );

        logSim(`COLPITO a [${r},${c}]`, shooter, 'warn');
        return true;
    } else {
        if (targetBoard[r][c] === 0) targetBoard[r][c] = 2;
        knowledge[r][c] = 2;

        logSim(`ACQUA a [${r},${c}]`, shooter, 'info');
        return false;
    }
}

function checkWin(board) {
    return !board.flat().includes(1);
}

// ---------------- SIM LOOP ----------------
function runSimulationStep() {
    if (!running) return;

    simTurnCount++;
    document.getElementById('sim-turn').innerText = simTurnCount;

    let hit;
    if (turn === 'A') {
        hit = applyShot('A', boardB, knowA, stackA);
        renderSimBoard('boardB', boardB, !showShipsB);
        if (checkWin(boardB)) {
            logSim('IA A VINCE LA SIMULAZIONE!', 'all', 'warn');
            stopSimulation();
            return;
        }
        if (!hit) turn = 'B';
    } else {
        hit = applyShot('B', boardA, knowB, stackB);
        renderSimBoard('boardA', boardA, !showShipsA);
        if (checkWin(boardA)) {
            logSim('IA B VINCE LA SIMULAZIONE!', 'all', 'warn');
            stopSimulation();
            return;
        }
        if (!hit) turn = 'A';
    }

    updateCounts();
    simTimeout = setTimeout(runSimulationStep, hit ? 250 : 450);
}

// ---------------- CONTROLLI ----------------
function startSimulation() {
    if (running) return;
    running = true;
    document.getElementById('sim-status').innerText = 'IN ESECUZIONE';
    logSim('Simulazione avviata.', 'all', 'info');

    // blocchiamo subito la possibilità di cambiare la logica
    setLogicLocked(true);

    runSimulationStep();
}

function stopSimulation() {
    running = false;
    clearTimeout(simTimeout);
    document.getElementById('sim-status').innerText = 'FERMA';
    logSim('Simulazione fermata.', 'all', 'info');

    // quando la simulazione si ferma (pausa/vittoria/reset), riabilitiamo la scelta della logica
    setLogicLocked(false);
}

// ---------------- UI HOOKS ----------------
function hookAiUi() {
    document.getElementById('start-btn').onclick = startSimulation;
    document.getElementById('pause-btn').onclick = () => running ? stopSimulation() : startSimulation();
    document.getElementById('reset-btn').onclick = () => { stopSimulation(); resetSim(); };

    document.getElementById('revealA').onclick = () => {
        showShipsA = !showShipsA;
        renderSimBoard('boardA', boardA, !showShipsA);
        logSim(`MOSTRA NAVI: ${showShipsA ? 'ON' : 'OFF'}`, 'A');
    };

    document.getElementById('revealB').onclick = () => {
        showShipsB = !showShipsB;
        renderSimBoard('boardB', boardB, !showShipsB);
        logSim(`MOSTRA NAVI: ${showShipsB ? 'ON' : 'OFF'}`, 'B');
    };

    setInterval(updateCounts, 400);
}

function updateCounts() {
    document.getElementById('countA').innerText = boardA.flat().filter(x => x === 1).length;
    document.getElementById('countB').innerText = boardB.flat().filter(x => x === 1).length;
}

// ---------------- DOM READY ----------------
document.addEventListener('DOMContentLoaded', () => {
    hookAiUi();
    resetSim();
});
