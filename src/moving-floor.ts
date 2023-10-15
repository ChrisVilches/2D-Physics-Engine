// TODO: Use composition, lel. Or is inheritance ok?
//       Since not all floors are moving, it makes sense
//       to make this class be named "moving floor",
//       and only update the velocity for these, and not for non-moving.
//       (to improve performance). Note that when I implement the partitioning
//       algorithm, some floors need to be rendered (along with the movement),
//       but not detect the collisions, so it's important to make this distinction

import { Point } from './point'
import { Segment } from './segment'

export interface AnimationItem {
  v: Point
  frames: number
}

//       and separate types of floors correctly.
export class MovingFloor extends Segment {
  private readonly sequence: AnimationItem[]
  private frame: number
  private idx: number
  private v: Point

  constructor (p: Point, q: Point, sequence: AnimationItem[]) {
    super(p, q)
    this.sequence = sequence
    this.v = sequence[0].v
    this.frame = 0
    this.idx = 0
  }

  get currentVelocity (): Point {
    return this.v
  }

  updateVelocity (): void {
    const { v, frames } = this.sequence[this.idx]
    this.v = v
    this.frame++

    if (this.frame === frames) {
      this.idx = (this.idx + 1) % this.sequence.length
      this.frame = 0
    }
  }

  updatePosition (): void {
    this.p = this.p.add(this.v)
    this.q = this.q.add(this.v)
  }

  update (): void {
    this.updateVelocity()
    this.updatePosition()
  }
}
