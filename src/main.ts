import { getMovementDirection, getYFromX, wallBelowFloor, wallDirection } from './lib'
import { MovingFloor } from './moving-floor'
import { Point } from './point'
import { Segment } from './segment'
import {
  FALLING_SPEED,
  CHARACTER_SIZE,
  JUMP_SPEED,
  JUMP_DEACCELERATION,
  SPEED_ACCELERATION,
  MAX_WALKING_SPEED,
  INITIAL_WALKING_SPEED,
  WALLKICK_FRAMES,
  REPEATED_JUMP_FRAMES,
  SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP,
  FRAMES_SINCE_TOUCHED_WALL_MAX
}
  from './config.json'
import './style.css'
import { readMap } from './map-reader'
import { InputPressedState, listenInput } from './input'

const appContainer = document.querySelector('#app') as HTMLDivElement

appContainer.innerHTML = `
  <canvas id="canvas" style="border: 1px solid black;" width=800 height=600></canvas>
  <div id="canvas-size"></div>
  <div id="debug-info"></div>
`

// Warning: Extremely ugly and non-refactored code.
//          Still quite legible though, because most lines of code don't depend
//          or interact with each other, so a function can be long, and still not
//          be bug-prone (still needs refactor).

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const width = canvas.width
const height = canvas.height
const canvasSizeContainer = document.getElementById('canvas-size') as HTMLDivElement
const debugInfoContainer = document.getElementById('debug-info') as HTMLDivElement
canvasSizeContainer.innerHTML = `${width} x ${height} (width x height)`
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

// TODO:
// Make floors also directed, so the algorithm becomes simpler.
// Fix collision algorithm to make it directed, that way it becomes computationally cheaper.
//
// TODO: Structure code using object-oriented programming.

/// ////////////////////////////////
/// /////// State definitions //////
/// ////////////////////////////////
enum MovementState {
  Falling, Standing, Jumping
}

/// ///////////////////////////////////
/// Current physics and game state ///
/// ///////////////////////////////////

const mapData = readMap()
let { character } = mapData
const { floors, walls } = mapData
let currentSpeed = 0
let currentState = MovementState.Falling
let currentJumpSpeed = 0

// Used to store the last touched floor instead of getting it again.
let currentFloor: Segment | null = null

// After landing, the user needs to release the UP key at least once.
// This flag will be activated, and be used to initiate jumps. It's set to false
// after the jump has started. Only used in standing state.
let releasedUpAtLeastOnce = false

let currentTouchingWall: Segment | null = null

let framesSinceTouchedWall = 0

let framesSinceLanded = Infinity

let currentJumpLevel = 1

const inputState: InputPressedState = {
  right: false,
  left: false,
  up: false
}

listenInput(inputState)

const movingFloors: MovingFloor[] = floors.filter(f => f instanceof MovingFloor) as MovingFloor[]

function floorCollision (floors: Segment[]): Segment | null {
  return floors.find(f => f.intersectsCircle(character, CHARACTER_SIZE)) ?? null
}

function updateSpeed (accel: number): void {
  if (inputState.right || inputState.left) {
    // Increase speed in the direction of the right/left button.
    const dir = (inputState.right ? 1 : -1)
    if (currentSpeed === 0) {
      currentSpeed = dir * INITIAL_WALKING_SPEED
    } else {
      currentSpeed += dir * accel
      if (Math.abs(currentSpeed) >= MAX_WALKING_SPEED) {
        currentSpeed = dir * MAX_WALKING_SPEED
      }
    }
  } else {
    // If the right/left buttons aren't pressed, then begin to decrease the speed.
    // If it's inside the error range, then set it to zero and finish.
    if (Math.abs(currentSpeed) < SPEED_ACCELERATION) {
      currentSpeed = 0
      return
    }
    // Get the direction of where it was going before stopping and
    // decrease so it becomes closer to zero.
    const dir = currentSpeed > 0 ? 1 : -1
    currentSpeed -= dir * accel
  }
}

function fallingState (): void {
  // TODO: Does it make any difference to put this code before or after the floor collision detection?
  // There is a bug where when the game starts in the falling state, and in the floor there's a wall
  // directly below the first floor, the currentFloor will be null (because of the order of execution
  // in this code), and the wall below won't be ignored, and the character will glitch (i.e. be pushed
  // by the wall), even though there is a code that ignores walls that are below.
  // However, this only happens for the first floor collision, and only in the rare case where there is a
  // wall directly below, so it's extremely rare anyways. Remove this code if there's no sign
  // this order of execution (i.e. change X, Y position first, and then detect collisions) will have
  // any impact. Remember: if the glitch doesn't happen regularly, then don't fix it.
  character = character.add(new Point(currentSpeed, -FALLING_SPEED))

  const line = floorCollision(floors)
  if (line !== null) {
    // This is to align the character with the floor's Y component.
    // Without this line, if the character is constantly jumping on a slope, the detection would
    // detect a point with a X component different to the character's X, and it would constantly be moving
    // up or down hill as he keeps jumps (not necessarily a bug).
    // TODO: Ok but not sure why this happens. I hope I can remove this since it's
    //       kinda sketchy.
    character.y = getYFromX(line, character.x)

    // This code is executed when just landed. Maybe refactor into a separate method to know where
    // to add landing logic.
    currentState = MovementState.Standing
    framesSinceLanded = 0

    // Reset this flag when entering standing state.
    // If we remove this line, then the standing state would inherit this flag's value
    // from previous states, meaning that it could be any value.
    // More concretely, the bug that happens if we remove this line, is this:
    // 1. Make the character fall.
    // 2. While falling press jump button without releasing it (it was not pressed before).
    // 3. When it lands, it will jump again (probably because the flag is set to true).
    releasedUpAtLeastOnce = false

    currentFloor = line
    return
  }

  updateSpeed(SPEED_ACCELERATION)
  checkAndExecuteWallKick()
}

function standingState (): void {
  let line

  if (!inputState.up) {
    releasedUpAtLeastOnce = true
  }

  // First, check if it's still standing in the latest floor registered as 'current floor'.
  // The heuristic is to assume it's still standing in the same floor. If it's not, then check
  // all other floors.
  if (currentFloor !== null && (floorCollision([currentFloor]) !== null)) {
    line = currentFloor
  } else {
    line = floorCollision(floors)
    currentFloor = line
  }
  if (line === null) {
    currentState = MovementState.Falling
    framesSinceTouchedWall = 0
    return
  }

  // This line is necessary. If removed, sometimes the character can glitch through walls
  // when the floor and wall are in certain angles.
  // TODO: Analyze why? It happens when there's a wall touching two floors (all three
  //       elements pass through the same point. The character glitches through this point.)
  // character = closestPointOnLine(line, character);
  // // TODO: With the new one, it doesn't fall from moving floors.
  character = line.ADHOC_closestPoint(character)

  updateSpeed(SPEED_ACCELERATION)

  // TODO: Try to remove so many constants? (low priority)
  if (framesSinceLanded < REPEATED_JUMP_FRAMES) {
    framesSinceLanded++
  }

  const mov = getMovementDirection(line)

  character = character.add(mov.scale(currentSpeed))

  // TODO: Rename this "line"
  if (line instanceof MovingFloor) {
    character = character.add(line.currentVelocity)
  }

  // Initiate jump
  if (inputState.up && releasedUpAtLeastOnce) {
    releasedUpAtLeastOnce = false
    currentState = MovementState.Jumping

    if (framesSinceLanded < REPEATED_JUMP_FRAMES) {
      if (currentJumpLevel === 2) {
        if (Math.abs(currentSpeed) > SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP) {
          currentJumpLevel++
        } else {
          currentJumpLevel = 1
        }
      } else {
        currentJumpLevel++
      }

      // It means it cannot go up anymore. The next time it jumps it will be a level 1.
      if (currentJumpLevel > 3) { currentJumpLevel = 1 }
    }

    // This is to make jumps lower or higher depending
    // on the jump level (1, 2 or 3), however it seems it doesn't work.
    let jumpSpeedFactor = 0.6
    switch (currentJumpLevel) {
      case 1:
        // Defined above.
        // TODO: Refactor this.
        break
      case 2:
        jumpSpeedFactor = 0.8
        break
      case 3:
        jumpSpeedFactor = 1
        break
    }

    // TODO: Try affecting the falling speed or deacceleration (or whatever) instead.
    currentJumpSpeed = JUMP_SPEED * jumpSpeedFactor
    framesSinceTouchedWall = 0
  }

  if (framesSinceLanded >= REPEATED_JUMP_FRAMES) {
    currentJumpLevel = 1
  }
}

function checkAndExecuteWallKick (): void {
  if (!inputState.up) {
    releasedUpAtLeastOnce = true
  }

  // TODO: Missing check. Implement bonking and "losing the oportunity to wallkick, even
  //       if it gains speed while falling, and touches another wall."

  // TODO: This number should be higher, but with a higher number it's very difficult to wallkick.
  //       Something else also needs to be fixed, it seems.
  const speedEnough = Math.abs(currentSpeed) > 0

  // NOTE: The number is the frame window that allows to wallkick.
  if (speedEnough && (currentTouchingWall != null) && releasedUpAtLeastOnce && framesSinceTouchedWall < WALLKICK_FRAMES) {
    if (inputState.up) {
      // Copied from standing state. Refactor.
      releasedUpAtLeastOnce = false
      currentState = MovementState.Jumping
      currentJumpSpeed = JUMP_SPEED
      framesSinceTouchedWall = 0
      currentSpeed *= -1
    }
  }
}

function jumpState (): void {
  character.x += currentSpeed
  character.y += currentJumpSpeed
  currentJumpSpeed -= JUMP_DEACCELERATION
  if (currentJumpSpeed <= 0) {
    currentJumpSpeed = JUMP_SPEED
    currentState = MovementState.Falling
  }
  updateSpeed(SPEED_ACCELERATION / 2)
  checkAndExecuteWallKick()
}

function handleWallCollisions (): void {
  currentTouchingWall = floorCollision(walls)
  const wall = currentTouchingWall

  if (wall === null) {
    framesSinceTouchedWall = 0
    return
  }

  // Is current floor below? If it's below, then don't consider collision.
  // I think this is to avoid detecting collisions when there's a wall or something
  // immediately below the floor (like in a corner, in which case there shouldn't
  // be a collision detected.)
  if (currentFloor !== null && wallBelowFloor(wall, currentFloor)) {
    return
  }

  const yPercent = (character.y - wall.p.y) / (wall.q.y - wall.p.y)
  const x = wall.p.x - ((wall.p.x - wall.q.x) * yPercent)
  character.x = x + wallDirection(wall) * CHARACTER_SIZE

  // Make it lose speed if it has touched a wall (falling or standing).
  // If the number is too large, it prevents wallkicks from gaining speed.
  // But if we only decrease speed AFTER the wallkick frame window, then it
  // probably doesn't impact it, and we can keep both effects (wallkicking with
  // speed, and also making it lose speed if it touches the wall for too long)
  if (FRAMES_SINCE_TOUCHED_WALL_MAX > WALLKICK_FRAMES) {
    currentSpeed /= 1.2
  }

  // Start counting how many frames have passed since it first touched a wall.
  if (framesSinceTouchedWall < FRAMES_SINCE_TOUCHED_WALL_MAX) {
    framesSinceTouchedWall++
  }
}

function updateCharacter (): void {
  switch (currentState) {
    case MovementState.Falling: fallingState(); break
    case MovementState.Standing: standingState(); break
    case MovementState.Jumping: jumpState(); break
  }
  handleWallCollisions()
}

function update (): void {
  updateCharacter()
  movingFloors.forEach(f => {
    f.update()
  })
}

function drawSegment (s: Segment): void {
  ctx.beginPath()
  ctx.moveTo(s.p.x, height - s.p.y)
  ctx.lineTo(s.q.x, height - s.q.y)
  ctx.stroke()
}

function drawCharacter (): void {
  ctx.fillStyle = 'red'
  ctx.fillRect(
    character.x - (CHARACTER_SIZE / 2),
    height - character.y - (CHARACTER_SIZE / 2),
    CHARACTER_SIZE,
    CHARACTER_SIZE
  )
}

function drawDebugInfo (): void {
  ctx.fillStyle = 'black'
  ctx.font = '14px Arial'

  const formatCurrentState = (): string => {
    switch (currentState) {
      case MovementState.Jumping: return 'Jump'
      case MovementState.Standing: return 'Standing'
      case MovementState.Falling: return 'Falling'
    }
    return 'None'
  }

  const formatPoint = ({ x, y }: Point): string => `(${Math.round(x)}, ${Math.round(y)})`
  const formatSegment = ({ p, q }: Segment): string => `${formatPoint(p)} --> ${formatPoint(q)}`

  const debugTexts: string[] = [
    `Jump level ${currentJumpLevel}`,
    `Speed: ${currentSpeed.toFixed(4)}`,
    `Jump speed: ${currentJumpSpeed.toFixed(4)}`,
    formatCurrentState(),
    `Cached floor ${currentFloor === null ? 'None' : formatSegment(currentFloor)}`,
    `Frames since touched wall: ${framesSinceTouchedWall}`,
    `Released up at least once: ${releasedUpAtLeastOnce ? 'Yes' : 'No'}`,
    `Current touching wall?: ${(currentTouchingWall !== null) ? 'Yes' : 'No'}`,
    `Frames since landing: ${framesSinceLanded}`
  ]

  const text = debugTexts.map(t => `<p>${t}</p>`).join('')
  debugInfoContainer.innerHTML = text
}

function draw (): void {
  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = 'black'
  for (let i = 0; i < floors.length; i++) {
    drawSegment(floors[i])
  }

  ctx.strokeStyle = '#ff2233'
  for (let i = 0; i < walls.length; i++) {
    drawSegment(walls[i])
  }
  drawCharacter()
  drawDebugInfo()
}

function loop (timestamp: number): void {
  const progress = timestamp - lastRender
  update()
  draw()
  lastRender = timestamp
  window.requestAnimationFrame(loop)
}

let lastRender = 0

window.requestAnimationFrame(loop)
