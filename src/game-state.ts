import { InputReader } from './input'
import { Segment } from './segment'
import configRaw from './config.json'
import { Point } from './point'
import { getMovementDirection, evalX, wallBelowFloor, wallDirection, evalY, sgn, convergeToZero, clamp, wallBelowCharacter } from './lib'
import { MovingFloor } from './moving-floor'
import { MovementState } from './movement-state'
import { configSchema } from './config-schema'

const {
  Y_MIN_SPEED,
  CHARACTER_SIZE,
  JUMP_INITIAL_SPEED,
  Y_DECELERATION,
  X_ACCELERATION,
  X_ACCELERATION_MID_AIR,
  MAX_WALKING_SPEED,
  WALLKICK_NECESSARY_SPEED,
  WALLKICK_FRAMES,
  REPEATED_JUMP_FRAMES,
  THIRD_LEVEL_JUMP_SPEED_REQUIRED,
  JUMP_FACTOR_2,
  JUMP_FACTOR_3
} = configSchema.parse(configRaw)

const JUMP_FACTOR = {
  1: 1,
  2: JUMP_FACTOR_2,
  3: JUMP_FACTOR_3
}

export class GameState {
  private _xSpeed: number = 0
  private _ySpeed: number = 0
  private _currentState = MovementState.MidAir
  private currentFloor: Segment | null = null
  private jumpBlocked = false
  private currentTouchingWall: Segment | null = null
  private framesSinceTouchedWall = 0
  private framesSinceLanded = Infinity
  private _currentJumpLevel: (1 | 2 | 3) = 1
  private _character: Point
  private readonly movingFloors: MovingFloor[]

  constructor (private readonly inputState: InputReader, private readonly walls: Segment[], private readonly floors: Segment[], initialPosition: Point) {
    this._character = new Point(initialPosition.x, initialPosition.y)
    this.movingFloors = floors.filter(f => f instanceof MovingFloor) as MovingFloor[]
  }

  get character (): Point {
    return this._character
  }

  get currentState (): MovementState {
    return this._currentState
  }

  get xSpeed (): number {
    return this._xSpeed
  }

  get ySpeed (): number {
    return this._ySpeed
  }

  get currentJumpLevel (): (1 | 2 | 3) {
    return this._currentJumpLevel
  }

  private decelerate (accel: number): void {
    this._xSpeed = convergeToZero(this._xSpeed, accel)
  }

  private accelerate (accel: number): void {
    const dir = (this.inputState.right ? 1 : -1)
    this._xSpeed += dir * accel
    this._xSpeed = clamp(this._xSpeed, -MAX_WALKING_SPEED, MAX_WALKING_SPEED)
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

  private wallCollision (): Segment | null {
    // Avoid glitchy corner cases by skipping walls that are below the current floor or character.
    // These walls still touch the character in some cases, but they shouldn't be detected as colliding.
    const wallCollides = (w: Segment): boolean => {
      if (this.currentFloor !== null && wallBelowFloor(w, this.currentFloor)) return false
      if (wallBelowCharacter(w, this._character)) return false
      return w.intersectsCircle(this._character, CHARACTER_SIZE)
    }

    return this.walls.find(wallCollides) ?? null
  }

  private ySpeedReset (): void {
    this._ySpeed = 0
  }

  private land (floor: Segment): void {
    this._character.y = evalX(floor, this._character.x)
    this._currentState = MovementState.Standing
    this.framesSinceLanded = 0
    this.jumpBlocked = true
    this.currentFloor = floor
    this.ySpeedReset()
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
      this._currentState = MovementState.MidAir
      this.framesSinceTouchedWall = 0
      return
    }

    // This line is necessary. If removed, sometimes the character can glitch through walls
    // when the floor and wall are in certain angles.
    this._character.y = evalX(this.currentFloor, this._character.x)

    this.updateSpeed(X_ACCELERATION)
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

    this._character = this._character.add(mov.scale(this._xSpeed))

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
        if (Math.abs(this._xSpeed) > THIRD_LEVEL_JUMP_SPEED_REQUIRED) {
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

  private initJumpFromStanding (): void {
    if (!this.inputState.up) return
    if (this.jumpBlocked) return

    this.jumpBlocked = true
    this._currentState = MovementState.MidAir
    this.increaseJumpLevel()

    this._ySpeed = JUMP_INITIAL_SPEED * this.getJumpSpeedFactor()
    this.framesSinceTouchedWall = 0
    this.currentFloor = null
  }

  private getJumpSpeedFactor (): number {
    return JUMP_FACTOR[this._currentJumpLevel]
  }

  private hasEnoughSpeedForWallKick (): boolean {
    return Math.abs(this._xSpeed) >= WALLKICK_NECESSARY_SPEED
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
    this._currentState = MovementState.MidAir

    this._ySpeed = JUMP_INITIAL_SPEED
    this.framesSinceTouchedWall = 0
    this._xSpeed *= -1
  }

  private jumpState (): void {
    this._character.x += this._xSpeed
    this._character.y += this._ySpeed
    this._ySpeed -= Y_DECELERATION

    if (this._ySpeed <= 0) {
      this._ySpeed = Math.max(this._ySpeed, Y_MIN_SPEED)

      const floor = this.segmentCollision(this.floors)

      if (floor !== null) {
        this.land(floor)
        return
      }
    }

    this.updateSpeed(X_ACCELERATION_MID_AIR)
    this.checkAndExecuteWallKick()
  }

  private handleWallCollisions (): void {
    this.currentTouchingWall = this.wallCollision()
    const wall = this.currentTouchingWall

    if (wall === null) {
      this.framesSinceTouchedWall = 0
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
    if (wallDirection(wall) === sgn(this._xSpeed)) return

    // Make it lose speed due to being in contact with a wall.
    // If it's standing, then do it immediately.
    // If it's falling/jumping, then only apply it after it's been in contact with the wall for long enough.
    if (this._currentState === MovementState.Standing || this.framesSinceTouchedWall > WALLKICK_FRAMES) {
      this._xSpeed /= 1.5
    }
  }

  private increaseFramesSinceTouchedWall (): void {
    // Increase count, but prevent overflow.
    this.framesSinceTouchedWall = Math.min(this.framesSinceTouchedWall + 1, 1e8)
  }

  private updateCharacter (): void {
    switch (this._currentState) {
      case MovementState.Standing: this.standingState(); break
      case MovementState.MidAir: this.jumpState(); break
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
