import { closestPointProjection, evalX, wallBelowFloor } from './lib'
import { Point } from './point'
import { Segment } from './segment'

describe(evalX.name, () => {
  test('endpoint', () => {
    const y0 = evalX(new Segment(new Point(0, 0), new Point(10, 1)), 0)
    expect(y0).toBeCloseTo(0)
    const y1 = evalX(new Segment(new Point(0, 0), new Point(10, 1)), 10)
    expect(y1).toBeCloseTo(1)
  })

  test('endpoint (segment inverted)', () => {
    const y0 = evalX(new Segment(new Point(10, 1), new Point(0, 0)), 0)
    expect(y0).toBeCloseTo(0)
    const y1 = evalX(new Segment(new Point(10, 1), new Point(0, 0)), 10)
    expect(y1).toBeCloseTo(1)
  })

  test('middle', () => {
    const y = evalX(new Segment(new Point(0, 0), new Point(10, 1)), 5)
    expect(y).toBeCloseTo(0.5)
  })

  test('close to endpoint', () => {
    const y = evalX(new Segment(new Point(0, 0), new Point(10, 1)), 1)
    expect(y).toBeCloseTo(0.1)
    const y1 = evalX(new Segment(new Point(0, 0), new Point(10, 1)), 9)
    expect(y1).toBeCloseTo(0.9)
  })

  test('close to endpoint (segment inverted)', () => {
    const y0 = evalX(new Segment(new Point(10, 1), new Point(0, 0)), 1)
    expect(y0).toBeCloseTo(0.1)
    const y1 = evalX(new Segment(new Point(10, 1), new Point(0, 0)), 9)
    expect(y1).toBeCloseTo(0.9)
  })

  test('outside range', () => {
    const y = evalX(new Segment(new Point(0, 0), new Point(10, 1)), 15)
    expect(y).toBeCloseTo(1.5)
  })
})

describe(wallBelowFloor.name, () => {
  test('is below', () => {
    const w = new Segment(new Point(0, 0), new Point(5, 1))
    const f = new Segment(new Point(-1, 4), new Point(7, 10))
    expect(wallBelowFloor(w, f)).toBe(true)
  })

  test('is below (2)', () => {
    const w = new Segment(new Point(2, 4), new Point(6, 2))
    const f = new Segment(new Point(1, 4), new Point(4, 6))
    expect(wallBelowFloor(w, f)).toBe(true)
  })

  test('is below (point in common)', () => {
    const w = new Segment(new Point(4, 6), new Point(6, 2))
    const f = new Segment(new Point(1, 6), new Point(4, 6))
    expect(wallBelowFloor(w, f)).toBe(true)
  })

  test('not below (point in common)', () => {
    const w = new Segment(new Point(4, 6), new Point(6, 7))
    const f = new Segment(new Point(1, 6), new Point(4, 6))
    expect(wallBelowFloor(w, f)).toBe(false)
  })

  test('is intersected', () => {
    const w = new Segment(new Point(0, 0), new Point(10, 0))
    const f = new Segment(new Point(5, 5), new Point(6, -1))
    expect(wallBelowFloor(w, f)).toBe(false)
  })
})

describe(closestPointProjection.name, () => {
  test('has projection', () => {
    const s = new Segment(new Point(0, 0), new Point(10, 0))
    const p = closestPointProjection(s, new Point(5, 1))
    expect(p.x).toBeCloseTo(5)
    expect(p.y).toBeCloseTo(0)
  })

  test('point in segment', () => {
    const s = new Segment(new Point(0, 0), new Point(10, 0))
    const p = closestPointProjection(s, new Point(6, 0))
    expect(p.x).toBeCloseTo(6)
    expect(p.y).toBeCloseTo(0)
  })

  test('has no projection (non-collinear)', () => {
    const s = new Segment(new Point(0, 0), new Point(10, 0))
    const p = closestPointProjection(s, new Point(15, 4))
    expect(p.x).toBeCloseTo(15)
    expect(p.y).toBeCloseTo(4)
  })

  test('has no projection (collinear)', () => {
    const s = new Segment(new Point(0, 0), new Point(10, 0))
    const p = closestPointProjection(s, new Point(15, 0))
    expect(p.x).toBeCloseTo(15)
    expect(p.y).toBeCloseTo(0)
  })
})
