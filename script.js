// -----------------------------------------------------------
// LOAD EXOMARS IMAGE
// -----------------------------------------------------------
const roverImg = new Image();
roverImg.src = "exomars.png"; // Ensure file exists next to this HTML
// -----------------------------------------------------------

// milliseconds between steps in program
const STEPTIME = 100

// ----- GRID WORLD -----
class GridWorld {
    constructor(width, height, obstacles = []) {
        this.width = width;
        this.height = height;
		// this is pretty ugly, but it's how ChatGPT decided to do it.
		// The sets below are sets of strings "x,y", e.g. "10,20". TBH, it's
		// not completely terrible, I suppose, given the limits of JS.
        this.obstacles = new Set(obstacles.map(o => `${o.x},${o.y}`));
		this.scannedLife = new Set();
		this.scannedNoLife = new Set();
    }
    
    isInside(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    isObstacle(x, y) {
        return this.obstacles.has(`${x},${y}`);
    }
	
	isScannedNoLife(x, y) {
        return this.scannedLife.has(`${x},${y}`);
	}
	
	isScannedLife(x, y) {
        return this.scannedNoLife.has(`${x},${y}`);
	}
	
	isScanned(x, y) {
		return this.isScannedLife(x,y) || this.isScannedNoLife(x,y)
	}

	addScanned(x, y, life) {
		(life?this.scannedLife:this.scannedNoLife).add(`${x},${y}`)
	}		
	
	unscanned() {
		return (this.width*this.height)-(this.scannedNoLife.size + this.scannedLife.size + this.obstacles.size)
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
	
	isFacingScanned(){
        const [newX, newY] = this.getNextLocation();
		return this.world.isScanned(newX, newY);
	}
	
	isOnScanned(){
		return this.world.isScanned(this.x, this.y);
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
        return Math.random() < 0.15;
    }
}

// ----- SETUP -----

function setupWorld(){
	// this actually defines global variables. JavaScript is a
	// wonderful language, isn't it?
	world = new GridWorld(10, 10, [
                                     { x: 4, y: 4 },
                                     { x: 5, y: 4 },
                                     { x: 4, y: 5 }
                                     ]);

	bot = new Robot(world, 0, 0, "E");
}

function resetWorldAndDraw(){
	setupWorld()
	draw()
}

setupWorld()	// call this again to reset the world

// ----- DRAWING -----
const canvas = document.getElementById("grid");
const ctx = canvas.getContext("2d");
const cellSize = canvas.width / world.width;


function drawGridSet(s, col, alpha=1.0){
	// takes a set of grid locations as strings "x,y" and draws them
	// in the given colour with the given alpha
	ctx.fillStyle = col;
	ctx.globalAlpha = alpha;
    s.forEach(key => {
				const [x, y] = key.split(",").map(Number);
				ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
	});
	ctx.globalAlpha = 1.0
}

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
	drawGridSet(world.obstacles,"#444")
	    
	// Scanned cells
	drawGridSet(world.scannedLife,"lime",0.4)
	drawGridSet(world.scannedNoLife,"yellow",0.4)
        
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

function resetWorld(){
	world.reset()
}



// ----- SCAN HANDLER -----
function scanCell(bot) {
	if(world.isScanned(bot.x, bot.y))
		return;
	const result = bot.searchForAlienLife();
	if(result){
		addOutput("Alien life detected! 👽")
		world.addScanned(bot.x, bot.y, true)
		
	} else {
		addOutput("No signs of alien life.");
		world.addScanned(bot.x, bot.y, false)
	}
	
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


// loop iterators are used to keep track of begin..end loops
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
	toString(){
		return this.constructor.name
	}
}

class InstTurnLeft extends Instruction {
	constructor(line){ super(line) }
	run(c){
		c.bot.turnLeft()
		c.next()
	}
}

class InstTurnRight extends Instruction {
	constructor(line){ super(line) }
	run(c){
		c.bot.turnRight()
		c.next()
	}
}

class InstMoveForwards extends Instruction {
	constructor(line){ super(line) }
	run(c){
		c.bot.moveForward()
		c.next()
	}
}

class InstScan extends Instruction {
	constructor(line){ super(line) }
	run(c){
		scanCell(c.bot)
		c.next()
	}
}

class InstPrint extends Instruction {
	constructor(line,action){
		super(line)
		// Split on spaces not inside quotes
		const parts = action.split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/);
		// strip quotes
		this.s = parts[1]?.replace(/^"|"$/g, '')
	} 
	run(c){
		addOutput(this.s)
		c.next()
	}
	toString(){
		return super.toString()+`["${this.s}"]`
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
	toString(){
		return super.toString()+`[times=${this.times}]`
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
				c.jump(ip)
			} else {
				c.stack.pop();
				c.next()
			}
		}
	}
	toString(){
		return super.toString()+`[jump=${this.begin.addr+1}]`
	}

}

class InstLeave extends Instruction {
	constructor(line,begin){
		// store the corresponding begin (so we can get the end)
		super(line)
		this.begin = begin
	}
	run(c){
		if(c.stack.length>0){ // ignore "leave" with no "begin"
			// get the end from the beginning, get the address,
			// and add one to get the instruction after the end
			c.jump(this.begin.end.addr+1) // and jump to it
			// pop the iterator, it's defunct
			c.stack.pop()
		}
	}
	toString(){
		return super.toString()+`[jump=${this.begin.end.addr+1}]`
	}
}

class InstStop extends Instruction {
	constructor(line){ super(line) }
	run(c){
		c.stop()
	}
}

/**
 * A map of condition checkers that:
 * 1. Avoids repetitive switch-case logic for better maintainability.
 * 2. Allows dynamic condition lookup without string matching.
 * 3. Supports both simple conditions ("blocked") and parameterized ones ("rolled 3").
 *
 * Why a Map instead of a switch?
 * - Switch statements become unwieldy with many conditions.
 * - This structure makes it easy to:
 *   a) Add new conditions without modifying existing code (Open/Closed Principle).
 *   b) Look up conditions dynamically (e.g., from user input).
 *   c) Store additional metadata about conditions if needed later.
 *
 * Each entry is a function that:
 * - Takes a `bot` object (game state).
 * - Optionally takes a `value` parameter (for conditions like "rolled 3").
 * - Returns a boolean result.
 */

const conditionMap = new Map([
	["blocked", (c) => c.bot.isBlocked()],
	["facingscanned", (c) => c.bot.isFacingScanned()],
	["onscanned", (c) => c.bot.isOnScanned()],
	["movingright", (c) => c.bot.direction === "E"],
	["movingleft", (c) => c.bot.direction === "W"],
	["movingup", (c) => c.bot.direction === "N"],
	["movingdown", (c) => c.bot.direction === "S"],
	["true", () => true],
	["false", () => false],
	["allscanned", (c) => {
		console.log("Unscanned: " + c.bot.world.unscanned());
		return c.bot.world.unscanned() == 0;
	}],
	["cointoss", () => Math.random() < 0.5],
	["rolled", (c, val) => {
		console.log(`Rolled: ${c.dice}, checking for ${val}, result is ${c.dice==val}`)
		return c.dice == val
	}]
]);



class InstIf extends Instruction {
	constructor(line,condition, openingIf=null) {
		super(line)
		
		// Parse conditions like:
		// - "blocked" → { negated: false, condition: "blocked" }
		// - "not blocked" → { negated: true, condition: "blocked" }
		// - "rolled 3" → { negated: false, condition: "rolled", value: 3 }
		// - "not rolled 2" → { negated: true, condition: "rolled", value: 2 }
		//
		// This is pretty ugly, relying on knowing that "rolled" is the only condition
		// that takes an argument.

		const parts = condition.split(" ");
		this.condition = parts[0]
		this.value = null
		this.negated = false
		// if this is an else-if, this points to the opening if...
		this.openingIf = openingIf

		// and ...this is a list of elseif-jumps that need patching when the endif turns up!
		// It only exists in the original if-statement
		this.elseIfJumps = []	

		// Handle "not" prefix
		if(parts[0] === "not"){
			parts.shift()
			this.negated = true
			this.condition = parts[0]
		}

		if (parts.length > 1) {
			// Handle "rolled X" (without "not")
			console.log(this.condition)
			console.log(parts.length)
			if (this.condition === "rolled" && parts.length === 2) {
				this.value = parseInt(parts[1], 10);
			} else {
				throw new Error(`Invalid condition: "${condition}"`);
			}
		}
		
		// address jumped to if condition is is false
		this.jumpaddr = -100  // this will get set by else/endif compilation
	}
	
	check(c) {
	  const checker = conditionMap.get(this.condition);
		if (!checker) {
			throw new Error(`Unknown condition: ${this.condition}`);
		}
		return checker(c,this.value);
	}
	
	run(c){
		// check the condition and jump forwards if we find it is false,
		// otherwise just move to next instruction
		let result = this.check(c)
		if(this.negated)result = !result
		if(result){
			c.next()
		} else {
			c.jump(this.jumpaddr)
		}
	}
	toString(){
		const t = this.openingIf==null ? null : this.openingIf.addr
		const efjs = this.elseIfJumps.map((x) => x.addr)
		return super.toString()+`[jumponfalse=${this.jumpaddr}, cond=${this.condition}${this.negated?",negated":""}, val=${this.value}, openingif=${t} e=${efjs}]`
	}
}

// simple jump instruction used for "else"
class InstJump extends Instruction {
	constructor(line, openingIf=null){
		super(line)
		this.jumpaddr = -1  // patch this later in ENDIF compilation
		this.openingIf = openingIf  // for when we deal with else-if; it points to the opening if in a chain.
	}
	run(c){
		console.log("Running "+this)
		c.jump(this.jumpaddr)
	}	
	toString(){
		return super.toString()+`[jump=${this.jumpaddr}]`
	}
}

// quickly generate a random number
class InstRollDice extends Instruction {
	constructor(line,sides){
		super(line)
		this.sides = sides
	}
	run(c){
		c.dice = Math.floor(Math.random() * this.sides)+1
		addOutput("Rolled a "+c.dice)
		c.next()
	}
	toString(){
		return super.toString()+`[sides=${this.sides}]`
	}
}
	
	
// this is the thing that runs the programs - the run context.

class Context {
	constructor(bot){
		this.reset()
		this.bot = bot
	}
	
	reset(){
		this.pc = 0   // program counter, index into instructions
		this.instructions = []  // list of instructions
		this.stopFlag = false // if true, stop the program!
		this.stack = [] // stack of loop data
		this.dice = 0 // the "dice roll" value
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
			for(let lineno=0;lineno<actions.length;lineno++){
				const line = actions[lineno]
				// lines can consist of multiple commands separated by semicolons.
				// Be aware that "print" strings with semicolons in will mess this up!
				for(const action of line.split(";")){
					// note that within a line the line number is constant
					console.log("Compiling "+action)
					console.log("   loopstack="+loopstack.length+" compilestack="+compilestack.length)
					if (action === "forward" || action === "move"){
						this.add(new InstMoveForwards(lineno))
					}
					else if(action === "turnleft" || action === "left"){
						this.add(new InstTurnLeft(lineno))
					}
					else if(action === "turnright" || action === "right"){
						this.add(new InstTurnRight(lineno))
					}
					else if(action === "scan"){
						this.add(new InstScan(lineno))
					}
					else if(action.startsWith("print")){
						// format: print "some string"
						// we pass the whole action into the instruction constructor for parsing
						this.add(new InstPrint(lineno,action))
					}
					else if(action.startsWith("begin")) {
						let times = action.split(" ");
						if(times.length>1){
							times = parseInt(times[1].trim());
						} else {
							times = 1000000; // FOREVER! Well, nearly
						}
						const inst = new InstBegin(lineno,times)
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
						this.add(new InstEnd(lineno,begin))
					}
					else if(action === "leave"){
						if(loopstack.length==0){
							throw new Error("'leave' without a 'begin'!")
						}
						// get the loop beginning, but don't pop
						const begin = loopstack[loopstack.length-1]
						// and compile the leave, telling it about the loop begin -
						// which it will use to find the loop end
						this.add(new InstLeave(lineno, begin))
					}
					else if(action === "stop") {
						this.add(new InstStop(lineno))
					}
					else if(action.startsWith("if ") || action.startsWith("else if ")) {
						let isElseIf = action.startsWith("else")
						let openingIf = null

						if(isElseIf){
							if(compilestack.length==0)
								throw new Error("'else if' without an 'if")
							// pop the previous if or elseif,
							// if it was an IF, then that is the opening if for this elseif. Otherwise we get the opening if from the
							// elseif we just popped.
							const inst = compilestack.pop()
							openingIf = inst.openingIf==null ? inst : inst.openingIf
							console.log(`Elseif: setting openingif to ${openingIf.addr}`)
							// add a jump instruction to close off the previous IF or ELSEIF.
							// add it to the opening IFs list of jumps to resolve when we get to ENDIF
							const jump = new InstJump(lineno)
							this.add(jump)
							openingIf.elseIfJumps.push(jump)
							// now patch the previous if/elseif to point to here.
							console.log(`Elseif: patching jump address of ${inst.addr} to ${this.instructions.length}`)
							inst.jumpaddr = this.instructions.length
						}

						// get the condition by doing the appropriate substring.
						let cond = action.substring(isElseIf ? 7: 3).trim()
						if(cond.length<=1){
							throw new Error("'if' needs a condition")
						}
						// add an IF-instruction, stacking it so we can patch the locations
						// of the forward jumps (to after ELSE or ENDIF)
						const inst = new InstIf(lineno,cond, openingIf)
						compilestack.push(inst)
						console.log(compilestack)
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
						const jumpinst = new InstJump(lineno, ifinst.openingIf)
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
						// and resolve the elseif-jumps
						console.log(`Endif: corresponding if is ${inst.addr}: ${inst}`)
						if(inst.openingIf!=null){
							console.log("Resolving elseifjumps")
							for(const i of inst.openingIf.elseIfJumps){
								console.log(`  Resolving ${i.addr} to point to ${inst.jumpaddr}`)
								i.jumpaddr = inst.jumpaddr
							}
						} else {
							console.log("No elseifjumps to resolve")
						}
					}
					else if(action.startsWith("roll")){
						let sides = action.split(" ");
						if(sides.length>1){
							sides = parseInt(sides[1].trim());
						} else {
							sides = 6  // six sided die by default
						}
						const inst = new InstRollDice(lineno,sides)
						this.add(inst)
					}
					else {
						throw new Error("Unknown action: "+action)
					}
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
			throw e // rethrow for console inspection
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
		console.log("Running "+this.pc+" : "+inst.toString())
		// highlight it in the program window and run it
		highlightProgLine(inst.line)
		inst.run(this)
		draw()
		updateData(this)
	}

	// dump the instructions to console
	dump(){
		for(const i of this.instructions){
			console.log(`${i.addr.toString().padStart(4,' ')}: ${i.toString()}`)
		}
	}
}
	
	
context = new Context(bot)      

function stepProgram(){
	context.step()
	draw()
}

function runProgram() {
	context.reset()
	context.compile()
	clearData(); // clear the data window
	function step() {
		try {
			// don't update and reset the timeout if the run has ended
			if(context.stopped()){
				context.stopFlag = false;
				return;
			}
			// run the next instruction
			context.step()
			// set a timeout to run the next one
			setTimeout(step, STEPTIME); // delay between actions
		} catch(e) {
			addOutput("Internal error: "+e.message)
			throw e  // rethrow so we can see console error
		}
	}
	
	draw(); // draw initial state
	step(); // do the first update
}

function stopProgram(){
	context.stop()
}

function showInstructions(){
	context.reset()
	context.compile()
	context.dump()
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
		setTimeout(step, STEPTIME);
	}
	
	step();
}
	
	// ----- INITIAL DRAW -----
window.addEventListener("load",() => {draw()})


/// Utilities

// this will allow tabbing in programming!
document.getElementById('programBox').addEventListener('keydown', function(e) {
	if (e.key === 'Tab') {
		e.preventDefault(); // Prevent default tab behavior
		const start = this.selectionStart;
		const end = this.selectionEnd;

		// Insert tab character
		this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);

		// Move caret position
		this.selectionStart = this.selectionEnd = start + 1;
	}
});