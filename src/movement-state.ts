export enum MovementState {
  Falling, Standing, Jumping
}

export const formatCurrentState = (movementState: MovementState): string => {
  switch (movementState) {
    case MovementState.Jumping: return 'Jump'
    case MovementState.Standing: return 'Standing'
    case MovementState.Falling: return 'Falling'
  }
}
