import { InputReader } from './input'
import { Segment } from './segment'
import {
  FALLING_SPEED,
  CHARACTER_SIZE,
  JUMP_SPEED,
  JUMP_DEACCELERATION,
  SPEED_ACCELERATION,
  MAX_WALKING_SPEED,
  WALLKICK_NECESSARY_SPEED,
  WALLKICK_FRAMES,
  REPEATED_JUMP_FRAMES,
  SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP,
  JUMP_FACTOR_1,
  JUMP_FACTOR_2,
  JUMP_FACTOR_3
}
  from './config.json'
import { Point } from './point'
import { getMovementDirection, evalX, wallBelowFloor, wallDirection, evalY, EPS, sgn } from './lib'
import { MovingFloor } from './moving-floor'
import { MovementState } from './movement-state'

const JUMP_FACTOR = {
  1: JUMP_FACTOR_1,
  2: JUMP_FACTOR_2,
  3: JUMP_FACTOR_3
}

// TODO: Maybe the "falling" state can be removed, and just use "jumping", and model the
//       speed changes using differential equations (kinematic, acceleration, etc).

// TODO: Some properties should have a getter as well, like floors, etc.
//       In other words, don't keep public stuff here.

export class GameState {
  private _currentSpeed: number = 0
  private _currentState = MovementState.Falling
  private _currentJumpSpeed: number = 0

  // Used to store the last touched floor instead of getting it again.
  private currentFloor: Segment | null = null

  private jumpBlocked = false

  private currentTouchingWall: Segment | null = null

  private framesSinceTouchedWall = 0

  private framesSinceLanded = Infinity

  private _currentJumpLevel: (1 | 2 | 3) = 1

  private _character: Point

  private readonly movingFloors: MovingFloor[]

  constructor (private readonly inputState: InputReader, readonly walls: Segment[], readonly floors: Segment[], readonly initialPosition: Point) {
    this._character = new Point(initialPosition.x, initialPosition.y)
    this.movingFloors = floors.filter(f => f instanceof MovingFloor) as MovingFloor[]
  }

  get character (): Point {
    return this._character
  }

  get currentState (): MovementState {
    return this._currentState
  }

  get currentSpeed (): number {
    return this._currentSpeed
  }

  get currentJumpSpeed (): number {
    return this._currentJumpSpeed
  }

  get currentJumpLevel (): (1 | 2 | 3) {
    return this._currentJumpLevel
  }

  private decelerate (accel: number): void {
    if (Math.abs(this._currentSpeed) < EPS) {
      this._currentSpeed = 0
      return
    }

    const dir = this._currentSpeed > 0 ? 1 : -1
    this._currentSpeed -= dir * accel
  }

  private accelerate (accel: number): void {
    const dir = (this.inputState.right ? 1 : -1)
    this._currentSpeed += dir * accel
    if (this._currentSpeed <= -MAX_WALKING_SPEED) this._currentSpeed = -MAX_WALKING_SPEED
    if (this._currentSpeed >= MAX_WALKING_SPEED) this._currentSpeed = MAX_WALKING_SPEED
  }

  private updateSpeed (accel: number): void {
    if (!this.inputState.right && !this.inputState.left) {
      this.decelerate(accel)
    } else {
      this.accelerate(accel)
    }
  }

  private segmentCollision (segments: Segment[]): Segment | null {
    return segments.find(f => f.intersectsCircle(this._character, CHARACTER_SIZE)) ?? null
  }

  private land (floor: Segment): void {
    this._character.y = evalX(floor, this._character.x)
    this._currentState = MovementState.Standing
    this.framesSinceLanded = 0
    this.jumpBlocked = true
    this.currentFloor = floor
  }

  private fallingState (): void {
    this._character.x += this._currentSpeed
    this._character.y -= FALLING_SPEED

    const floor = this.segmentCollision(this.floors)

    if (floor === null) {
      this.updateSpeed(SPEED_ACCELERATION)
      this.checkAndExecuteWallKick()
    } else {
      this.land(floor)
    }
  }

  private recalculateCurrentFloor (): Segment | null {
    if (this.currentFloor !== null && this.segmentCollision([this.currentFloor]) !== null) {
      return this.currentFloor
    }

    this.currentFloor = this.segmentCollision(this.floors)
    return this.currentFloor
  }

  private standingState (): void {
    if (!this.inputState.up) {
      this.jumpBlocked = false
    }

    this.recalculateCurrentFloor()

    if (this.currentFloor === null) {
      this._currentState = MovementState.Falling
      this.framesSinceTouchedWall = 0
      return
    }

    // This line is necessary. If removed, sometimes the character can glitch through walls
    // when the floor and wall are in certain angles.
    this._character.y = evalX(this.currentFloor, this._character.x)

    this.updateSpeed(SPEED_ACCELERATION)
    this.increaseFramesSinceLanded()
    this.standingMove()
    this.initJumpFromStanding()
  }

  private increaseFramesSinceLanded (): void {
    // Increase count, but prevent overflow.
    this.framesSinceLanded = Math.min(this.framesSinceLanded + 1, 1e8)
    if (this.framesSinceLanded >= REPEATED_JUMP_FRAMES) {
      this._currentJumpLevel = 1
    }
  }

  private standingMove (): void {
    if (this.currentFloor === null) return

    const mov = getMovementDirection(this.currentFloor)

    this._character = this._character.add(mov.scale(this._currentSpeed))

    if (this.currentFloor instanceof MovingFloor) {
      this._character = this._character.add(this.currentFloor.currentVelocity)
    }
  }

  private increaseJumpLevel (): void {
    if (this.framesSinceLanded >= REPEATED_JUMP_FRAMES) return

    switch (this._currentJumpLevel) {
      case 1:
        this._currentJumpLevel++
        break
      case 2:
        if (Math.abs(this._currentSpeed) > SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP) {
          this._currentJumpLevel++
        } else {
          this._currentJumpLevel = 1
        }
        break
      case 3:
        this._currentJumpLevel = 1
        break
    }
  }

  // TODO: It'd be nice to have a state machine like what they do in Rust, where
  //       the object can have different types (in this case, standing, falling, jumping, etc are
  //       different types) and those types have different methods, and you can only call the ones
  //       where it makes sense to do so. In this case I have to make sure the method is called from
  //       "standing" state (by indicating it in the method name) but this is suboptimal.
  private initJumpFromStanding (): void {
    if (!this.inputState.up) return
    if (this.jumpBlocked) return

    this.jumpBlocked = true
    this._currentState = MovementState.Jumping
    this.increaseJumpLevel()

    // TODO: This is to make jumps lower or higher depending
    // on the jump level (1, 2 or 3), however it seems it doesn't work.
    // UPDATE: I don't remember what I was talking about here. Consider removing this todo.

    // TODO: Try affecting the falling speed or deacceleration (or whatever) instead.
    //       UPDATE: I don't understand what this todo was supposed to mean.
    this._currentJumpSpeed = JUMP_SPEED * this.getJumpSpeedFactor()
    this.framesSinceTouchedWall = 0
  }

  private getJumpSpeedFactor (): number {
    return JUMP_FACTOR[this._currentJumpLevel]
  }

  private hasEnoughSpeedForWallKick (): boolean {
    return Math.abs(this._currentSpeed) >= WALLKICK_NECESSARY_SPEED
  }

  private checkAndExecuteWallKick (): void {
    if (!this.inputState.up) {
      this.jumpBlocked = false
    }

    // TODO: Missing logic:
    //       * Bonking into walls.
    //       * Restrict the situations in which wallkicking is possible (it should
    //         not always be possible, and should require a more precise timing).
    //         e.g. prevent wallkicking the same wall consecutively.

    if (!this.hasEnoughSpeedForWallKick()) return
    if (this.currentTouchingWall === null) return
    if (this.jumpBlocked) return
    if (!this.inputState.up) return
    if (this.framesSinceTouchedWall >= WALLKICK_FRAMES) return

    this.jumpBlocked = true
    this._currentJumpLevel = 1
    this._currentState = MovementState.Jumping
    this._currentJumpSpeed = JUMP_SPEED
    this.framesSinceTouchedWall = 0
    this._currentSpeed *= -1
  }

  private jumpState (): void {
    this._character.x += this._currentSpeed
    this._character.y += this._currentJumpSpeed
    this._currentJumpSpeed -= JUMP_DEACCELERATION
    if (this._currentJumpSpeed <= 0) {
      this._currentJumpSpeed = JUMP_SPEED
      this._currentState = MovementState.Falling
    }
    this.updateSpeed(SPEED_ACCELERATION / 2)
    this.checkAndExecuteWallKick()
  }

  private handleWallCollisions (): void {
    this.currentTouchingWall = this.segmentCollision(this.walls)
    const wall = this.currentTouchingWall

    if (wall === null) {
      this.framesSinceTouchedWall = 0
      return
    }

    // TODO: Make this explanation simpler to understand.
    // Is current floor below? If it's below, then don't consider collision.
    // I think this is to avoid detecting collisions when there's a wall or something
    // immediately below the floor (like in a corner, in which case there shouldn't
    // be a collision detected.)
    if (this.currentFloor !== null && wallBelowFloor(wall, this.currentFloor)) {
      return
    }

    this.applyWallHorizontalReaction(wall)
    this.applyWallSpeedDecrease(wall)
    this.increaseFramesSinceTouchedWall()
  }

  private applyWallHorizontalReaction (wall: Segment): void {
    this._character.x = evalY(wall, this._character.y) + wallDirection(wall) * CHARACTER_SIZE
  }

  private applyWallSpeedDecrease (wall: Segment): void {
    // Skip if the movement is away from the wall.
    if (wallDirection(wall) === sgn(this._currentSpeed)) return

    // Make it lose speed due to being in contact with a wall.
    // If it's standing, then do it immediately.
    // If it's falling/jumping, then only apply it after it's been in contact with the wall for long enough.
    if (this._currentState === MovementState.Standing || this.framesSinceTouchedWall > WALLKICK_FRAMES) {
      this._currentSpeed /= 1.5
    }
  }

  private increaseFramesSinceTouchedWall (): void {
    // Increase count, but prevent overflow.
    this.framesSinceTouchedWall = Math.min(this.framesSinceTouchedWall + 1, 1e8)
  }

  private updateCharacter (): void {
    switch (this._currentState) {
      case MovementState.Falling: this.fallingState(); break
      case MovementState.Standing: this.standingState(); break
      case MovementState.Jumping: this.jumpState(); break
    }
    this.handleWallCollisions()
  }

  update (): void {
    this.updateCharacter()
    this.movingFloors.forEach(f => {
      f.update()
    })
  }
}
