import { Segment } from './segment'
import { CHARACTER_SIZE } from './config.json'
import './style.css'
import { readMap } from './map-reader'
import { InputReader } from './input'
import { GameState } from './game-state'

const appContainer = document.querySelector('#app') as HTMLDivElement

appContainer.innerHTML = `
  <canvas id="canvas" style="border: 1px solid black;" width=800 height=600></canvas>
  <p>Move using A, W, D</p>
  <div id="debug-info"></div>
`

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const width = canvas.width
const height = canvas.height
const debugInfoContainer = document.getElementById('debug-info') as HTMLDivElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

function buildGameState (): GameState {
  const { initialPosition, walls, floors } = readMap()

  const inputState = new InputReader()
  inputState.init()

  return new GameState(inputState, walls, floors, initialPosition)
}

const gameState = buildGameState()

function drawSegment (s: Segment): void {
  ctx.beginPath()
  ctx.moveTo(s.p.x, height - s.p.y)
  ctx.lineTo(s.q.x, height - s.q.y)
  ctx.stroke()
}

function drawCharacter (): void {
  ctx.fillStyle = 'red'
  ctx.fillRect(
    gameState.character.x - (CHARACTER_SIZE / 2),
    height - gameState.character.y - (CHARACTER_SIZE / 2),
    CHARACTER_SIZE,
    CHARACTER_SIZE
  )
}

function showDebugInfo (): void {
  ctx.fillStyle = 'black'
  ctx.font = '14px Arial'
  const text = gameState.getDebugInfo().map(t => `<p>${t}</p>`).join('')
  debugInfoContainer.innerHTML = text
}

function draw (): void {
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = 'black'
  gameState.floors.forEach(drawSegment)
  ctx.strokeStyle = '#ff2233'
  gameState.walls.forEach(drawSegment)
  drawCharacter()
}

function loop (): void {
  gameState.update()
  draw()
  showDebugInfo()
  window.requestAnimationFrame(loop)
}

window.requestAnimationFrame(loop)
