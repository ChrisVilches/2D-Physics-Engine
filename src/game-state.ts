import { InputReader } from './input'
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
  FRAMES_SINCE_TOUCHED_WALL_MAX,
  JUMP_FACTOR_1,
  JUMP_FACTOR_2,
  JUMP_FACTOR_3
}
  from './config.json'
import { Point } from './point'
import { closestPointProjection, getMovementDirection, evalX, wallBelowFloor, wallDirection } from './lib'
import { MovingFloor } from './moving-floor'

export enum MovementState {
  Falling, Standing, Jumping
}

const JUMP_FACTOR = {
  1: JUMP_FACTOR_1,
  2: JUMP_FACTOR_2,
  3: JUMP_FACTOR_3
}

export class GameState {
  private currentSpeed: number = 0
  private currentState = MovementState.Falling
  private currentJumpSpeed: number = 0

  // Used to store the last touched floor instead of getting it again.
  private currentFloor: Segment | null = null

  // After landing, the user needs to release the UP key at least once.
  // This flag will be activated, and be used to initiate jumps. It's set to false
  // after the jump has started. Only used in standing state.
  private releasedUpAtLeastOnce = false

  private currentTouchingWall: Segment | null = null

  private framesSinceTouchedWall = 0

  private framesSinceLanded = Infinity

  private currentJumpLevel: (1 | 2 | 3) = 1

  private _character: Point

  private readonly movingFloors: MovingFloor[]

  constructor (private readonly inputState: InputReader, readonly walls: Segment[], readonly floors: Segment[], readonly initialPosition: Point) {
    this._character = new Point(initialPosition.x, initialPosition.y)
    this.movingFloors = floors.filter(f => f instanceof MovingFloor) as MovingFloor[]
  }

  get character (): Point {
    return this._character
  }

  private updateSpeed (accel: number): void {
    if (this.inputState.right || this.inputState.left) {
      // Increase speed in the direction of the right/left button.
      const dir = (this.inputState.right ? 1 : -1)
      if (this.currentSpeed === 0) {
        this.currentSpeed = dir * INITIAL_WALKING_SPEED
      } else {
        this.currentSpeed += dir * accel
        if (Math.abs(this.currentSpeed) >= MAX_WALKING_SPEED) {
          this.currentSpeed = dir * MAX_WALKING_SPEED
        }
      }
    } else {
      // If the right/left buttons aren't pressed, then begin to decrease the speed.
      // If it's inside the error range, then set it to zero and finish.
      if (Math.abs(this.currentSpeed) < SPEED_ACCELERATION) {
        this.currentSpeed = 0
        return
      }
      // Get the direction of where it was going before stopping and
      // decrease so it becomes closer to zero.
      const dir = this.currentSpeed > 0 ? 1 : -1
      this.currentSpeed -= dir * accel
    }
  }

  private segmentCollision (segments: Segment[]): Segment | null {
    return segments.find(f => f.intersectsCircle(this._character, CHARACTER_SIZE)) ?? null
  }

  private fallingState (): void {
    // TODO: Does it make any difference to put this code before or after the floor collision detection?
    // There is a bug where when the game starts in the falling state, and in the floor there's a wall
    // directly below the first floor, the currentFloor will be null (because of the order of execution
    // in this code), and the wall below won't be ignored, and the character will glitch (i.e. be pushed
    // by the wall), even though there is a code that ignores walls that are below.
    // However, this only happens for the first floor collision, and only in the rare case where there is a
    // wall directly below, so it's extremely rare anyways. Remove this code if there's no sign
    // this order of execution (i.e. change X, Y position first, and then detect collisions) will have
    // any impact. Remember: if the glitch doesn't happen regularly, then don't fix it.
    this._character = this._character.add(new Point(this.currentSpeed, -FALLING_SPEED))

    const line = this.segmentCollision(this.floors)
    if (line !== null) {
      // This is to align the character with the floor's Y component.
      // Without this line, if the character is constantly jumping on a slope, the detection would
      // detect a point with a X component different to the character's X, and it would constantly be moving
      // up or down hill as he keeps jumps (not necessarily a bug).
      // TODO: Ok but not sure why this happens. I hope I can remove this since it's
      //       kinda sketchy.
      this._character.y = evalX(line, this._character.x)

      // This code is executed when just landed. Maybe refactor into a separate method to know where
      // to add landing logic.
      this.currentState = MovementState.Standing
      this.framesSinceLanded = 0

      // Reset this flag when entering standing state.
      // If we remove this line, then the standing state would inherit this flag's value
      // from previous states, meaning that it could be any value.
      // More concretely, the bug that happens if we remove this line, is this:
      // 1. Make the character fall.
      // 2. While falling press jump button without releasing it (it was not pressed before).
      // 3. When it lands, it will jump again (probably because the flag is set to true).
      this.releasedUpAtLeastOnce = false

      this.currentFloor = line
      return
    }

    this.updateSpeed(SPEED_ACCELERATION)
    this.checkAndExecuteWallKick()
  }

  private standingState (): void {
    let floor

    if (!this.inputState.up) {
      this.releasedUpAtLeastOnce = true
    }

    // First, check if it's still standing in the latest floor registered as 'current floor'.
    // The heuristic is to assume it's still standing in the same floor. If it's not, then check
    // all other floors.
    if (this.currentFloor !== null && (this.segmentCollision([this.currentFloor]) !== null)) {
      floor = this.currentFloor
    } else {
      floor = this.segmentCollision(this.floors)
      this.currentFloor = floor
    }
    if (floor === null) {
      this.currentState = MovementState.Falling
      this.framesSinceTouchedWall = 0
      return
    }

    // This line is necessary. If removed, sometimes the character can glitch through walls
    // when the floor and wall are in certain angles.
    // TODO: Analyze why? It happens when there's a wall touching two floors (all three
    //       elements pass through the same point. The character glitches through this point.)
    this._character = closestPointProjection(floor, this._character)

    this.updateSpeed(SPEED_ACCELERATION)

    if (this.framesSinceLanded < REPEATED_JUMP_FRAMES) {
      this.framesSinceLanded++
    }

    const mov = getMovementDirection(floor)

    this._character = this._character.add(mov.scale(this.currentSpeed))

    if (floor instanceof MovingFloor) {
      this._character = this._character.add(floor.currentVelocity)
    }

    // Initiate jump
    if (this.inputState.up && this.releasedUpAtLeastOnce) {
      this.releasedUpAtLeastOnce = false
      this.currentState = MovementState.Jumping

      if (this.framesSinceLanded < REPEATED_JUMP_FRAMES) {
        if (this.currentJumpLevel === 2) {
          if (Math.abs(this.currentSpeed) > SPEED_REQUIRED_FOR_THIRD_LEVEL_JUMP) {
            this.currentJumpLevel++
          } else {
            this.currentJumpLevel = 1
          }
        } else {
          this.currentJumpLevel++
        }

        // It means it cannot go up anymore. The next time it jumps it will be a level 1.
        if (this.currentJumpLevel > 3) { this.currentJumpLevel = 1 }
      }

      // This is to make jumps lower or higher depending
      // on the jump level (1, 2 or 3), however it seems it doesn't work.

      // TODO: Try affecting the falling speed or deacceleration (or whatever) instead.
      this.currentJumpSpeed = JUMP_SPEED * this.getJumpSpeedFactor()
      this.framesSinceTouchedWall = 0
    }

    if (this.framesSinceLanded >= REPEATED_JUMP_FRAMES) {
      this.currentJumpLevel = 1
    }
  }

  private getJumpSpeedFactor (): number {
    return JUMP_FACTOR[this.currentJumpLevel]
  }

  private checkAndExecuteWallKick (): void {
    if (!this.inputState.up) {
      this.releasedUpAtLeastOnce = true
    }

    // TODO: Missing check. Implement bonking and "losing the oportunity to wallkick, even
    //       if it gains speed while falling, and touches another wall."

    // TODO: This number should be higher, but with a higher number it's very difficult to wallkick.
    //       Something else also needs to be fixed, it seems.
    const speedEnough = Math.abs(this.currentSpeed) > 0

    // NOTE: The number is the frame window that allows to wallkick.
    if (speedEnough && this.currentTouchingWall !== null && this.releasedUpAtLeastOnce && this.framesSinceTouchedWall < WALLKICK_FRAMES) {
      if (this.inputState.up) {
        // Copied from standing state. Refactor.
        this.releasedUpAtLeastOnce = false
        this.currentState = MovementState.Jumping
        this.currentJumpSpeed = JUMP_SPEED
        this.framesSinceTouchedWall = 0
        this.currentSpeed *= -1
      }
    }
  }

  private jumpState (): void {
    this._character.x += this.currentSpeed
    this._character.y += this.currentJumpSpeed
    this.currentJumpSpeed -= JUMP_DEACCELERATION
    if (this.currentJumpSpeed <= 0) {
      this.currentJumpSpeed = JUMP_SPEED
      this.currentState = MovementState.Falling
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

    // Is current floor below? If it's below, then don't consider collision.
    // I think this is to avoid detecting collisions when there's a wall or something
    // immediately below the floor (like in a corner, in which case there shouldn't
    // be a collision detected.)
    if (this.currentFloor !== null && wallBelowFloor(wall, this.currentFloor)) {
      return
    }

    const yPercent = (this._character.y - wall.p.y) / (wall.q.y - wall.p.y)
    const x = wall.p.x - ((wall.p.x - wall.q.x) * yPercent)
    this._character.x = x + wallDirection(wall) * CHARACTER_SIZE

    // Make it lose speed if it has touched a wall (falling or standing).
    // If the number is too large, it prevents wallkicks from gaining speed.
    // But if we only decrease speed AFTER the wallkick frame window, then it
    // probably doesn't impact it, and we can keep both effects (wallkicking with
    // speed, and also making it lose speed if it touches the wall for too long)
    if (FRAMES_SINCE_TOUCHED_WALL_MAX > WALLKICK_FRAMES) {
      this.currentSpeed /= 1.2
    }

    // Start counting how many frames have passed since it first touched a wall.
    if (this.framesSinceTouchedWall < FRAMES_SINCE_TOUCHED_WALL_MAX) {
      this.framesSinceTouchedWall++
    }
  }

  private updateCharacter (): void {
    switch (this.currentState) {
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

  // TODO: I wish I could extract this and put it into a different module.
  //       But how do I access all the data from another place?
  //       I got it. I think I can just implement a "serialize" method
  //       which returns a JSON object, and then I create the texts in the caller.
  getDebugInfo (): string[] {
    const formatPoint = ({ x, y }: Point): string => `(${Math.round(x)}, ${Math.round(y)})`
    const formatSegment = ({ p, q }: Segment): string => `${formatPoint(p)} --> ${formatPoint(q)}`
    const formatCurrentState = (): string => {
      switch (this.currentState) {
        case MovementState.Jumping: return 'Jump'
        case MovementState.Standing: return 'Standing'
        case MovementState.Falling: return 'Falling'
      }
      return 'None'
    }

    return [
      `Jump level ${this.currentJumpLevel}`,
      `Speed: ${this.currentSpeed.toFixed(4)}`,
      `Jump speed: ${this.currentJumpSpeed.toFixed(4)}`,
      `${formatCurrentState()}`,
      `Cached floor ${this.currentFloor === null ? 'None' : formatSegment(this.currentFloor)}`,
      `Frames since touched wall: ${this.framesSinceTouchedWall}`,
      `Released up at least once: ${this.releasedUpAtLeastOnce ? 'Yes' : 'No'}`,
      `Current touching wall?: ${(this.currentTouchingWall !== null) ? 'Yes' : 'No'}`,
      `Frames since landing: ${this.framesSinceLanded}`
    ]
  }
}
