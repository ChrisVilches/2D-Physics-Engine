# 2D Physics Engine

## How to use

Clone or download and open `index.html` in your browser. No scripts or installation required.

## Current functionalities

Currently supported functionalities.

* Wall collision detection. However keep in mind that walls are purposely single-sided. This is to keep the algorithm cheap. If you want to create a solid two-sided wall, you need to create two independent walls, but the object should have some width (thickness), otherwise the collision detection becomes glitchy.
* Wallkicks.
* Triple jump. The third one must be done with some speed, otherwise it won't work (this is by design).
* Elevators (platform that moves up and down).

## TODO

Other than refactoring the code (which is extremely dirty right now), I'd like to implement:

* Elevators that move from side to side.
* Collision detection with space partitioning. Currently the collision detection is executed by checking all objects in the map (the hardcoded map currently doesn't have many objects).
* Make the character point in one direction. Currently the character can wallkick the same wall many times. I'd like to make the character face the opposite direction after wallkicking, which would make that same wall non-wallkickable. This would have other effects as well (not decided yet).
* Mid-air double jumps.
* Water swimming and diving.
* Automatic/smart camera movement.
* Add ceilings.
* Make walking more smooth (the movement breaks a bit when two lines with different slope are connected).
* Implement other movement mechanics.

Also not 100% related to the game physics, but I'd like to implement a system that generates objects and (larger) maps randomly.
