// -----------------------------------------------------------
// LOAD EXOMARS IMAGE
// -----------------------------------------------------------
const roverImg = new Image();
roverImg.src = "exomars.png"; // Ensure file exists next to this HTML
// -----------------------------------------------------------

// ----- GRID WORLD -----
class GridWorld {
    constructor(width, height, obstacles = []) {
        this.width = width;
        this.height = height;
        this.obstacles = new Set(obstacles.map(o => `${o.x},${o.y}`));
    }

    isInside(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    isObstacle(x, y) {
        return this.obstacles.has(`${x},${y}`);
    }
}

// ----- ROBOT -----
class Robot {
    constructor(world, x = 0, y = 0, direction = "N") {
        this.world = world;
        this.x = x;
        this.y = y;
        this.direction = direction; // "N", "E", "S", "W"
    }

    turnLeft() {
        const dirs = ["N", "W", "S", "E"];
        this.direction = dirs[(dirs.indexOf(this.direction) + 1) % 4];
    }

    turnRight() {
        const dirs = ["N", "E", "S", "W"];
        this.direction = dirs[(dirs.indexOf(this.direction) + 1) % 4];
    }

    moveForward() {
        let dx = 0, dy = 0;

        switch (this.direction) {
            case "N": dy = -1; break;
            case "S": dy = 1; break;
            case "E": dx = 1; break;
            case "W": dx = -1; break;
        }

        const newX = this.x + dx;
        const newY = this.y + dy;

        if (!this.world.isInside(newX, newY)) {
            console.warn("Move blocked: outside grid");
            return false;
        }
        if (this.world.isObstacle(newX, newY)) {
            console.warn("Move blocked: obstacle");
            return false;
        }

        this.x = newX;
        this.y = newY;
        return true;
    }

    // ----- ALIEN LIFE SCANNER -----
    searchForAlienLife() {
        const lifeDetected = Math.random() < 0.15;

        return {
            x: this.x,
            y: this.y,
            detected: lifeDetected,
            message: lifeDetected
                ? "Alien life detected! 👽"
                : "No signs of alien life."
        };
    }
}

// ----- SETUP -----
const world = new GridWorld(10, 10, [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 4, y: 5 }
]);

const bot = new Robot(world, 0, 0, "E");

// ----- DRAWING -----
const canvas = document.getElementById("grid");
const ctx = canvas.getContext("2d");
const cellSize = canvas.width / world.width;

let highlightCell = null;
let highlightTimer = null;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "#ddd";
    for (let x = 0; x <= world.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= world.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvas.width, y * cellSize);
        ctx.stroke();
    }

    // Obstacles
    ctx.fillStyle = "#444";
    world.obstacles.forEach(key => {
        const [x, y] = key.split(",").map(Number);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });

    // Scan highlight
    if (highlightCell) {
        ctx.fillStyle = highlightCell.color;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(
            highlightCell.x * cellSize,
            highlightCell.y * cellSize,
            cellSize,
            cellSize
        );
        ctx.globalAlpha = 1.0;
    }

    // ExoMars rover image
    if (roverImg.complete) {
        const imgSize = cellSize * 0.9;
        ctx.save();

        ctx.translate(
            bot.x * cellSize + cellSize / 2,
            bot.y * cellSize + cellSize / 2
        );

        let angle = 0;
        if (bot.direction === "N") angle = -Math.PI / 2;
        if (bot.direction === "S") angle = Math.PI / 2;
        if (bot.direction === "W") angle = Math.PI;

        ctx.rotate(angle);
        ctx.drawImage(roverImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        ctx.restore();
    }
}

// ----- SCAN HANDLER -----
function scanCell() {
    const result = bot.searchForAlienLife();
    console.log(result.message);

    highlightCell = {
        x: result.x,
        y: result.y,
        color: result.detected ? "lime" : "yellow"
    };

    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
        highlightCell = null;
        draw();
    }, 600);

    draw();
}

// -----------------------------------------------------------
// PROGRAMMING INTERFACE
// -----------------------------------------------------------
function addAction(action) {
    const box = document.getElementById("programBox");
    box.value += action + "\n";
}

function addOutput(s) {
    const box = document.getElementById("outputBox");
    box.value += s + "\n";
    box.scrollTop = box.scrollHeight;
}


function updateData(stack) {
    const box = document.getElementById("dataBox");
    let s = "";
    for(var i=0;i<stack.length;i++){
        s += stack[i].toString() + "\n";
    }
    box.value = s;
}

function clearOutput(){
    document.getElementById("outputBox").value = "";
}

function clearProgram() {
    document.getElementById("programBox").value = "";
}

function clearData() {
    document.getElementById("dataBox").value = "";
}

var stopFlag = false;
function stopProgram(){
    stopFlag = true;
}

class LoopIterator {
    constructor(loopstart,count){
        this.loopstart = loopstart;
        this.count = count;
    }
    toString(){
        return "[start="+this.loopstart+", count="+this.count+"]"
    }
}

function highlightProgLine(n){
    // this would be better done by caching the line start and end positions,
    // but hey. Maybe later.
    const ta = document.getElementById("programBox");
    const lines = ta.value.split("\n");

    if (n < 0 || n >= lines.length) return;

    // Compute start index
    let start = 0;
    for (let i = 0; i < n; i++) {
        start += lines[i].length + 1; // +1 for newline
    }

    const end = start + lines[n].length;

    ta.focus();
    ta.setSelectionRange(start, end);
}

function runProgram() {
    const actions = document.getElementById("programBox")
        .value
        .split("\n")
        .map(a => a.trim().toLowerCase())
        .filter(a => a !== "");

    let i = 0;
    let stack = [];
    clearOutput();

    function step() {
        if (i >= actions.length) return;
        
        if(stopFlag){
            stopFlag = false;
            clearData();
            return;
        }
        
        highlightProgLine(i);

        const action = actions[i];
        // addOutput("running action "+i+" "+action)
        if (action.startsWith("print")){
            const [first,...rest] = action.split(" ")
            const s = rest.join(" ")
            addOutput(s)
        }
        if (action.startsWith("begin")) {
            let times = action.split(" ");
            if(times.length>1){
                times = parseInt(times[1].trim());
            } else {
                times = 1;
            }
            const iter = new LoopIterator(i,times);
            stack.push(iter);
        }
        if (action === "leave") { // leave loop early
            while(i<actions.length && actions[i]!="end")i++;
            if(i==actions.length)return; // no "end" encountered
            if(stack.length==0)return; // no "begin" of loop
            i = stack.pop().loopstart;
        }
        if (action === "end") {
            if(stack.length>0){ // ignore "end" with no "begin"
                let iter = stack[stack.length-1];
                if(--iter.count>0){
                    i = iter.loopstart;
//                    addOutput("Jump to "+i)
                } else {
                    stack.pop();
                }
            }
        }
        if (action === "forward" || action === "move") bot.moveForward();
        if (action === "left" || action === "turnleft") bot.turnLeft();
        if (action === "right" || action === "turnright") bot.turnRight();
        if (action === "scan") scanCell();

        draw();
        updateData(stack);
        i++;

        setTimeout(step, 300); // delay between actions
    }

    step();
    clearData();
}

// -----------------------------------------------------------
// GO TO COORDINATE FUNCTION
// -----------------------------------------------------------
function goToCoordinate() {
    const targetX = parseInt(document.getElementById("targetX").value);
    const targetY = parseInt(document.getElementById("targetY").value);

    if (!world.isInside(targetX, targetY)) {
        alert("Target is outside the grid!");
        return;
    }
    if (world.isObstacle(targetX, targetY)) {
        alert("Target cell is blocked by an obstacle!");
        return;
    }

    function step() {
        if (bot.x === targetX && bot.y === targetY) return; // reached

        let dx = targetX - bot.x;
        let dy = targetY - bot.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            // prioritize horizontal movement
            if (dx > 0) bot.direction = "E";
            else bot.direction = "W";
        } else if (dy !== 0) {
            // vertical movement
            if (dy > 0) bot.direction = "S";
            else bot.direction = "N";
        }

        // attempt move
        if (!bot.moveForward()) {
            console.warn("Path blocked, stopping!");
            return;
        }

        draw();
        setTimeout(step, 300);
    }

    step();
}

// ----- INITIAL DRAW -----
window.addEventListener("load",() => {draw()})
