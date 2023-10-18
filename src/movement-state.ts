export enum MovementState {
  Standing, MidAir
}

export const formatCurrentState = (movementState: MovementState): string => {
  switch (movementState) {
    case MovementState.MidAir: return 'Mid-Air'
    case MovementState.Standing: return 'Standing'
  }
}
