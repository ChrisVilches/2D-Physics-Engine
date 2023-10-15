import { GameState } from './game-state'
import { Segment } from './segment'

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D
  private readonly width: number
  private readonly height: number

  constructor (private readonly canvas: HTMLCanvasElement, private readonly gameState: GameState, private readonly characterSize: number) {
    this.ctx = this.canvas.getContext('2d')
    this.width = this.canvas.width
    this.height = this.canvas.height
  }

  draw (): void {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.ctx.strokeStyle = 'black'
    this.gameState.floors.forEach(this.drawSegment.bind(this))
    this.ctx.strokeStyle = '#ff2233'
    this.gameState.walls.forEach(this.drawSegment.bind(this))
    this.drawCharacter()
  }

  private drawSegment (s: Segment): void {
    this.ctx.beginPath()
    this.ctx.moveTo(s.p.x, this.height - s.p.y)
    this.ctx.lineTo(s.q.x, this.height - s.q.y)
    this.ctx.stroke()
  }

  private drawCharacter (): void {
    this.ctx.fillStyle = 'red'
    this.ctx.fillRect(
      this.gameState.character.x - (this.characterSize / 2),
      this.height - this.gameState.character.y - (this.characterSize / 2),
      this.characterSize,
      this.characterSize
    )
  }
}
