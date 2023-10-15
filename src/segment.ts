import { Point } from './point'

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

  intersectsCircle (c: Point, r: number): boolean {
    return this.dist(c) < r
  }

  length (): number {
    return this.p.dist(this.q)
  }
}
