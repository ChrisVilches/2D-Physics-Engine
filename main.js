let canvas = document.getElementById("canvas")
let width = canvas.width;
let height = canvas.height;
document.getElementById("canvas-size").innerHTML = `${width} x ${height} (width x height)`;
let ctx = canvas.getContext("2d");

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

const fallingSpeed = 5;
const FALLING = 0;
const STANDING = 1;
const JUMP = 2;
const characterSize = 5;
const jumpSpeed = 10;
const jumpDeacceleration = 0.5;
const horizontalMovementSpeed = 2;
const horizontalMovementSpeedVariationDueToSlope = 0.3;

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

// Not sure if there's a better way to press UP key only once without repeating the event.
// It's not bad, but clutters the code a bit.
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

let currentState = FALLING;
let currentJumpSpeed = 0;

function createPoint(x, y){
  return { x, y };
}

function createLine(point1, point2){
  return { from: point1, to: point2 };
}

let character = createPoint(140, 180);

let floors = [];

floors.push(createLine(createPoint(0, 0), createPoint(100, 100)));
floors.push(createLine(createPoint(100, 100), createPoint(200, 100)));
floors.push(createLine(createPoint(200, 100), createPoint(300, 80)));
floors.push(createLine(createPoint(300, 80), createPoint(500, 30)));
floors.push(createLine(createPoint(500, 30), createPoint(600, 80)));

// Returns line
function characterTouchesFloor(){
  for(let i=0; i<floors.length; i++){
    let floor = floors[i];
    if(doesLineInterceptCircle(floor.from, floor.to, character, characterSize)){
      return floor;
    }
  }
  return null;
}

function updateCharacter(){
  switch(currentState){
  case FALLING:
    character.y -= fallingSpeed;
    let line;
    if((line = characterTouchesFloor()) !== null){
      character = closestPointOnLine(line, character);
      currentState = STANDING;
    }
    break;
  case STANDING:

    if(rightPressed || leftPressed){
      let line;

      // TODO: Reorder code so that 'characterTouchesFloor' is only executed once.
      // This function is computationally expensive (with many floor lines).

      line = characterTouchesFloor();
      console.assert(line !== null); // Shouldn't happen in any known situation.

      let slopeSpeedVariation = speedVariationDueToSlope(line);
      let movementSpeed = (horizontalMovementSpeed * (1 + slopeSpeedVariation));
      character.x += (rightPressed ? 1 : -1) * movementSpeed;

      // Only set Y, because this collision function might not be
      // perfect, and therefore it might make X movement become sloppy.
      if((line = characterTouchesFloor()) !== null){
        character.y = closestPointOnLine(line, character).y;
      } else {
        currentState = FALLING;
        break;
      }
    }
    if(upPressed){
      jump();
    }
    break;
  case JUMP:
    character.y += currentJumpSpeed;
    currentJumpSpeed -= jumpDeacceleration;
    if(currentJumpSpeed <= 0){
      currentJumpSpeed = jumpSpeed;
      currentState = FALLING;
    }
    // Collision with floors should also be handled. Implement it only if it glitches.
    break;
  }
}

// Returns a number to multiply the original speed.
// This number is for example [0.75, 1.25].
// Depending on the final implementation, it could be different though.
//
// Returns number between [1 - α, 1 + α]
// α is defined by 'horizontalMovementSpeedVariationDueToSlope'.
//
// The function that has to be implemented has the following characteristics;
// Domain = Slopes of lines.
// Range = [1 - α, 1 + α].
function speedVariationDueToSlope(line){
  let slope = lineSlope(line);
  let slopeSpeedFactor = Math.abs(slope);

  // Note: Depending on the direction it's going (left or right),
  // a positive/negative slope will make it slow down or speed up.

  if(rightPressed && slope >= 0 || leftPressed && slope <= 0){
    // Goes against slope. Slow it down.
    slopeSpeedFactor *= -1;
  }

  if(slopeSpeedFactor <= -horizontalMovementSpeedVariationDueToSlope) slopeSpeedFactor = -horizontalMovementSpeedVariationDueToSlope;
  if(slopeSpeedFactor >= horizontalMovementSpeedVariationDueToSlope) slopeSpeedFactor = horizontalMovementSpeedVariationDueToSlope;

  // TODO: Put some limit to the speed. Maybe a limit to the down-hill speed
  // would be great, but having a very low up-hill speed would also be great (i.e. no
  // limit to how much it decreases).
  return slopeSpeedFactor;
}

function jump(){
  if(currentState !== STANDING){
    return;
  }
  upPressed = false;
  currentState = JUMP;
  currentJumpSpeed = jumpSpeed;
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
    character.x - (characterSize/2),
    height - character.y - (characterSize/2),
    characterSize,
    characterSize
  );
}

function draw(){
  ctx.clearRect(0, 0, width, height);
  for(let i=0; i<floors.length; i++){
    drawLine(floors[i]);
  }
  drawCharacter();
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
