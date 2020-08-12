let canvas = document.getElementById("canvas")
let width = canvas.width;
let height = canvas.height;
document.getElementById("canvas-size").innerHTML = `${width} x ${height} (width x height)`;
let ctx = canvas.getContext("2d");

// TODO:
// Make floors also directed, so the algorithm becomes simpler.
// Fix collision algorithm to make it directed, that way it becomes computationally cheaper.

///////////////////////////////////
////////// State definitions //////
///////////////////////////////////
const FALLING = 0;
const STANDING = 1;
const JUMP = 2;

///////////////////////////////////
/// Game physics configuration ////
///////////////////////////////////
const FLOOR_CACHE_ENABLED = true;
const FALLING_SPEED = 5;
const CHARACTER_SIZE = 5;
const JUMP_SPEED = 10;
const JUMP_DEACCELERATION = 0.5;
const SPEED_ACCELERATION = 0.1;
const MAX_WALKING_SPEED = 2;
const INITIAL_WALKING_SPEED = 0.1;
const SPEED_ERROR = SPEED_ACCELERATION; // Speeds below this value will be equalled to zero.


///////////////////////////////////
////// Current physics state //////
///////////////////////////////////
let currentSpeed = 0;
let currentState = FALLING;
let currentJumpSpeed = 0;

///////////////////////////////////
////////////// Other //////////////
///////////////////////////////////

// Store the last floor. Used for optimizations. Value is not guaranteed to be correct. It has to be checked first
// if the character is still on this floor (the heuristic is to assume it is, so check this one first before all other floors.)
let cachedFloor = null;

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
// TODO: This is bugged. If you jump and press the jump button right away again, it will jump once again when it falls to the ground.
let upKeyLocked = false;

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function keyDownHandler(e) {
  let keyCode = e.keyCode;
  let dir = KEY_CODES_DIR_MAP[keyCode];
  switch(dir){
  case LEFT_DIR: leftPressed = true; break;
  case RIGHT_DIR: rightPressed = true; break;
  case DOWN_DIR: downPressed = true; break;
  case UP_DIR: if(!upKeyLocked) { upPressed = true; upKeyLocked = true; } break;
  }
}

function keyUpHandler(e) {
  let keyCode = e.keyCode;
  let dir = KEY_CODES_DIR_MAP[keyCode];
  switch(dir){
  case LEFT_DIR: leftPressed = false; break;
  case RIGHT_DIR: rightPressed = false; break;
  case DOWN_DIR: downPressed = false; break;
  case UP_DIR: upPressed = false; upKeyLocked = false; break;
  }
}

function createPoint(x, y){
  return { x, y };
}

function createLine(point1, point2){
  return { from: point1, to: point2 };
}

let character = createPoint(140, 180);

const floors = [];
const walls = [];

floors.push(createLine(createPoint(0, 0), createPoint(100, 100)));
floors.push(createLine(createPoint(100, 100), createPoint(200, 100)));
floors.push(createLine(createPoint(200, 100), createPoint(300, 80)));
floors.push(createLine(createPoint(300, 80), createPoint(500, 30)));
floors.push(createLine(createPoint(500, 30), createPoint(600, 80)));
floors.push(createLine(createPoint(300, 170), createPoint(600, 200)));
floors.push(createLine(createPoint(250, 150), createPoint(450, 0)))

walls.push(createLine(createPoint(100, 100), createPoint(100, 400)));
walls.push(createLine(createPoint(300, 20), createPoint(249, 150)));
walls.push(createLine(createPoint(550, 500), createPoint(500, 20)));
walls.push(createLine(createPoint(200, 400), createPoint(200, 200)));
walls.push(createLine(createPoint(150, 100), createPoint(150, -100)));
floors.push(createLine(createPoint(100, 400), createPoint(200, 400)));
floors.push(createLine(createPoint(250, 200), createPoint(400, 200)));
floors.push(createLine(createPoint(350, 300), createPoint(450, 300)));
floors.push(createLine(createPoint(250, 350), createPoint(400, 350)));

/**
 * This method is used for all collisions against walls and floors.
 * TODO: It can be optimized so that floors are directed (i.e. have a normal, and the collision is only checked
 * in that direction), just like walls (already implemented).
 * @param {Line array} lines Array of lines to check against.
 * @return {Line} The line (from the array) the character is touching, or null if it's not touching any line.
 */
function characterTouchesLine(lines){
  for(let i=0; i<lines.length; i++){
    let line = lines[i];
    if(doesLineInterceptCircle(line.from, line.to, character, CHARACTER_SIZE)){
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

function fallingStatus(){
  if((line = characterTouchesLine(floors)) !== null){
    // This is to align the character with the floor's Y component.
    // Without this line, if the character is constantly jumping on a slope, the detection would
    // detect a point with a X component different to the character's X, and it would constantly be moving
    // up or down hill as he keeps jumps (not necessarily a bug).
    character.y = getYFromX(line, character.x);
    currentState = STANDING;
    return;
  }

  character.x += currentSpeed;
  character.y -= FALLING_SPEED;

  updateSpeed(SPEED_ACCELERATION);
}

function standingStatus(){
  let line;
  if(FLOOR_CACHE_ENABLED && cachedFloor !== null && characterTouchesLine([cachedFloor])){
    line = cachedFloor;
  } else {
    line = characterTouchesLine(floors);
    cachedFloor = line;
  }
  if(line === null){
    currentState = FALLING;
    return;
  }

  character = closestPointOnLine(line, character);

  updateSpeed(SPEED_ACCELERATION);

  let movVector = getMovementDirection(line);

  character.x += currentSpeed * movVector.x;
  character.y += currentSpeed * movVector.y;

  // Initiate jump
  if(upPressed){
    if(currentState !== STANDING){
      return;
    }
    upPressed = false;
    currentState = JUMP;
    currentJumpSpeed = JUMP_SPEED;
  }
}

function jumpStatus(){
  character.x += currentSpeed;
  character.y += currentJumpSpeed;
  currentJumpSpeed -= JUMP_DEACCELERATION;
  if(currentJumpSpeed <= 0){
    currentJumpSpeed = JUMP_SPEED;
    currentState = FALLING;
  }
  updateSpeed(SPEED_ACCELERATION / 2);
}

/**
 * This is executed on every frame, despite the current status.
 */
function handleWallCollisions(){
  if((line = characterTouchesLine(walls)) !== null){
    // Is current floor below? If it's below, then don't consider collision.
    if(cachedFloor !== null && line1BelowLine2(line, cachedFloor)){
      return;
    }

    let yPercent = (character.y - line.from.y) / (line.to.y - line.from.y);
    let x = line.from.x -  ((line.from.x - line.to.x) * yPercent);
    character.x = x + wallDirection(line) * CHARACTER_SIZE;
  }
}

function updateCharacter(){
  switch(currentState){
  case FALLING:  fallingStatus();  break;
  case STANDING: standingStatus(); break;
  case JUMP:     jumpStatus();     break;
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
  let movementDirection = lineToVector(normalizeLine(line));
    
  // But the horizontal speed is determined by the key pressed, so
  // we only care about how the vertical speed changes due to the slope.
  movementDirection.x = Math.abs(movementDirection.x);
  return movementDirection;
}

function update(progress){
  updateCharacter();
}

function drawLine(line){
  ctx.beginPath();
  ctx.moveTo(line.from.x, height - line.from.y);
  ctx.lineTo(line.to.x, height - line.to.y);
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
  let margin = 30;
  let initialPos = 50;
  ctx.fillStyle = "black";
  ctx.font = "15px Verdana";

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
    () => `Cached floor ${JSON.stringify(cachedFloor)}`
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
