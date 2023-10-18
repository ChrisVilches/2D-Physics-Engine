import { z } from 'zod'

export const configSchema = z.object({
  Y_MIN_SPEED: z.number().negative(),
  CHARACTER_SIZE: z.number().positive(),
  JUMP_INITIAL_SPEED: z.number().positive(),
  Y_DECELERATION: z.number().positive(),
  X_ACCELERATION: z.number().positive(),
  X_ACCELERATION_MID_AIR: z.number().positive(),
  MAX_WALKING_SPEED: z.number().positive(),
  WALLKICK_FRAMES: z.number().positive(),
  WALLKICK_NECESSARY_SPEED: z.number().positive(),
  REPEATED_JUMP_FRAMES: z.number().positive(),
  THIRD_LEVEL_JUMP_SPEED_REQUIRED: z.number().positive(),
  JUMP_FACTOR_2: z.number().gt(1),
  JUMP_FACTOR_3: z.number()
}).refine(({ JUMP_FACTOR_2, JUMP_FACTOR_3 }) => JUMP_FACTOR_2 < JUMP_FACTOR_3)
  .refine(({ X_ACCELERATION, X_ACCELERATION_MID_AIR }) => X_ACCELERATION > X_ACCELERATION_MID_AIR)
