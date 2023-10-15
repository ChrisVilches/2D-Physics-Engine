import { Point } from './point'

describe(Point, () => {
  describe('unitDir', () => {
    test('diagonal', () => {
      const p = new Point(1, 1)
      const q = new Point(4, 4)
      const dir = p.unitDir(q)
      expect(dir.x).toBeCloseTo(0.70710678118)
      expect(dir.y).toBeCloseTo(0.70710678118)
    })

    test('horizontal', () => {
      const p = new Point(1, 1)
      const q = new Point(4, 1)
      const dir = p.unitDir(q)
      expect(dir.x).toBeCloseTo(1)
      expect(dir.y).toBeCloseTo(0)
    })
  })

  test('rotCCW', () => {
    const p = new Point(5, 1)
    const q = p.rotCCW()
    expect(q.x).toBe(-1)
    expect(q.y).toBe(5)
  })
})
