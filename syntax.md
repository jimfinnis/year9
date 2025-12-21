# Language syntax

## Simple commands

* **forward** - move robot forward (if unblocked)
* **left** or **turnleft** - turn robot left
* **right** or **turnright** - turn robot right
* **scan** - scan the current square (if not already scanned)
* **print "text"** - print a string of text
* **stop** - terminate the program

## Loops

* **begin** - start an infinite loop (well, nearly infinite)
* **begin 10** - start a 10-times loop (you can use any number)
* **end** - end a loop
* **leave** - leave a loop (typically used inside an if-statement, see below)

An example:
```
begin
    print "This loop runs forever!"
    forward
end
```
The indenting isn't necessary but makes code easier to read.
Loops can be nested (you can have loops in loops):
```
begin 4
    forward
    print "This outer loop runs 4 times"
    begin 4
        print "This inner loop runs 4 times and makes the robot turn on the spot"
        right
    end
end
```

## If-statements

An example of a basic if-statement:
```
if blocked
    print "I can't move"
endif
```

A full list of conditions that can replace "blocked" in the example is given later.
Conditions can be nested (you can put if-statements inside other if-statements):
```
if blocked
    if movingright
        print "I'm blocked while trying to go right"
    endif
    if movingleft
        print "I'm blocked while trying to go left"
    endif
endif
```

## If-else statements
You can also have an else part, which happens when the condition is not true:
```
if blocked
    print "I'm blocked!"
else
    print "I can move into the next square"
endif
```
These can also be nested - and you can also put loops inside if-statements and if-statements inside loops. 

## else-if
It's also possible to have a chain of "if" and "else if" statements like this:
```
if movingleft
    print "I'm going left!"
else if movingright
    print "I'm going right!"
else if movingup
    print "I'm moving up!"
else
    print "I'm going somewhere else! Down, it has to be!"
endif
```

## Conditions in if-statements

* **blocked** - the square in front is outside the grid or contains an obstacle
* **facingscanned** - the square in front has already been scanned
* **onscanned** - the square with the robot inside has been scanned
* **movingright** - the robot is moving right
* **movingleft** - the robot is moving left
* **movingup** - the robot is moving up
* **movingdown** - the robot is moving doown
* **allscanned** - all squares have been scalled

## Randomness

Sometimes it's useful to run some parts of the program depending on a random condition. The simplest way to do this is with **cointoss**, which makes the code inside the if-statement run half the time, at random:
```
begin
    if cointoss
        print "Heads"
    else
        print "Tails"
    endif
end
```
You can also **roll** a die and check to see if a particular number came up with **rolled**:
```
begin
    roll
    if rolled 1
        print "You rolled a one"
    else if rolled 6
        print "You rolled a six!"
    else
        print "You rolled something else, it's not important."
    endif
```
For the Dungeons and Dragons players among you, you can roll a die of any number of sides:
```
roll 20
if rolled 20
    print "You rolled a 20!!!"
endif
```

## Multi-command lines

You can put more than one command on a line by separating them with semicolons:
```
begin
	if blocked
		right
	else if onscanned
		roll 4;if rolled 1;right;endif
	else
		if facingscanned;right;endif
		scan
	endif
	forward
	
	if allscanned
		stop
	endif
end
```
