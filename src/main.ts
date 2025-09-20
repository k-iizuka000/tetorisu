import './style.css'
import { GameApp } from './ui/app'

function query<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector(selector)
  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }
  return element as T
}

const playfieldCanvas = query<HTMLCanvasElement>('#playfield')
const nextCanvas = query<HTMLCanvasElement>('#next-preview')
const pauseButton = query<HTMLButtonElement>('#pause-toggle')
const controlButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-action]'),
)
const startButton = query<HTMLButtonElement>('#start-button')

pauseButton.disabled = true

const app = new GameApp({
  playfieldCanvas,
  nextCanvas,
  pauseButton,
  controlButtons,
})

let hasStarted = false

startButton.addEventListener('click', () => {
  if (hasStarted) return
  hasStarted = true
  startButton.disabled = true
  startButton.dataset.started = 'true'
  startButton.textContent = 'プレイ中！'
  pauseButton.disabled = false
  app.start()
})

window.addEventListener('beforeunload', () => {
  app.dispose()
})
