// Returns -1 or 1.
// -1 means left,

import { Point } from './point'
import { Segment } from './segment'

// 1 means right.
export function wallDirection (wall: Segment): number {
  return wall.p.y - wall.q.y > 0 ? 1 : -1
}

// TODO: Deprecated. Remove sometime soon.
function closestPointOnLine (line: Segment, point: Point): Point {
  const lx1 = line.p.x
  const ly1 = line.p.y
  const lx2 = line.q.x
  const ly2 = line.q.y
  const x0 = point.x
  const y0 = point.y
  const A1 = ly2 - ly1
  const B1 = lx1 - lx2
  const C1 = (ly2 - ly1) * lx1 + (lx1 - lx2) * ly1
  const C2 = -B1 * x0 + A1 * y0
  const det = A1 * A1 - -B1 * B1
  let cx = 0
  let cy = 0
  if (det !== 0) {
    cx = ((A1 * C1 - B1 * C2) / det)
    cy = ((A1 * C2 - -B1 * C1) / det)
  } else {
    cx = x0
    cy = y0
  }
  return new Point(cx, cy)
}

// Converts the line into a linear function and gets y(x).
// Supposed to be used for floors, since walls can be vertical, this might not work (due to infinite slope).
// TODO: Can this be done without getting the first and second point order?
// --------------
// For now, all of these methods are done considering the projection of the line
// as if it was an infinite line, not a segment.
// TODO: Change name lol
export function getYFromX (s: Segment, x: number): number {
  let firstPoint, secondPoint
  if (s.p.x < s.q.x) {
    firstPoint = s.p
    secondPoint = s.q
  } else {
    firstPoint = s.q
    secondPoint = s.p
  }

  // With these, errors (or even if 'return false' is written instead), it would not consider
  // walls that are just a bit separated from a floor so that the points become outside
  // (horizontally) from a line, but close enough that the character collides with them
  // when also on a floor.
  // if(x < firstPoint.x) throw new Error("x value is too low (out of bounds)");
  // if(x > secondPoint.x) throw new Error("x value is too high (out of bounds)");

  const xPercentage = (x - firstPoint.x) / (secondPoint.x - firstPoint.x)
  return firstPoint.y + ((secondPoint.y - firstPoint.y) * xPercentage)
}

function segmentToAscX (s: Segment): Segment {
  if (s.p.x < s.q.x) return s
  return new Segment(s.q, s.p)
}

function pointBelowFloor (r: Point, { p, q }: Segment): boolean {
  console.assert(p.x < q.x)
  return q.sub(p).cross(r.sub(p)) < 1e-9
}

// TODO: There are some bugs, it seems.
//       It doesn't cross the floors correctly.
//       Try using the previous method.
export function wallBelowFloor ({ p, q }: Segment, floor: Segment): boolean {
  floor = segmentToAscX(floor)
  return pointBelowFloor(p, floor) && pointBelowFloor(q, floor)
}

export function getMovementDirection (floor: Segment): Point {
  const movementDirection = floor.p.unitDir(floor.q)
  return new Point(Math.abs(movementDirection.x), movementDirection.y)
}
