// Labirinto 10x15
const mazeData = [
[0,0,1,0,0,0,1,0,0,0,0,1,0,0,0],
[0,1,1,1,1,0,1,0,1,1,0,1,0,1,0],
[0,0,0,0,1,0,0,0,1,0,0,0,0,1,0],
[1,1,1,0,1,1,1,0,1,0,1,1,0,1,0],
[0,0,0,0,0,0,1,0,0,0,1,0,0,0,0],
[0,1,1,1,1,0,1,1,1,0,1,1,1,1,0],
[0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
[0,1,1,0,1,1,1,1,1,1,1,1,1,1,0],
[0,0,0,0,0,0,0,0,1,0,0,0,0,1,0],
[0,1,1,1,1,1,1,0,0,0,1,1,0,0,0]
];

const start=[0,0], goal=[9,14];
const mazeDiv = document.getElementById("maze");

// Dimensions
const ROWS = mazeData.length;
const COLS = mazeData[0].length;

// Ensure #stats and #explanation exist
function ensureUIElements(){
    if(!document.getElementById("stats")){
        const s = document.createElement("pre");
        s.id = "stats";
        s.style.whiteSpace = "pre-wrap";
        s.style.marginTop = "10px";
        document.body.appendChild(s);
    }
    if(!document.getElementById("explanation")){
        const e = document.createElement("div");
        e.id = "explanation";
        e.style.marginTop = "6px";
        e.style.fontWeight = "600";
        document.body.appendChild(e);
    }
}
ensureUIElements();

// Inject styles: distinct colors for visited/path and green for best path
(function injectStyles(){
    const css = `
    /* colori per visited (trasparenze per lasciare vedere griglia) */
    .visited-bfs { background: rgba(70,130,180,0.85) !important; }   /* steelblue */
    .visited-dfs { background: rgba(255,165,0,0.85) !important; }    /* orange */
    .visited-astar { background: rgba(138,43,226,0.85) !important; } /* blueviolet */

    /* path (più marcato) */
    .path-bfs { box-shadow: inset 0 0 0 3px rgba(25,25,112,0.6); }   /* navy inset */
    .path-dfs { box-shadow: inset 0 0 0 3px rgba(139,69,19,0.6); }   /* brown inset */
    .path-astar { box-shadow: inset 0 0 0 3px rgba(75,0,130,0.6); }  /* indigo inset */

    /* percorso scelto: verde brillante */
    .best-path { background: rgba(50,205,50,0.95) !important; box-shadow: 0 0 6px rgba(34,139,34,0.9); }

    /* mantieni start/goal visibili sopra gli altri */
    .start { z-index: 5; }
    .goal { z-index: 5; }
    `;
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
})();


// Disegna griglia
function drawMaze(){
    mazeDiv.innerHTML="";
    mazeData.forEach((row,i)=>{
        row.forEach((cell,j)=>{
            const div=document.createElement("div");
            div.classList.add("cell");
            if(cell===1) div.classList.add("wall");
            if(i===start[0] && j===start[1]) div.classList.add("start");
            if(i===goal[0] && j===goal[1]) div.classList.add("goal");
            div.id=`c-${i}-${j}`;
            mazeDiv.appendChild(div);
        });
    });
}

// Trova vicini validi
function neighbors([x,y]){
    return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
        .filter(n=>n[0]>=0 && n[1]>=0 && n[0]<ROWS && n[1]<COLS && mazeData[n[0]][n[1]]===0);
}

// Euristica Manhattan
function heuristic(a,b){
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);
}

// sleep helper
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// NOTA: questa versione NON ripulisce le visite precedenti tra gli algoritmi,
// così l'utente vede le esplorazioni cumulative.

async function animateWithClasses(path, visited, visitedClass="visited", pathClass="path", visitDelay=18, pathDelay=45){
    // Non ridisegniamo la mappa: vogliamo mantenere i colori già presenti
    // Animiamo visited
    for(let v of visited){
        const el = document.getElementById(`c-${v[0]}-${v[1]}`);
        if(el && !el.classList.contains("start") && !el.classList.contains("goal")){
            el.classList.add(visitedClass);
        }
        await sleep(visitDelay);
    }
    // Animiamo il path (sovrapponiamo un'ombra)
    for(let p of path){
        const el = document.getElementById(`c-${p[0]}-${p[1]}`);
        if(el && !el.classList.contains("start") && !el.classList.contains("goal")){
            el.classList.add(pathClass);
        }
        await sleep(pathDelay);
    }
}

// ------- Solver NON-animati -------
// Restituiscono { path: [...], visited: [...], timeMs: number }

function bfsSolve(){
    const t0 = performance.now();
    let q = [[start, [start]]];
    let visitedSet = new Set();
    let vis = [];
    visitedSet.add(start+"");
    while(q.length){
        let [n, path] = q.shift();
        vis.push(n);
        if(n+""===goal+""){
            return {path, visited: vis, timeMs: performance.now()-t0};
        }
        neighbors(n).forEach(nb=>{
            if(!visitedSet.has(nb+"")){
                visitedSet.add(nb+"");
                q.push([nb, [...path, nb]]);
            }
        });
    }
    return {path: [], visited: vis, timeMs: performance.now()-t0};
}

function dfsSolve(){
    const t0 = performance.now();
    let stack = [[start, [start]]];
    let visitedSet = new Set();
    let vis = [];
    visitedSet.add(start+"");
    while(stack.length){
        let [n, path] = stack.pop();
        vis.push(n);
        if(n+""===goal+""){
            return {path, visited: vis, timeMs: performance.now()-t0};
        }
        neighbors(n).forEach(nb=>{
            if(!visitedSet.has(nb+"")){
                visitedSet.add(nb+"");
                stack.push([nb, [...path, nb]]);
            }
        });
    }
    return {path: [], visited: vis, timeMs: performance.now()-t0};
}

function aStarSolve(){
    const t0 = performance.now();
    // open: array of [f, g, node, path]
    let open = [[heuristic(start,goal), 0, start, [start]]];
    let visitedSet = new Set();
    let vis = [];
    while(open.length){
        open.sort((a,b)=>a[0]-b[0]);
        let [f, g, n, path] = open.shift();
        if(visitedSet.has(n+"")) continue;
        visitedSet.add(n+"");
        vis.push(n);
        if(n+""===goal+""){
            return {path, visited: vis, timeMs: performance.now()-t0};
        }
        neighbors(n).forEach(nb=>{
            if(!visitedSet.has(nb+"")){
                let ng = g + 1;
                let h = heuristic(nb, goal);
                open.push([ng + h, ng, nb, [...path, nb]]);
            }
        });
    }
    return {path: [], visited: vis, timeMs: performance.now()-t0};
}

// wrapper compatibili con bottoni (se presenti)
function runBFS(){ const res = bfsSolve(); return animateWithClasses(res.path, res.visited, "visited-bfs", "path-bfs", 12, 40); }
function runDFS(){ const res = dfsSolve(); return animateWithClasses(res.path, res.visited, "visited-dfs", "path-dfs", 12, 40); }
function runAStar(){ const res = aStarSolve(); return animateWithClasses(res.path, res.visited, "visited-astar", "path-astar", 12, 40); }

// scelta migliore (min visited, tie-breaker: path length, poi tempo)
function chooseBest(results){
    results.sort((A,B)=>{
        if(A.res.visited.length !== B.res.visited.length)
            return A.res.visited.length - B.res.visited.length;
        if(A.res.path.length !== B.res.path.length)
            return A.res.path.length - B.res.path.length;
        return A.res.timeMs - B.res.timeMs;
    });
    return results[0];
}

// Esegue in sequenza, mostra esplorazioni, poi mette in verde il best-path
async function runSequenceShowEachThenBest(){
    drawMaze();
    const statsDiv = document.getElementById("stats");
    const explanation = document.getElementById("explanation");
    statsDiv.innerText = "Esecuzioni in sequenza:\n";

    const results = [];

    // BFS: esplora e mostra
    const bfsRes = bfsSolve();
    results.push({name: "BFS", res: bfsRes});
    statsDiv.innerText += `Esecuzione BFS... nodi=${bfsRes.visited.length}, percorso=${bfsRes.path.length}\n`;
    await animateWithClasses(bfsRes.path, bfsRes.visited, "visited-bfs", "path-bfs", 10, 35);
    await sleep(500);

    // DFS: esplora e mostra (rimane visibile insieme a BFS)
    const dfsRes = dfsSolve();
    results.push({name: "DFS", res: dfsRes});
    statsDiv.innerText += `Esecuzione DFS... nodi=${dfsRes.visited.length}, percorso=${dfsRes.path.length}\n`;
    await animateWithClasses(dfsRes.path, dfsRes.visited, "visited-dfs", "path-dfs", 10, 35);
    await sleep(500);

    // A*: esplora e mostra (rimane visibile insieme alle altre)
    const astarRes = aStarSolve();
    results.push({name: "A*", res: astarRes});
    statsDiv.innerText += `Esecuzione A*... nodi=${astarRes.visited.length}, percorso=${astarRes.path.length}\n`;
    await animateWithClasses(astarRes.path, astarRes.visited, "visited-astar", "path-astar", 10, 35);
    await sleep(500);

    // Scegli il migliore e coloralo in verde (best-path) sovrapponendolo alle viste precedenti
    const best = chooseBest(results);
    for(let p of best.res.path){
        const el = document.getElementById(`c-${p[0]}-${p[1]}`);
        if(el && !el.classList.contains("start") && !el.classList.contains("goal")){
            el.classList.add("best-path");
        }
    }

    explanation.innerText = `Selezionato: ${best.name}. Motivazione: minimo numero di nodi esplorati (${best.res.visited.length}). (Tie-breaker: lunghezza percorso / tempo)`;
    statsDiv.innerText += `\nSelezionato: ${best.name} (min nodi esplorati: ${best.res.visited.length}).`;
}

// Avvio automatico
drawMaze();
setTimeout(()=>{ runSequenceShowEachThenBest(); }, 200);
