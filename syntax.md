# Language syntax

## Simple commands

* **forward** - move robot forward (if unblocked)
* **left** or **turnleft** - turn robot left
* **right** or **turnright** - turn robot right
* **scan** - scan the current square (if not already scanned)
* **say "text"** - write some text to the Robot Output box
* **stop** - terminate the program

## Loops

* **repeat** - start an infinite loop (well, nearly infinite)
* **repeat 10** - start a 10-times loop (you can use any number)
* **end** - end a loop
* **leave** - leave a loop (typically used inside an if-statement, see below)

An example:

```
repeat
    say "This loop runs forever!"
    forward
end
```

The indenting isn't necessary but makes code easier to read.
Loops can be nested (you can have loops in loops):
```
repeat 4
    forward
    say "This outer loop runs 4 times"
    repeat 4
        say "This inner loop runs 4 times and makes the robot turn on the spot"
        right
    end
end
```

## Errors
If you make a mistake in the language, you'll see a message like this:
```
Error in program at line 5: (some message here)
```
The lines are numbered from zero - so the first line is line zero. The message will hopefully give you a clue about what the error is.

## If-statements

An example of a basic if-statement:
```
if blocked
    say "I can't move"
endif
```

A full list of conditions that can replace "blocked" in the example is given later.
Conditions can be nested (you can put if-statements inside other if-statements):
```
if blocked
    if movingright
        say "I'm blocked while trying to go right"
    endif
    if movingleft
        say "I'm blocked while trying to go left"
    endif
endif
```

## If-else statements
You can also have an else part, which happens when the condition is not true:
```
if blocked
    say "I'm blocked!"
else
    say "I can move into the next square"
endif
```
These can also be nested - and you can also put loops inside if-statements and if-statements inside loops. 

## else-if
It's also possible to have a chain of "if" and "else if" statements like this:
```
if movingleft
    say "I'm going left!"
else if movingright
    say "I'm going right!"
else if movingup
    say "I'm moving up!"
else
    say "I'm going somewhere else! Down, it has to be!"
endif
```

## Conditions in if-statements

* **blocked** - the square in front is outside the grid or contains an obstacle
* **facingscanned** - the square in front has already been scanned
* **onscanned** - the square with the robot inside has been scanned
* **movingright** - the robot is moving right
* **movingleft** - the robot is moving left
* **movingup** - the robot is moving up
* **movingdown** - the robot is moving down
* **allscanned** - all squares have been scanned

## Using "not" in conditions
You can also put **not** in front of any condition:
```
if not blocked
    say "I can go forward!"
        forward
    scan
endif
```

## Randomness

Sometimes it's useful to run some parts of the program depending on a random condition. The simplest way to do this is with **cointoss**, which makes the code inside the if-statement run half the time, at random:
```
repeat
    if cointoss
        say "Heads"
    else
        say "Tails"
    endif
end
```
You can also **roll** a die and check to see if a particular number came up with **rolled**:
```
repeat
    roll
    if rolled 1
        say "You rolled a one"
    else if rolled 6
        say "You rolled a six!"
    else
        say "You rolled something else, it's not important."
    endif
end
```
For the Dungeons and Dragons players among you, you can roll a die of any number of sides:
```
roll 20
if rolled 20
    say "You rolled a 20!!!"
endif
```

## Multi-command lines

You can put more than one command on a line by separating them with semicolons:
```
repeat
    scan;forward
    if blocked;leave;endif
end
```
