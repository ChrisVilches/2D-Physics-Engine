enum Direction {
  Left, Right, Up
}

const KEY_CODES_DIR_MAP: Record<string, number> = {
  a: Direction.Left,
  d: Direction.Right,
  w: Direction.Up
}

export class InputReader {
  private _left: boolean = false
  private _right: boolean = false
  private _up: boolean = false

  init (): void {
    document.addEventListener('keydown', this.keyDownHandler.bind(this), false)
    document.addEventListener('keyup', this.keyUpHandler.bind(this), false)
  }

  get left (): boolean {
    return this._left
  }

  get right (): boolean {
    return this._right
  }

  get up (): boolean {
    return this._up
  }

  private setPressed (dir: number, pressed: boolean): void {
    switch (dir) {
      case Direction.Left: this._left = pressed
        break
      case Direction.Right: this._right = pressed
        break
      case Direction.Up: this._up = pressed
        break
    }
  }

  private keyDownHandler (e: KeyboardEvent): void {
    this.setPressed(KEY_CODES_DIR_MAP[e.key], true)
  }

  private keyUpHandler (e: KeyboardEvent): void {
    this.setPressed(KEY_CODES_DIR_MAP[e.key], false)
  }
}
