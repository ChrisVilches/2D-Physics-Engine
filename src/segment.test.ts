import { Point } from './point'
import { Segment } from './segment'

describe(Segment, () => {
  test('dist', () => {
    const s = new Segment(new Point(0, 0), new Point(10, 0))
    const a = new Point(5, 0)
    const b = new Point(5, 1)
    const c = new Point(-1, 1)
    const d = new Point(11, 1)

    expect(s.dist(a)).toBeCloseTo(0)
    expect(s.dist(b)).toBeCloseTo(1)
    expect(s.dist(c)).toBeCloseTo(Math.sqrt(2))
    expect(s.dist(d)).toBeCloseTo(Math.sqrt(2))
  })
})
