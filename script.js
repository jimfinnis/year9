// -----------------------------------------------------------
// LOAD EXOMARS IMAGE
// -----------------------------------------------------------
const roverImg = new Image();
roverImg.src = "exomars.png"; // Ensure file exists next to this HTML
// -----------------------------------------------------------

// ----- SETUP -----


// milliseconds between steps in program
const STEPTIME = 100
const FASTSTEPTIME = 20

// is there an active timeout? We keep this to stop students hammering the Run Program button
running = false

// the compiler and instruction interpreter for the language
language = new Language()

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
	language.bot = bot
	language.reset()
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

function syntaxError(s,lineno) {
	addOutput("Error in program at line "+lineno+" :" + s);
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
	if(confirm("This will wipe your program! Are you absolutely sure?")){
		// see proviso on this function about deprecation of execCommand; should be
		// OK though.
		replaceAllTextPreservingUndo(document.getElementById("programBox"), "")
	}
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

	
	
function stepProgram(event){
	if(event.shiftKey || !language.hasCompiledProgram()){
		language.reset(bot)
		language.compile(document.getElementById("programBox").value)
	}
	language.step()
	draw()
}

function runProgram(event) {
	// only let this happen if the user isn't already running the code!
	if(running){
		console.log("already running")
		return;
	}

	var stepTime = event.shiftKey ? FASTSTEPTIME : STEPTIME
		

	language.reset(bot)
	language.compile(document.getElementById("programBox").value)
	clearData(); // clear the data window

	running = true

	function step() {
		try {
			// don't update and reset the timeout if the run has ended
			if(language.stopped()){
				language.stopFlag = false;
				running = false;
				console.log("stopping")
				return;
			}
			// run the next instruction
			language.step()
			// set a timeout to run the next one
			setTimeout(step, stepTime); // delay between actions
		} catch(e) {
			addOutput("Internal error: "+e.message)
			throw e  // rethrow so we can see console error
		}
	}
	
	draw(); // draw initial state
	step(); // do the first update
}

function stopProgram(){
	language.stop()
}

function showInstructions(){
	language.reset(bot)
	language.compile(document.getElementById("programBox").value)
	language.dump()
}

function replaceAllTextPreservingUndo(textarea, s) {
	if(!document.queryCommandSupported("insertText")){
		// it's not a great check because this check is also deprecated (for pity's sake)
		// but it's something.
		textarea.value=s
		return
	}
    const scrollTop = textarea.scrollTop;

    textarea.focus();
    textarea.select(); // select all

	// Yes, this is deprecated formally, but pretty much every browser still supports it
	// because there's no alternative (without pulling in editor libraries like Slate.js)
    document.execCommand("insertText", false, s);

	// remove the selection and leave the caret at the end
	const end = s.length
	textarea.setSelectionRange(end,end)

    textarea.scrollTop = scrollTop;
}


function reformatProgram(){
	t = document.getElementById("programBox")
	src = language.indentCode(t.value)
	replaceAllTextPreservingUndo(t, src)


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