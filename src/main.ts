import { CHARACTER_SIZE } from './config.json'
import './style.css'
import { readMap } from './map-reader'
import { InputReader } from './input'
import { GameState } from './game-state'
import Handlebars from 'handlebars'
import { Renderer } from './renderer'
import { formatCurrentState } from './movement-state'
import { Point } from './point'

Handlebars.registerHelper('trunc', function (num: number) {
  return num.toFixed(4)
})

Handlebars.registerHelper('formatPoint', function (p: Point) {
  return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
})

const appContainer = document.querySelector('#app') as HTMLDivElement

const githubLink = 'https://github.com/ChrisVilches/2D-physics-engine'

const authorTemplate = Handlebars.compile(`
  <div class="flex justify-end">
    <div class="mr-2">
      By Chris Vilches
    </div>
    <a href="${githubLink}" target="_blank">
      <svg viewBox="0 0 16 16" class="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
    </a>
  </div>
`)

const mainTemplate = Handlebars.compile(`
  <canvas id="canvas" style="border: 1px solid black;" width=800 height=600></canvas>

  <div class="mt-4">
    <span class="mr-2">Move using</span>
    <kbd>A</kbd> <kbd>W</kbd> <kbd>D</kbd>
  </div>

  <div class="my-4" id="debug-info"></div>
  <div id="author-info"></div>
`)

const infoTemplate = Handlebars.compile(`
  <div class="">
    <div class="flex space-x-4">
      <div class="flex-1 text-end font-bold">State</div>
      <div class="flex-1 text-start font-mono">{{currentState}}</div>
    </div>
    <div class="flex space-x-4">
      <div class="flex-1 text-end font-bold">Position</div>
      <div class="flex-1 text-start font-mono">{{formatPoint characterPosition}}</div>
    </div>
    <div class="flex space-x-4">
      <div class="flex-1 text-end font-bold">Velocity</div>
      <div class="flex-1 text-start font-mono">{{formatPoint velocity}}</div>
    </div>
    <div class="flex space-x-4">
      <div class="flex-1 text-end font-bold">Jump level</div>
      <div class="flex-1 text-start font-mono">{{jumpLevel}} / 3</div>
    </div>
  </div>
`)

appContainer.innerHTML = mainTemplate({})

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const debugInfoContainer = document.getElementById('debug-info') as HTMLDivElement
const authorInfoContainer = document.getElementById('author-info') as HTMLDivElement
authorInfoContainer.innerHTML = authorTemplate({})

function buildGameState (): GameState {
  const { initialPosition, walls, floors } = readMap(1)

  const inputState = new InputReader()
  inputState.init()

  return new GameState(inputState, walls, floors, initialPosition)
}

const gameState = buildGameState()

function showDebugInfo (): void {
  const velocity = new Point(gameState.xSpeed, gameState.ySpeed)
  const currentState = formatCurrentState(gameState.currentState)
  const jumpLevel = gameState.currentJumpLevel
  debugInfoContainer.innerHTML = infoTemplate({
    characterPosition: gameState.character,
    velocity,
    currentState,
    jumpLevel
  })
}

const renderer = new Renderer(canvas, gameState, CHARACTER_SIZE)

function loop (): void {
  gameState.update()
  renderer.draw()
  showDebugInfo()
  window.requestAnimationFrame(loop)
}

window.requestAnimationFrame(loop)
