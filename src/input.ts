enum Direction {
  Left, Right, Up
}

const KEY_CODES_DIR_MAP: Record<string, number> = {
  a: Direction.Left,
  d: Direction.Right,
  w: Direction.Up
}

export interface InputPressedState {
  right: boolean
  left: boolean
  up: boolean
}

// TODO: Not sure about this pattern... it mutates the state.

function setPressed (dir: number, pressed: boolean, state: InputPressedState): void {
  switch (dir) {
    case Direction.Left: state.left = pressed
      break
    case Direction.Right: state.right = pressed
      break
    case Direction.Up: state.up = pressed
      break
  }
}

const keyDownHandler = (state: InputPressedState) => (e: KeyboardEvent) => {
  setPressed(KEY_CODES_DIR_MAP[e.key], true, state)
}

const keyUpHandler = (state: InputPressedState) => (e: KeyboardEvent) => {
  setPressed(KEY_CODES_DIR_MAP[e.key], false, state)
}

export function listenInput (state: InputPressedState): void {
  document.addEventListener('keydown', keyDownHandler(state), false)
  document.addEventListener('keyup', keyUpHandler(state), false)
}
