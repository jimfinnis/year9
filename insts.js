// These are the compiled instructions. Each has a "run" method  that takes the
// running Language object - this is called "c" for historical reasons (used
// to be a Context object)

// The constructor takes a line number in the actions box; by default
// the constructor just increments the program counter by calling Language's next().

instructions = []    // list of compiled instructions

class Instruction {
	constructor(line){
		this.line=line
		this.addr = -1  // this will get patched by Language.add()
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
		if(typeof(this.s)=="undefined"){
			throw new Error("error in 'say' action: can't analyse text - perhaps it isn't surrounded by quotes")
		}
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
