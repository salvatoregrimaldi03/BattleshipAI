// =================== LABIRINTO ===================
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

const start = [0,0], goal = [9,14];
const maze = document.getElementById("maze");
const bestPathMsg = document.getElementById("best-path-msg");
const sleep = ms => new Promise(r => setTimeout(r, ms));

let results = {};

// =================== DISEGNA LABIRINTO ===================
function drawMaze() {
    maze.innerHTML = "";
    mazeData.forEach((r,i) => r.forEach((c,j) => {
        const d = document.createElement("div");
        d.className = "cell";
        if(c) d.classList.add("wall");
        if(i===start[0] && j===start[1]) d.classList.add("start");
        if(i===goal[0] && j===goal[1]) d.classList.add("goal");
        d.id = `c-${i}-${j}`;
        maze.appendChild(d);
    }));
}
drawMaze();

// =================== FUNZIONI AUSILIARIE ===================
function neighbors([x,y]){
    return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
        .filter(n=>n[0]>=0&&n[1]>=0&&n[0]<mazeData.length&&n[1]<mazeData[0].length&&mazeData[n[0]][n[1]]===0);
}

function heuristic(a,b){
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);
}

// =================== BFS ===================
function bfsSolve(){
    let q=[[start,[start]]], visited=[], set=new Set([start+""]);
    while(q.length){
        let [n,p]=q.shift();
        visited.push(n);
        if(n+""===goal+"") return {path:p, visited};
        neighbors(n).forEach(nb=>{
            if(!set.has(nb+"")){
                set.add(nb+"");
                q.push([nb,[...p,nb]]);
            }
        });
    }
    return {path:[], visited};
}

// =================== DFS ===================
function dfsSolve(){
    let stack=[[start,[start]]], visited=[], set=new Set([start+""]);
    while(stack.length){
        let [n,p]=stack.pop();
        visited.push(n);
        if(n+""===goal+"") return {path:p, visited};
        neighbors(n).forEach(nb=>{
            if(!set.has(nb+"")){
                set.add(nb+"");
                stack.push([nb,[...p,nb]]);
            }
        });
    }
    return {path:[], visited};
}

// =================== A* ===================
function aStarSolve(){
    let open=[[heuristic(start,goal),0,start,[start]]], visited=[], set=new Set();
    while(open.length){
        open.sort((a,b)=>a[0]-b[0]);
        let [f,g,n,p]=open.shift();
        if(set.has(n+"")) continue;
        set.add(n+"");
        visited.push(n);
        if(n+""===goal+"") return {path:p, visited};
        neighbors(n).forEach(nb=>{
            open.push([g+1+heuristic(nb,goal), g+1, nb, [...p,nb]]);
        });
    }
    return {path:[], visited};
}

// =================== BEST-FIRST RICORSIVA (RBFS reale, async-friendly) ===================
async function bestFirstRecursiveSolve(){

    const visited = [];

    // RBFS è ricorsiva e async per poter cedere l'event loop con await sleep(0)
    async function RBFS(node, path, g, f_limit, pathSet){
        // record visit for animation (global list)
        visited.push(node);

        // goal test
        if(node+"" === goal+"")
            return {solution: path, f: g};

        // genera successori (escludo stati che sono già nell'attuale path per evitare cicli)
        let successors = neighbors(node)
            .filter(nb => !pathSet.has(nb+""))
            .map(nb=>{
                return {
                    state: nb,
                    path: [...path, nb],
                    g: g + 1,
                    h: heuristic(nb, goal),
                    f: 0
                };
        });

        if(successors.length === 0)
            return {solution: null, f: Infinity};

        // calcola f = max(g+h, parent.g + parent.h? -> qui usiamo g come lower bound)
        successors.forEach(s=>{
            s.f = Math.max(s.g + s.h, g);
        });

        while(true){
            // ordina per f crescente
            successors.sort((a,b)=>a.f - b.f);

            let best = successors[0];

            // supera il limite → backtracking
            if(best.f > f_limit)
                return {solution: null, f: best.f};

            // seconda alternativa
            let alternative =
                successors.length > 1 ? successors[1].f : Infinity;

            // prepara pathSet per ricorsione (evita di rientrare sugli antenati)
            pathSet.add(best.state+"");

            // chiamata ricorsiva (limito il nuovo f_limit con l'alternativa)
            let result = await RBFS(
                best.state,
                best.path,
                best.g,
                Math.min(f_limit, alternative),
                pathSet
            );

            // rimuovo dalla pathSet (backtrack)
            pathSet.delete(best.state+"");

            // aggiorna f del best con il valore ritornato
            best.f = result.f;

            if(result.solution)
                return result;

            // cedi l'event loop ogni iterazione per evitare freeze lunghi nella UI
            await sleep(0);
        }
    }

    // avvio con pathSet che contiene lo start per prevenire cicli su antenati
    const pathSet = new Set([start+""]);
    let res = await RBFS(start, [start], 0, Infinity, pathSet);

    return {
        path: res.solution || [],
        visited
    };
}

// =================== ANIMAZIONE ===================
async function animate(path, visited, visitedClass, pathClass){
    for(let [x,y] of visited){
        const el=document.getElementById(`c-${x}-${y}`);
        if(el && !el.classList.contains("start") && !el.classList.contains("goal")){
            el.classList.add(visitedClass);
            await sleep(20);
        }
    }
    for(let [x,y] of path){
        const el=document.getElementById(`c-${x}-${y}`);
        if(el && !el.classList.contains("start") && !el.classList.contains("goal")){
            el.classList.add(pathClass);
            await sleep(40);
        }
    }
}

// =================== STORICO E MIGLIORE ===================
function updateHistory(alg, visitedLen, pathLen){
    const safe=alg.replace(/\*/g,"star");
    const h=document.getElementById("history");
    let el=document.getElementById(`history-${safe}`);
    if(!el){
        el=document.createElement("p");
        el.id=`history-${safe}`;
        h.appendChild(el);
    }
    el.innerHTML=`${alg}: ${visitedLen} nodi esplorati, percorso ${pathLen}`;
}

function updateBestPath(){
    let best=null, len=Infinity;
    for(let k in results){
        if(results[k].length>0 && results[k].length<len){
            len=results[k].length;
            best=k;
        }
    }
    if(best){
        bestPathMsg.innerText=`🏆 Percorso migliore (min lunghezza): ${best} (${len})`;
        bestPathMsg.classList.remove("hidden");
    }
}

// =================== BOTTONI / ESECUZIONE ===================
async function runAlgo(name, solver, vClass, pClass){
    drawMaze();
    // supporta solvers sincroni o async
    const res = await solver();
    await animate(res.path,res.visited,vClass,pClass);
    updateHistory(name,res.visited.length,res.path.length);
    results[name]={path:res.path,length:res.path.length};
    updateBestPath();
}

async function runAllAlgorithmsAI(){
    results = {};               // reset risultati
    bestPathMsg.classList.add("hidden");

    await runAlgo("BFS", bfsSolve, "visited-bfs", "path-bfs");
    await sleep(400);

    await runAlgo("DFS", dfsSolve, "visited-dfs", "path-dfs");
    await sleep(400);

    await runAlgo("A*", aStarSolve, "visited-astar", "path-astar");
    await sleep(400);

    await runAlgo(
        "Best-First (Ric.)",
        bestFirstRecursiveSolve,
        "visited-best",
        "path-best"
    );
}

// =================== AI CONTROLLED & UTILITIES ===================
function isAIControlled(){
    return document.getElementById("ai-controlled").checked;
}

// espongo funzioni per gli onclick inline (compatibilità con index.html)
window.runBFS = async () => {
    if (isAIControlled()) await runAllAlgorithmsAI();
    else await runAlgo("BFS", bfsSolve, "visited-bfs", "path-bfs");
};

window.runDFS = async () => {
    if (isAIControlled()) await runAllAlgorithmsAI();
    else await runAlgo("DFS", dfsSolve, "visited-dfs", "path-dfs");
};

window.runAStar = async () => {
    if (isAIControlled()) await runAllAlgorithmsAI();
    else await runAlgo("A*", aStarSolve, "visited-astar", "path-astar");
};

window.runBestFirstRec = async () => {
    if (isAIControlled()) await runAllAlgorithmsAI();
    else await runAlgo(
        "Best-First (Ric.)",
        bestFirstRecursiveSolve,
        "visited-best",
        "path-best"
    );
};

// gestione checkbox AI Controlled: avvia automaticamente la sequenza
let aiRunning = false;
function toggleButtons(disabled){
    document.querySelectorAll("#controls button").forEach(b => b.disabled = disabled);
}

const aiCheckbox = document.getElementById("ai-controlled");
aiCheckbox.addEventListener("change", async (e) => {
    if (e.target.checked && !aiRunning) {
        aiRunning = true;
        toggleButtons(true);
        results = {};
        bestPathMsg.classList.add("hidden");
        try {
            await runAllAlgorithmsAI();
        } catch(err){
            console.error("Errore durante runAllAlgorithmsAI:", err);
        } finally {
            aiRunning = false;
            toggleButtons(false);
        }
    }
});
