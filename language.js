// this is the thing that both compiles and runs the programs.
// The "compile" method does the compilation, the "step" method runs a single
// step (called repeatedly by event timeouts in the main program)

class Language {
	constructor(){
		this.reset(null)
	}
	
	reset(bot){
		this.pc = 0   // program counter, index into instructions
		this.instructions = []  // list of instructions
		this.stopFlag = false // if true, stop the program!
		this.stack = [] // stack of loop data
		this.dice = 0 // the "dice roll" value
		this.bot = bot  // set the robot we're working with
		this.count = 0 // how many instructions since start
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
		addOutput("Run stopped after "+this.count+" actions!")
	}
	
	// return true if we're out of instructions or the stop flag is set
	stopped(){
		return this.stopFlag || this.pc>=this.instructions.length
	}
	
	
	// compile the actions box contents into a sequence of instructions
	compile(program) {
		this.instructions = []  // clear the output 
		let compilestack = []  // stack for compilation purposes (if..then, mainly)
		let loopstack = [] // stack of loop start instructions

		let lineno = 0
		const actions = program.split("\n").map(a => a.trim().toLowerCase());
		
		try {
			for(lineno=0;lineno<actions.length;lineno++){
				let line = actions[lineno]
				// deal with comments
				if(line.includes("#")){
					line = line.split("#")[0]
					console.log("Split - now "+line)
				}
				// lines can consist of multiple commands separated by semicolons.
				// Be aware that "print" strings with semicolons in will mess this up!
				for(let action of line.split(";")){

					if(action==="")continue; // ignore semicolon at end of line and blank line
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
					else if(action.startsWith("say") || action.startsWith("print")){
						// format: print "some string"
						// we pass the whole action into the instruction constructor for parsing
						this.add(new InstPrint(lineno,action))
					}
					else if(action.startsWith("repeat") || action.startsWith("begin")) {
						let times = action.split(" ");
						if(times.length>1){
							times = parseInt(times[1].trim());
						} else {
							times = 1000000; // FOREVER! Well, nearly
						}
						const inst = new InstBegin(lineno,times)
						this.add(inst)
						// stack the start of the loop so we can resolve "leave" and "end" instructions
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
						// which it will use to find the loop end to jump past.
						this.add(new InstLeave(lineno, begin))
					}
					else if(action === "stop") {
						this.add(new InstStop(lineno))
					}
					else if(action.startsWith("if ") || action.startsWith("else if ")) {
						const isElseIf = action.startsWith("else")
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
			syntaxError(e.message, lineno)
			this.instructions = []
			throw e // rethrow for console inspection
		}
	}

	hasCompiledProgram(){
		return this.instructions.length > 0
	}
	
	// run a single program step - there must be a compiled program!
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
		this.count++
		draw()
		updateData(this)
	}

	// dump the instructions to console
	dump(){
		for(const i of this.instructions){
			console.log(`${i.addr.toString().padStart(4,' ')}: ${i.toString()}`)
		}
	}
	indentCode(source) {
		const lines = source.split(/\r?\n/);
		const out = [];
		let indent = 0;

		const startsBlock = stmt =>
			/^(repeat|if|begin)\b/.test(stmt);

		const endsBlock = stmt =>
			/^(end|endif)\b/.test(stmt);

		const midBlock = stmt =>
			/^(else\b|else if\b)/.test(stmt);

		for (let raw of lines) {
			if (raw.trim() === "") {
				out.push("");
				continue;
			}

			// Capture original leading whitespace for comment preservation
			const leadingWS = raw.match(/^\s*/)[0];

			// Separate code from comment
			let code = raw;
			let comment = "";
			const hashIndex = raw.indexOf("#");
			if (hashIndex !== -1) {
				code = raw.slice(0, hashIndex);
				comment = raw.slice(hashIndex); // keep comment exactly
			}

			// Split into statements
			const statements = code
				.split(";")
				.map(s => s.trim())
				.filter(s => s.length > 0);

			const formatted = [];

			for (let stmt of statements) {

				// Closing block: reduce indent first
				if (endsBlock(stmt)) {
					indent = Math.max(indent - 1, 0);
				}

				// Mid-block (else / else if)
				if (midBlock(stmt)) {
					indent = Math.max(indent - 1, 0);
					formatted.push("\t".repeat(indent) + stmt);
					indent++; // restore indent for following statements
					continue;
				}

				// Normal statement
				formatted.push("\t".repeat(indent) + stmt);

				// Opening block: increase indent afterwards
				if (startsBlock(stmt)) {
					indent++;
				}
			}

			// Reattach comment with ORIGINAL indentation
			if (comment) {
				if (formatted.length === 0) {
					// comment-only line
					out.push(leadingWS + comment);
				} else {
					// attach comment to last statement, but keep comment's own indent
					const last = formatted.pop();
					formatted.push(last + " " + comment);
				}
			}

			out.push(...formatted);
		}

		return out.join("\n");
	}
}