import { Point } from './point'
import { Segment } from './segment'

export const EPS = 1e-6

export function wallDirection (wall: Segment): number {
  return wall.p.y > wall.q.y ? 1 : -1
}

export function evalX ({ p, q }: Segment, x: number): number {
  const ratio = (x - p.x) / (q.x - p.x)
  return p.y + ((q.y - p.y) * ratio)
}

export function evalY ({ p, q }: Segment, y: number): number {
  const ratio = (y - p.y) / (q.y - p.y)
  return p.x + ((q.x - p.x) * ratio)
}

function segmentToAscX (s: Segment): Segment {
  if (s.p.x < s.q.x) return s
  return new Segment(s.q, s.p)
}

function pointBelowFloor (r: Point, { p, q }: Segment): boolean {
  console.assert(p.x < q.x)
  return q.sub(p).cross(r.sub(p)) < EPS
}

function closeToZero (x: number): boolean {
  return Math.abs(x) < EPS
}

export const clamp = (num: number, min: number, max: number): number => Math.min(Math.max(num, min), max)

export function convergeToZero (x: number, delta: number): number {
  if (x > 0) {
    return Math.max(x - delta, 0)
  } else {
    return Math.min(x + delta, 0)
  }
}

export function sgn (x: number): number {
  if (closeToZero(x)) return 0
  return x > 0 ? 1 : -1
}

export function wallBelowCharacter ({ p, q }: Segment, c: Point): boolean {
  return q.sub(p).cross(c.sub(p)) < 0 || (p.y <= c.y && q.y <= c.y)
}

export function wallBelowFloor ({ p, q }: Segment, floor: Segment): boolean {
  floor = segmentToAscX(floor)
  return pointBelowFloor(p, floor) && pointBelowFloor(q, floor)
}

export function getMovementDirection (floor: Segment): Point {
  const movementDirection = floor.p.unitDir(floor.q)
  return new Point(Math.abs(movementDirection.x), movementDirection.y)
}
