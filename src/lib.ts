import { Point } from './point'
import { Segment } from './segment'

export function wallDirection (wall: Segment): number {
  return wall.p.y - wall.q.y > 0 ? 1 : -1
}

export function evalX ({ p, q }: Segment, x: number): number {
  const ratio = (x - p.x) / (q.x - p.x)
  return p.y + ((q.y - p.y) * ratio)
}

function segmentToAscX (s: Segment): Segment {
  if (s.p.x < s.q.x) return s
  return new Segment(s.q, s.p)
}

function pointBelowFloor (r: Point, { p, q }: Segment): boolean {
  console.assert(p.x < q.x)
  return q.sub(p).cross(r.sub(p)) < 1e-9
}

export function closestPointProjection (s: Segment, r: Point): Point {
  const { p, q } = s
  if ((q.sub(p)).dot(r.sub(p)) <= 0) return r
  if ((p.sub(q)).dot(r.sub(q)) <= 0) return r
  const dir = p.sub(q).rotCCW()
  const t = r.add(dir)
  const factor = t.sub(r).cross(p.sub(r)) / q.sub(p).cross(t.sub(r))
  return s.scale(factor).q
}

export function wallBelowFloor ({ p, q }: Segment, floor: Segment): boolean {
  floor = segmentToAscX(floor)
  return pointBelowFloor(p, floor) && pointBelowFloor(q, floor)
}

export function getMovementDirection (floor: Segment): Point {
  const movementDirection = floor.p.unitDir(floor.q)
  return new Point(Math.abs(movementDirection.x), movementDirection.y)
}
