// TODO: I have to add ceilings. This is probably relatively easy.
//       (compared to walls and floors.)

import { Point } from './point'

// TODO: Refactor using Segment { p, q }
//       Add logic (collisions, etc) here.
export class Segment {
  p: Point
  q: Point

  constructor (p: Point, q: Point) {
    this.p = p
    this.q = q
  }

  scale (f: number): Segment {
    const dir = this.q.sub(this.p)
    const scaledDir = dir.scale(f)
    return new Segment(this.p, this.p.add(scaledDir))
  }

  dist (r: Point): number {
    const { p, q } = this
    if ((q.sub(p)).dot(r.sub(p)) <= 0) return p.dist(r)
    if ((p.sub(q)).dot(r.sub(q)) <= 0) return q.dist(r)
    return Math.abs((q.sub(p)).cross(r.sub(p))) / p.dist(q)
  }

  // TODO: Move this somewhere else.
  ADHOC_closestPoint (r: Point): Point {
    const { p, q } = this
    // TODO: Sadly this is necessary, otherwise the point reference
    //       is returned, and it starts modifying the floors when
    //       the character moves lol
    //       UPDATE: Modified it so that it returns r if the point
    //               cannot be projected onto the segment.
    if ((q.sub(p)).dot(r.sub(p)) <= 0) return r // return new Point(p.x, p.y);
    if ((p.sub(q)).dot(r.sub(q)) <= 0) return r // return new Point(q.x, q.y);
    // TODO: Doesn't need to be unit. That wastes a sqrt(x^2 + y^2)
    const dir = this.p.unitDir(this.q).rotCCW()
    const t = r.add(dir)
    const factor = t.sub(r).cross(p.sub(r)) / q.sub(p).cross(t.sub(r))
    return this.scale(factor).q
  }

  intersectsCircle (c: Point, r: number): boolean {
    return this.dist(c) < r
  }

  length (): number {
    return this.p.dist(this.q)
  }
}
