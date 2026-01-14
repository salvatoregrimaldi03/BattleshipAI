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
let aiRunning = false;

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

// =================== BEST-FIRST RICORSIVA ===================
async function bestFirstRecursiveSolve(){
    const visited = [];

    async function RBFS(node, path, g, f_limit, pathSet){
        visited.push(node);
        if(node+"" === goal+"") return {solution: path, f: g};

        let successors = neighbors(node)
            .filter(nb => !pathSet.has(nb+""))
            .map(nb=>({ state: nb, path: [...path, nb], g: g+1, h: heuristic(nb, goal), f:0 }));

        if(successors.length === 0) return {solution: null, f: Infinity};

        successors.forEach(s=> s.f = Math.max(s.g + s.h, g));

        while(true){
            successors.sort((a,b)=>a.f-b.f);
            let best = successors[0];
            if(best.f > f_limit) return {solution: null, f: best.f};
            let alternative = successors.length > 1 ? successors[1].f : Infinity;
            pathSet.add(best.state+"");
            let result = await RBFS(best.state, best.path, best.g, Math.min(f_limit, alternative), pathSet);
            pathSet.delete(best.state+"");
            best.f = result.f;
            if(result.solution) return result;
            await sleep(0);
        }
    }

    const pathSet = new Set([start+""]);
    let res = await RBFS(start,[start],0,Infinity,pathSet);
    return { path: res.solution || [], visited };
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

// =================== STORICO ===================
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

// =================== MIGLIORE PERCORSO ===================
function updateBestPath(){
    let bestAlg = null, bestPathLen = Infinity, bestVisited = Infinity;

    for(let k in results){
        const r = results[k];
        if(!r.path || r.path.length === 0) continue;
        const pathLen = r.path.length, visitedLen = r.visited;

        if(pathLen < bestPathLen || (pathLen === bestPathLen && visitedLen < bestVisited)){
            bestAlg = k; bestPathLen = pathLen; bestVisited = visitedLen;
        }
    }

    if(bestAlg){
        bestPathMsg.innerText = `🏆 Percorso migliore: ${bestAlg} (lunghezza ${bestPathLen}, nodi esplorati ${bestVisited})`;
        bestPathMsg.classList.remove("hidden");
    }
}

// =================== ESECUZIONE ALGORITMI ===================
async function runAlgo(name, solver, vClass, pClass, suppressBest = false){
    drawMaze();
    const res = await solver();
    await animate(res.path,res.visited,vClass,pClass);
    updateHistory(name,res.visited.length,res.path.length);
    results[name] = { path: res.path, length: res.path.length, visited: res.visited.length };
    if(!suppressBest){
        updateBestPath();
    }
}

async function runAllAlgorithmsAI(){
    results = {};
    bestPathMsg.classList.add("hidden");

    await runAlgo("BFS", bfsSolve, "visited-bfs", "path-bfs", true);
    await sleep(400);
    await runAlgo("DFS", dfsSolve, "visited-dfs", "path-dfs", true);
    await sleep(400);
    await runAlgo("A*", aStarSolve, "visited-astar", "path-astar", true);
    await sleep(400);
    await runAlgo("Best-First (Ric.)", bestFirstRecursiveSolve, "visited-best", "path-best", true);

    // Solo ora mostriamo il miglior percorso (dopo tutte e 4 le esecuzioni)
    updateBestPath();
}

// =================== AI CONTROLLED ===================
function isAIControlled(){ return document.getElementById("ai-controlled").checked; }

window.runBFS = async () => { if(isAIControlled()) await runAllAlgorithmsAI(); else await runAlgo("BFS", bfsSolve, "visited-bfs", "path-bfs"); };
window.runDFS = async () => { if(isAIControlled()) await runAllAlgorithmsAI(); else await runAlgo("DFS", dfsSolve, "visited-dfs", "path-dfs"); };
window.runAStar = async () => { if(isAIControlled()) await runAllAlgorithmsAI(); else await runAlgo("A*", aStarSolve, "visited-astar", "path-astar"); };
window.runBestFirstRec = async () => { if(isAIControlled()) await runAllAlgorithmsAI(); else await runAlgo("Best-First (Ric.)", bestFirstRecursiveSolve, "visited-best", "path-best"); };

function toggleButtons(disabled){
    document.querySelectorAll("#controls button").forEach(b => b.disabled = disabled);
}

const aiCheckbox = document.getElementById("ai-controlled");
aiCheckbox.addEventListener("change", async (e) => {
    if(e.target.checked && !aiRunning){
        aiRunning = true;
        toggleButtons(true);
        results = {};
        bestPathMsg.classList.add("hidden");
        try{ await runAllAlgorithmsAI(); } catch(err){ console.error(err); }
        finally{ aiRunning = false; toggleButtons(false); }
    }
});


