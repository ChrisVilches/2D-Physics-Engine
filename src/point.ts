// TODO: Consider adding immutable methods.
export class Point {
  x: number
  y: number

  constructor (x: number, y: number) {
    this.x = x
    this.y = y
  }

  dot (p: Point): number {
    return this.x * p.x + this.y * p.y
  }

  cross (p: Point): number {
    return this.x * p.y - this.y * p.x
  }

  dist (p: Point): number {
    return this.sub(p).magnitude()
  }

  magnitude (): number {
    return Math.hypot(this.x, this.y)
  }

  unitDir (p: Point): Point {
    return p.sub(this).normalize()
  }

  normalize (): Point {
    const m = this.magnitude()
    return new Point(this.x / m, this.y / m)
  }

  add (p: Point): Point {
    return new Point(this.x + p.x, this.y + p.y)
  }

  sub (p: Point): Point {
    return new Point(this.x - p.x, this.y - p.y)
  }

  rotCCW (): Point {
    return new Point(-this.y, this.x)
  }

  scale (f: number): Point {
    return new Point(this.x * f, this.y * f)
  }
}
