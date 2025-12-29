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
