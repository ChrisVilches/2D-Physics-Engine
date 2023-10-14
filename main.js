// Warning: Extremely ugly and non-refactored code.
//          Still quite legible though, because most lines of code don't depend
//          or interact with each other, so a function can be long, and still not
//          be bug-prone (still needs refactor).

let canvas = document.getElementById("canvas")
let width = canvas.width;
let height = canvas.height;
document.getElementById("canvas-size").innerHTML = `${width} x ${height} (width x height)`;
let ctx = canvas.getContext("2d");

// TODO: Consider adding immutable methods.
class Point{
  constructor(x, y){
    if(typeof x !== 'number') throw new Error("'x' must be a number");
    if(typeof y !== 'number') throw new Error("'y' must be a number");
    this.x = x;
    this.y = y;
  }

  dot(p) {
    return this.x * p.x + this.y * p.y
  }

  cross(p) {
    return this.x * p.y - this.y * p.x
  }

  dist(p) {
    return this.sub(p).magnitude()
  }

  magnitude() {
    return Math.hypot(this.x, this.y)
  }

  unitDir(p) {
    return p.sub(this).normalize()
  }

  normalize() {
    const m = this.magnitude()
    return new Point(this.x / m, this.y / m)
  }

  add(p) {
    return new Point(this.x + p.x, this.y + p.y)
  }

  sub(p) {
    return new Point(this.x - p.x, this.y - p.y)
  }

  rotCCW() {
    return new Point(-this.y, this.x)
  }

  scale(f) {
    return new Point(this.x * f, this.y * f)
  }
}

// TODO: I have to add ceilings. This is probably relatively easy.
//       (compared to walls and floors.)

// TODO: Refactor using Segment { p, q }
//       Add logic (collisions, etc) here.
class Segment {
  constructor(p, q){
    this.p = p;
    this.q = q;
  }

  scale(f) {
    const dir = this.q.sub(this.p)
    const scaledDir = dir.scale(f)
    return new Segment(this.p, this.p.add(scaledDir))
  }

  dist(r) {
    const { p, q } = this
    if ((q.sub(p)).dot(r.sub(p)) <= 0) return p.dist(r);
    if ((p.sub(q)).dot(r.sub(q)) <= 0) return q.dist(r);
    return Math.abs((q.sub(p)).cross(r.sub(p))) / p.dist(q);
  }

  // TODO: Move this somewhere else.
  ADHOC_closestPoint(r) {
    const { p, q } = this
    // TODO: Sadly this is necessary, otherwise the point reference
    //       is returned, and it starts modifying the floors when
    //       the character moves lol
    //       UPDATE: Modified it so that it returns r if the point
    //               cannot be projected onto the segment.
    if ((q.sub(p)).dot(r.sub(p)) <= 0) return r // return new Point(p.x, p.y);
    if ((p.sub(q)).dot(r.sub(q)) <= 0) return r // return new Point(q.x, q.y);
    // TODO: Doesn't need to be unit. That wastes a sqrt(x^2 + y^2)
    const dir = this.p.unitDir(this.q).rotCCW()
    const t = r.add(dir)
    const factor = t.sub(r).cross(p.sub(r)) / q.sub(p).cross(t.sub(r));
    return this.scale(factor).q;
  }

  intersectsCircle(c, r) {
    return this.dist(c) < r
  }

  length() {
    return this.p.dist(this.q)
  }
}

// TODO: Use composition, lel. Or is inheritance ok?
//       Since not all floors are moving, it makes sense
//       to make this class be named "moving floor",
//       and only update the velocity for these, and not for non-moving.
//       (to improve performance). Note that when I implement the partitioning
//       algorithm, some floors need to be rendered (along with the movement),
//       but not detect the collisions, so it's important to make this distinction
//       and separate types of floors correctly.
class MovingFloor extends Segment {
  constructor(p, q, sequence) {
    super(p, q)
    this.sequence = sequence
    this.v = sequence[0].v
    this.frame = 0
    this.idx = 0
  }

  updateVelocity() {
    const { v, frames } = this.sequence[this.idx]
    this.v = v
    this.frame++

    if (this.frame === frames) {
      this.idx = (this.idx + 1) % this.sequence.length
      this.frame = 0
    }
  }

  updatePosition() {
    this.p = this.p.add(this.v)
    this.q = this.q.add(this.v)
  }

  update() {
    this.updateVelocity();
    this.updatePosition();
  }
}

let lastClickedPos = new Point(0, 0);

function getCursorPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = height - event.clientY + rect.top;
  lastClickedPos.x = x;
  lastClickedPos.y = y;
}

canvas.addEventListener('mousedown', function(e) {
  getCursorPosition(canvas, e);
})

// TODO:
// Make floors also directed, so the algorithm becomes simpler.
// Fix collision algorithm to make it directed, that way it becomes computationally cheaper.
//
// TODO: Structure code using object-oriented programming.

///////////////////////////////////
////////// State definitions //////
///////////////////////////////////
const FALLING = 0;
const STANDING = 1;
const JUMP = 2;

///////////////////////////////////
/// Game physics configuration ////
///////////////////////////////////
const FALLING_SPEED = 4.7;
const CHARACTER_SIZE = 5;
const JUMP_SPEED = 10;
const JUMP_DEACCELERATION = 0.5;
const SPEED_ACCELERATION = 0.1;
const MAX_WALKING_SPEED = 2;
const INITIAL_WALKING_SPEED = 0.1;
const SPEED_ERROR = SPEED_ACCELERATION; // Speeds below this value will be equalled to zero.
const WALLKICK_FRAMES = 20;
const REPEATED_JUMP_FRAMES = 10;
const SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP = 1.5;

//////////////////////////////////////
/// Current physics and game state ///
//////////////////////////////////////
let character = new Point(340, 455);
const floors = [];
const walls = [];
let currentSpeed = 0;
let currentState = FALLING;
let currentJumpSpeed = 0;

///////////////////////////////////
////////////// Other //////////////
///////////////////////////////////

// Used to store the last touched floor instead of getting it again.
let currentFloor = null;

// After landing, the user needs to release the UP key at least once.
// This flag will be activated, and be used to initiate jumps. It's set to false
// after the jump has started. Only used in standing state.
let releasedUpAtLeastOnce = false;

let currentTouchingWall = null;

let framesSinceTouchedWall = 0;

let framesSinceLanded = Infinity;

let currentJumpLevel = 1; // 1, 2 or 3.

///////////////////////////////////
//////// Input management /////////
///////////////////////////////////
const LEFT_DIR = 0;
const RIGHT_DIR = 1;
const UP_DIR = 2;
const DOWN_DIR = 3;

const KEY_CODES_DIR_MAP = {
  [65]: LEFT_DIR,
  [83]: DOWN_DIR,
  [68]: RIGHT_DIR,
  [87]: UP_DIR
};

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function keyDownHandler(e) {
  let keyCode = e.keyCode;
  let dir = KEY_CODES_DIR_MAP[keyCode];
  switch(dir){
  case LEFT_DIR: leftPressed = true; break;
  case RIGHT_DIR: rightPressed = true; break;
  case DOWN_DIR: downPressed = true; break;
  case UP_DIR: upPressed = true; break;
  }
}

function keyUpHandler(e) {
  let keyCode = e.keyCode;
  let dir = KEY_CODES_DIR_MAP[keyCode];
  switch(dir){
  case LEFT_DIR: leftPressed = false; break;
  case RIGHT_DIR: rightPressed = false; break;
  case DOWN_DIR: downPressed = false; break;
  case UP_DIR: upPressed = false; break;
  }
}

///////////////////////////////////
///// Creation of dummy map ///////
///////////////////////////////////

function drawSquare(centerX, centerY, width, height){
  floors.push(new Segment(new Point(centerX-(width/2), centerY+(height/2)), new Point(centerX+(width/2), centerY+(height/2))));
  walls.push(new Segment(new Point(centerX+(width/2), centerY+(height/2)), new Point(centerX+(width/2), centerY-(height/2))));
  walls.push(new Segment(new Point(centerX-(width/2), centerY-(height/2)), new Point(centerX-(width/2), centerY+(height/2))));
}

drawSquare(650, 80, 50, 300);
drawSquare(750, 120, 50, 300);
drawSquare(700, 310, 50, 20);
drawSquare(758, 367, 50, 20);

floors.push(new Segment(new Point(0, 0), new Point(100, 100)));
floors.push(new Segment(new Point(100, 100), new Point(200, 100)));
floors.push(new Segment(new Point(200, 100), new Point(300, 80)));
floors.push(new Segment(new Point(300, 80), new Point(500, 30)));
floors.push(new Segment(new Point(500, 30), new Point(600, 80)));
floors.push(new Segment(new Point(300, 170), new Point(600, 200)));
floors.push(new Segment(new Point(250, 150), new Point(450, 0)))

walls.push(new Segment(new Point(100, 400), new Point(100, 100)));
walls.push(new Segment(new Point(300, 20), new Point(249, 150)));
walls.push(new Segment(new Point(550, 500), new Point(500, 20)));
walls.push(new Segment(new Point(200, 400), new Point(200, 130)));
walls.push(new Segment(new Point(150, 100), new Point(150, -100)));
floors.push(new Segment(new Point(100, 400), new Point(200, 400)));
floors.push(new Segment(new Point(250, 200), new Point(400, 200)));
floors.push(new MovingFloor(
  new Point(350, 300),
  new Point(450, 300),
  [
    {
      v: new Point(0, -0.8),
      frames: 100
    },
    {
      v: new Point(0, 0.8),
      frames: 100
    }
  ]));
// TODO: Maybe a better API should be to specify the initial velocity.
// Or just pass a definition of a piecewise function, and then let the
// class evaluate that function.
floors.push(new MovingFloor(new Point(250, 370), new Point(400, 370), [
  {
    v: new Point(0.5, 0),
    frames: 100
  },
  {
    v: new Point(-0.5, 0),
    frames: 100
  }
]));
floors.push(new Segment(new Point(400, 350), new Point(434, 335)));
floors.push(new Segment(new Point(434, 335), new Point(470, 345)));
floors.push(new Segment(new Point(470, 345), new Point(530, 330)));

const movingFloors = floors.filter(f => f instanceof MovingFloor)

/**
 * This method is used for all collisions against walls and floors.
 * TODO: It can be optimized so that floors are directed (i.e. have a normal, and the collision is only checked
 * in that direction), just like walls (already implemented).
 * @param {Line array} lines Array of lines to check against.
 * @return {Line} The line (from the array) the character is touching, or null if it's not touching any line.
 */
function characterTouchesLine(lines){
  for(let i=0; i<lines.length; i++){
    const line = lines[i];
    if (line.intersectsCircle(character, CHARACTER_SIZE)) {
      return line;
    }
  }
  return null;
}

/**
 * Update speed
 * @param {float} accel Acceleration to use. This way, while jumping the acceleration value can be different.
 */
function updateSpeed(accel){
  if(rightPressed || leftPressed){
    // Increase speed in the direction of the right/left button.
    let dir = (rightPressed ? 1 : -1);
    if(currentSpeed === 0){
      currentSpeed = dir * INITIAL_WALKING_SPEED;
    } else {
      currentSpeed += dir * accel;
      if(Math.abs(currentSpeed) >= MAX_WALKING_SPEED){
        currentSpeed = dir * MAX_WALKING_SPEED;
      }
    }
  } else {
    // If the right/left buttons aren't pressed, then begin to decrease the speed.
    // If it's inside the error range, then set it to zero and finish.
    if(Math.abs(currentSpeed) < SPEED_ERROR){
      currentSpeed = 0;
      return;
    }
    // Get the direction of where it was going before stopping and
    // decrease so it becomes closer to zero.
    let dir = currentSpeed > 0 ? 1 : -1;
    currentSpeed -= dir * accel;
  }
}

function fallingState(){
  // TODO: Does it make any difference to put this code before or after the floor collision detection?
  // There is a bug where when the game starts in the falling state, and in the floor there's a wall
  // directly below the first floor, the currentFloor will be null (because of the order of execution
  // in this code), and the wall below won't be ignored, and the character will glitch (i.e. be pushed
  // by the wall), even though there is a code that ignores walls that are below.
  // However, this only happens for the first floor collision, and only in the rare case where there is a
  // wall directly below, so it's extremely rare anyways. Remove this code if there's no sign
  // this order of execution (i.e. change X, Y position first, and then detect collisions) will have
  // any impact. Remember: if the glitch doesn't happen regularly, then don't fix it.
  character.x += currentSpeed;
  character.y -= FALLING_SPEED;

  if((line = characterTouchesLine(floors)) !== null){
    // This is to align the character with the floor's Y component.
    // Without this line, if the character is constantly jumping on a slope, the detection would
    // detect a point with a X component different to the character's X, and it would constantly be moving
    // up or down hill as he keeps jumps (not necessarily a bug).
    // TODO: Ok but not sure why this happens. I hope I can remove this since it's
    //       kinda sketchy.
    character.y = getYFromX(line, character.x);
    
    // This code is executed when just landed. Maybe refactor into a separate method to know where
    // to add landing logic.
    currentState = STANDING;
    framesSinceLanded = 0;

    // Reset this flag when entering standing state.
    // If we remove this line, then the standing state would inherit this flag's value
    // from previous states, meaning that it could be any value.
    // More concretely, the bug that happens if we remove this line, is this:
    // 1. Make the character fall.
    // 2. While falling press jump button without releasing it (it was not pressed before).
    // 3. When it lands, it will jump again (probably because the flag is set to true).
    releasedUpAtLeastOnce = false;

    currentFloor = line;
    return;
  }

  updateSpeed(SPEED_ACCELERATION);
  checkAndExecuteWallKick();
}

function standingState(){
  let line;

  if(!upPressed){
    releasedUpAtLeastOnce = true;
  }

  // First, check if it's still standing in the latest floor registered as 'current floor'.
  // The heuristic is to assume it's still standing in the same floor. If it's not, then check
  // all other floors. 
  if(currentFloor !== null && characterTouchesLine([currentFloor])){
    line = currentFloor;
  } else {
    line = characterTouchesLine(floors);
    currentFloor = line;
  }
  if(line === null){
    currentState = FALLING;
    framesSinceTouchedWall = 0;
    return;
  }

  // This line is necessary. If removed, sometimes the character can glitch through walls
  // when the floor and wall are in certain angles.
  // TODO: Analyze why? It happens when there's a wall touching two floors (all three
  //       elements pass through the same point. The character glitches through this point.)
  // character = closestPointOnLine(line, character);
  // // TODO: With the new one, it doesn't fall from moving floors.
  character = line.ADHOC_closestPoint(character)

  updateSpeed(SPEED_ACCELERATION);

  // TODO: Try to remove so many constants? (low priority)
  if(framesSinceLanded < REPEATED_JUMP_FRAMES){
    framesSinceLanded++;
  }

  const mov = getMovementDirection(line);

  character = character.add(mov.scale(currentSpeed))

  if (line instanceof MovingFloor) {
    character = character.add(line.v)
  }

  // Initiate jump
  if(upPressed && releasedUpAtLeastOnce){
    releasedUpAtLeastOnce = false;
    currentState = JUMP;

    if(framesSinceLanded < REPEATED_JUMP_FRAMES){

      if(currentJumpLevel == 2){
        if(Math.abs(currentSpeed) > SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP){
          currentJumpLevel++;
        } else {
          currentJumpLevel = 1;
        }
      } else {
        currentJumpLevel++;
      }

      // It means it cannot go up anymore. The next time it jumps it will be a level 1.
      if(currentJumpLevel > 3){ currentJumpLevel = 1; }
    }

    // This is to make jumps lower or higher depending
    // on the jump level (1, 2 or 3), however it seems it doesn't work.
    let jumpSpeedFactor;
    switch(currentJumpLevel){
      case 1:
        jumpSpeedFactor = 0.6;
      break;
      case 2:
        jumpSpeedFactor = 0.8;
      break;
      case 3:
        jumpSpeedFactor = 1;
      break;
    }

    // TODO: Try affecting the falling speed or deacceleration (or whatever) instead.
    currentJumpSpeed = JUMP_SPEED * jumpSpeedFactor;
    framesSinceTouchedWall = 0;
  }

  if(framesSinceLanded >= REPEATED_JUMP_FRAMES){
    currentJumpLevel = 1;
  }
}

function checkAndExecuteWallKick(){
  if(!upPressed){
    releasedUpAtLeastOnce = true;
  }

  // TODO: Missing check. Implement bonking and "losing the oportunity to wallkick, even
  //       if it gains speed while falling, and touches another wall."

  // TODO: This number should be higher, but with a higher number it's very difficult to wallkick.
  //       Something else also needs to be fixed, it seems.
  const speedEnough = Math.abs(currentSpeed) > 0;

  // NOTE: The number is the frame window that allows to wallkick.
  if(speedEnough && currentTouchingWall && releasedUpAtLeastOnce && framesSinceTouchedWall < WALLKICK_FRAMES){
    if(upPressed){
      // Copied from standing state. Refactor.
      releasedUpAtLeastOnce = false;
      currentState = JUMP;
      currentJumpSpeed = JUMP_SPEED;
      framesSinceTouchedWall = 0;
      currentSpeed *= -1;
    }
  }
}

function jumpState(){
  character.x += currentSpeed;
  character.y += currentJumpSpeed;
  currentJumpSpeed -= JUMP_DEACCELERATION;
  if(currentJumpSpeed <= 0){
    currentJumpSpeed = JUMP_SPEED;
    currentState = FALLING;
  }
  updateSpeed(SPEED_ACCELERATION / 2);
  checkAndExecuteWallKick();
}

const FRAMES_SINCE_TOUCHED_WALL_MAX = 10000;

/**
 * This is executed on every frame, despite the current state.
 */
function handleWallCollisions(){
  currentTouchingWall = characterTouchesLine(walls);
  let wall = currentTouchingWall;

  if(wall == null){
    framesSinceTouchedWall = 0;
    return;
  }

  // Is current floor below? If it's below, then don't consider collision.
  // I think this is to avoid detecting collisions when there's a wall or something
  // immediately below the floor (like in a corner, in which case there shouldn't
  // be a collision detected.)
  if(currentFloor !== null && wallBelowFloor(wall, currentFloor)){
    return;
  }

  let yPercent = (character.y - wall.p.y) / (wall.q.y - wall.p.y);
  let x = wall.p.x -  ((wall.p.x - wall.q.x) * yPercent);
  character.x = x + wallDirection(wall) * CHARACTER_SIZE;

  // Make it lose speed if it has touched a wall (falling or standing).
  // If the number is too large, it prevents wallkicks from gaining speed.
  // But if we only decrease speed AFTER the wallkick frame window, then it
  // probably doesn't impact it, and we can keep both effects (wallkicking with
  // speed, and also making it lose speed if it touches the wall for too long)
  if(FRAMES_SINCE_TOUCHED_WALL_MAX > WALLKICK_FRAMES){
    currentSpeed /= 1.2;
  }

  // Start counting how many frames have passed since it first touched a wall.
  if(framesSinceTouchedWall < FRAMES_SINCE_TOUCHED_WALL_MAX){
    framesSinceTouchedWall++;
  }
}

function updateCharacter(){
  switch(currentState){
  case FALLING:  fallingState();  break;
  case STANDING: standingState(); break;
  case JUMP:     jumpState();     break;
  }
  handleWallCollisions();
}

/**
 * Used when the character is standing on a floor, and moving.
 * The movement will be following the slope of that floor.
 * @param {Line} line The line that represents the floor.
 * @return {Line} A vector with positive X, positive or negative Y, and module 1.
 */
function getMovementDirection(line){
  // Get X and Y components of the direction it moves.
  const movementDirection = line.p.unitDir(line.q)// // line.q.sub(line.p).normalize();
    
  // But the horizontal speed is determined by the key pressed, so
  // we only care about how the vertical speed changes due to the slope.
  movementDirection.x = Math.abs(movementDirection.x);
  return movementDirection;
}

function update(progress){
  updateCharacter();
  movingFloors.forEach(f => {
    f.update()
  })
}

function drawLine(line){
  ctx.beginPath();
  ctx.moveTo(line.p.x, height - line.p.y);
  ctx.lineTo(line.q.x, height - line.q.y);
  ctx.stroke();
}

function drawCharacter(){
  ctx.fillStyle = "red";
  ctx.fillRect(
    character.x - (CHARACTER_SIZE/2),
    height - character.y - (CHARACTER_SIZE/2),
    CHARACTER_SIZE,
    CHARACTER_SIZE
  );
}

function drawDebugInfo(){
  let margin = 20;
  let initialPos = 20;
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";

  let debugTexts = [
    () => `Speed: ${currentSpeed}`,
    () => {
      switch(currentState){
        case JUMP: return "Jump";
        case STANDING: return "Standing";
        case FALLING: return "Falling";
      }
    },
    () => `Jump speed: ${currentJumpSpeed}`,
    () => `Cached floor ${JSON.stringify(currentFloor)}`,
    () => `Last clicked mouse pos (${Math.round(lastClickedPos.x)}, ${Math.round(lastClickedPos.y)}) (approximate)`,
    () => `Frames since touched wall: ${framesSinceTouchedWall}`,
    () => `Released up at least once: ${releasedUpAtLeastOnce}`,
    () => `Current touching wall?: ${Boolean(currentTouchingWall)}`,
    () => `Frames since landing: ${framesSinceLanded}`,
    () => `Jump level ${currentJumpLevel}`
  ];

  for(let i=0; i<debugTexts.length; i++){
    ctx.fillText(debugTexts[i](), 10, initialPos + (margin * i));
  }
}

function draw(){
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "black";
  for(let i=0; i<floors.length; i++){
    drawLine(floors[i]);
  }

  ctx.strokeStyle = "#ff2233";
  for(let i=0; i<walls.length; i++){
    drawLine(walls[i]);
  }
  drawCharacter();
  drawDebugInfo();
}
function loop(timestamp) {
  let progress = timestamp - lastRender;
  update(progress);
  draw();
  lastRender = timestamp;
  window.requestAnimationFrame(loop);
}
let lastRender = 0;
window.requestAnimationFrame(loop);
