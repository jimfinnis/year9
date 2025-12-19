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
    
    getNextLocation(){
        let dx = 0, dy = 0;
        switch (this.direction) {
            case "N": dy = -1; break;
            case "S": dy = 1; break;
            case "E": dx = 1; break;
            case "W": dx = -1; break;
        }
        return [this.x + dx, this.y + dy]
    }
    
    isBlocked(){
        const [newX, newY] = this.getNextLocation();
        if (!this.world.isInside(newX, newY)) {
            return true
        }
        if (this.world.isObstacle(newX, newY)) {
            console.warn("Move blocked: obstacle");
            return true
        }
        return false
    }

    moveForward() {
        const [newX, newY] = this.getNextLocation()
        // could reuse isBlocked here, but this shows warnings.
        if (!this.world.isInside(newX, newY)) {
            addOutput("Move blocked: outside grid");
            return false;
        }
        if (this.world.isObstacle(newX, newY)) {
            addOutput("Move blocked: obstacle");
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

function syntaxError(s) {
    addOutput("Error in program:" + s);
}


function updateData(c) {
    const box = document.getElementById("dataBox");
    let s = "";
    for(var i=0;i<c.stack.length;i++){
        s += c.stack[i].toString() + "\n";
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

class LoopIterator {
    constructor(count){
        // how many counts left for this kind of iterator. Could be generalised later.
        this.count = count;
    }
    
    
    toString(){
        return "[count="+this.count+"]"
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

    
// These are the compiled instructions. Each has a "run" method 
// that takes the running context.
// The constructor takes a line number in the actions box; by default
// this just increments the program counter.

instructions = []    // list of compiled instructions

class Instruction {
    constructor(line){
        this.line=line
        this.addr = -1  // this will get patched by Context.add()
    }
    run(c){c.next()}
}

class InstTurnLeft extends Instruction {
    constructor(line){ super(line) }
    run(c){
        bot.turnLeft()
        c.next()
    }
}

class InstTurnRight extends Instruction {
    constructor(line){ super(line) }
    run(c){
        bot.turnRight()
        c.next()
    }
}

class InstMoveForwards extends Instruction {
    constructor(line){ super(line) }
    run(c){
        bot.moveForward()
        c.next()
    }
}

class InstScan extends Instruction {
    constructor(line){ super(line) }
    run(c){
        scanCell()
        c.next()
    }
}

class InstPrint extends Instruction {
    constructor(line,s){
        super(line)
        this.s = s
    } 
    run(c){
        addOutput(s)
        c.next()
    }
}

class InstBegin extends Instruction {
    constructor(line,times){
        super(line)
        // there is also a begin field, but it might as well be undefined
        // since it gets patched by an end.
        this.times=times
    }
    run(c){
        c.stack.push(new LoopIterator(this.times))
        c.next()
    }
}

class InstEnd extends Instruction {
    constructor(line,begin){
        super(line)
        // store the corresponding loop beginning.
        this.begin = begin 
        // and patch a link to this instruction into the begin instruction
        begin.end = this
    }
    run(c){
        if(c.stack.length>0){ // ignore "end" with no "begin"
            let iter = c.stack[c.stack.length-1];  // JS has no "peek"
            if(--iter.count>0){
                // jump to the instruction after the corresponding
                // begin
                const ip = this.begin.addr+1
                addOutput("Jump to "+ip)
                c.jump(ip)
            } else {
                c.stack.pop();
                c.next()
            }
        }
    }
}

class InstStop extends Instruction {
    constructor(line){ super(line) }
    run(c){
        c.stop()
    }
}

class InstIf extends Instruction {
    static validConditions = ["blocked","cointoss"]
    
    constructor(line,condition) {
        super(line)
        // parse any "not" in front of the condition
        let cond = condition.split(" ")
        if(cond.length>1) {
            if(cond[0]=="not"){
                this.negated = true
                this.condition = cond[1]
            } else {
                throw new Error("if-condition is bad")
            }
        }  else {
            this.negated = false
            this.condition = condition
        }
        
        if(!InstIf.validConditions.includes(this.condition)){
            throw new Error("if-condition '"+this.condition+"' unknown")
        }
        // address jumped to if condition is is false
        this.jumpaddr = -100  // this will get set by else/endif compilation
    }
    
    check() {
        // return the result of a condition check
        switch(this.condition){
            // is there an obstacle or wall in front of us?
            case "blocked": return bot.isBlocked();
            // testing!
            case "true": return true;
            case "false": return false;
            case "cointoss": return Math.random()<0.5;
            default: console.warn("Bad condition: "+this.condition);
        }
    }
    
    run(c){
        // check the condition and jump forwards if we find it is false,
        // otherwise just move to next instruction
        let result = this.check()
        if(this.negated)result = !result
        if(result){
            c.next()
        } else {
            c.jump(this.jumpaddr)
        }
    }
}

// simple jump instruction used for "else"
class InstJump extends Instruction {
    constructor(line){
        super(line)
        this.jumpaddr = -1  // patch this later in ENDIF compilation
    }
    run(c){
        c.jump(this.jumpaddr)
    }
       
}


// this is the thing that runs the programs - the run context.

class Context {
    constructor(){
        this.reset()
    }
    
    reset(){
        this.pc = 0   // program counter, index into instructions
        this.instructions = []  // list of instructions
        this.stopFlag = false // if true, stop the program!
        this.stack = [] // stack of loop data
    }
    
    // add an instruction, returning its address
    add(inst){
        const i = this.instructions.length
        inst.addr = i // patch the address into the instruction object
        this.instructions.push(inst)
        return i
    }
    
    // advance the program counter
    next(){
        this.pc++
    }
    
    // set the program counter to a value
    jump(addr){
        console.log("  Jump to "+addr)
        this.pc=addr
    }
    
    stop(){
        this.stopFlag = true
    }
    
    // return true if we're out of instructions or the stop flag is set
    stopped(){
        return this.stopFlag || this.pc>=this.instructions.length
    }
        

    // compile the actions box contents into a sequence of instructions
    compile() {
        this.instructions = []  // clear the output 
        let compilestack = []  // stack for compilation purposes (if..then, mainly)
        let loopstack = [] // stack of loop start instructions
        
        const actions = document.getElementById("programBox")
        .value
        .split("\n")
        .map(a => a.trim().toLowerCase())
        .filter(a => a !== "");
        
        try {
            for(let i=0;i<actions.length;i++){
                const action = actions[i]
                console.log("Compiling "+action)
                console.log("   loopstack="+loopstack.length+" compilestack="+compilestack.length)
                if (action === "forward" || action === "move"){
                    this.add(new InstMoveForwards(i))
                }
                else if(action === "turnleft" || action === "left"){
                    this.add(new InstTurnLeft(i))
                }
                else if(action === "turnright" || action === "right"){
                    this.add(new InstTurnRight(i))
                }
                else if(action === "scan"){
                    this.add(new InstScan(i))
                }
                else if(action.startsWith("print")){
                    const [first,...rest] = action.split(" ")
                    const s = rest.join(" ")
                    this.add(new InstPrint(i,s))
                }
                else if(action.startsWith("begin")) {
                    let times = action.split(" ");
                    if(times.length>1){
                        times = parseInt(times[1].trim());
                    } else {
                        times = 1000000; // FOREVER! Well, nearly
                    }
                    const inst = new InstBegin(i,times)
                    this.add(inst)
                    // so we can resolve "leave" instructions
                    loopstack.push(inst)
                }
                else if(action === "end") {
                    // get the corresponding loop beginning
                    if(loopstack.length==0){
                        throw new Error("'end' without a 'begin'!")
                    }
                    const begin = loopstack.pop()
                    // and compile the loop end, telling it about the begin
                    this.add(new InstEnd(i,begin))
                }
                else if(action === "stop") {
                    this.add(new InstStop(i))
                }
                else if(action.startsWith("if ")) {
                    // get the condition
                    let cond = action.split(" ")
                    if(cond.length<=1){
                        throw new Error("'if' needs a condition")
                    }
                    cond = cond[1]
                    // add an IF-instruction, stacking it so we can patch the locations
                    // of the forward jumps (to after ELSE or ENDIF)
                    const inst = new InstIf(i,cond)
                    compilestack.push(inst)
                    this.add(inst)
                }
                else if(action == "else") {
                    // I'm not allowing elseif chains; if you put an if after this
                    // it has to be on a separate line.
                    
                    // The idea is that we get this sequence:
                    //
                    //    IF: if condition false jump to A
                    //         ...
                    //         ...
                    //    JUMP B
                    // A:      ...
                    //         ...
                    // B:      
                    
                    
                    // pop the IF off the stack.
                    if(compilestack.length<=0){
                        throw new Error("'else' without an 'if'")
                    }
                    // we'll patch the jump location in this momentarily.
                    const ifinst = compilestack.pop()
                    // add a new instruction, a jump forwards to the endif point
                    const jumpinst = new InstJump(i)
                    // put that onto the stack and add it to the instructions
                    compilestack.push(jumpinst)
                    this.add(jumpinst) // (will set its address)
                    // Now make that IF point to the instruction past the the jump
                    // we just created
                    ifinst.jumpaddr = jumpinst.addr+1
                    // we'll patch the jump instruction's address in a bit, when we do ENDIF
                }
                else if(action == "endif") {
                    // The top of the stack holds either an IF or a JUMP instruction (if
                    // there was an else clause). Either way, we set the jump address in
                    // that instruction to the current location. No more needs doing.
                    if(compilestack.length<=0){
                        throw new Error("'endif' without 'if'")
                    }
                    const inst = compilestack.pop()
                    inst.jumpaddr = this.instructions.length
                }
                else {
                    throw new Error("Unknown action: "+action)
                }
            }
            if(loopstack.length>0){
                throw new Error("'begin' without a 'end'!")
            }
            if(compilestack.length>0){
                throw new Error("'if' without an 'endif'?")
            }
        } catch(e) {
            syntaxError(e.message)
            this.instructions = []
        }
    }
    
    // run a single program step
    step(){
        if(this.pc>=this.instructions.length)return;
        if(this.stopFlag){
            // if we're in continuous run, remember we need to catch that and stop!
            return
        }
        // get current instruction
        const inst = this.instructions[this.pc]
        console.log("Running "+this.pc+" : "+inst.constructor.name)
        // highlight it in the program window and run it
        highlightProgLine(inst.line)
        inst.run(this)
        draw()
        updateData(this)
    }
}
        
            
context = new Context()            

function runProgram() {
    context.reset()
    context.compile()
    clearData(); // clear the data window
    function step() {
        // don't update and reset the timeout if the run has ended
        if(context.stopped())return;
        // run the next instruction
        context.step()
        // set a timeout to run the next one
        setTimeout(step, 300); // delay between actions
    }

    draw(); // draw initial state
    step(); // do the first update
}

function stopProgram(){
    context.stop()
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
