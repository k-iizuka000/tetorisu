import './style.css'
import { GameApp } from './ui/app'

function query<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector(selector)
  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }
  return element as T
}

const appRoot = query<HTMLElement>('#app')
const playfieldCanvas = query<HTMLCanvasElement>('#playfield')
const nextCanvas = query<HTMLCanvasElement>('#next-preview')
const pauseButton = query<HTMLButtonElement>('#pause-toggle')
const startButton = query<HTMLButtonElement>('#start-button')
const startScreen = query<HTMLElement>('#start-screen')
const gameScreen = query<HTMLElement>('#game-screen')

appRoot.dataset.screen = 'intro'
pauseButton.disabled = true
startScreen.hidden = false
startScreen.setAttribute('aria-hidden', 'false')
gameScreen.hidden = true
gameScreen.setAttribute('aria-hidden', 'true')

const app = new GameApp({
  playfieldCanvas,
  nextCanvas,
  pauseButton,
})

let hasStarted = false

startButton.addEventListener('click', () => {
  if (hasStarted) return
  hasStarted = true
  startButton.disabled = true
  startButton.dataset.started = 'true'
  startButton.textContent = 'プレイ中！'
  pauseButton.disabled = false
  appRoot.dataset.screen = 'playing'
  startScreen.hidden = true
  startScreen.setAttribute('aria-hidden', 'true')
  gameScreen.hidden = false
  gameScreen.setAttribute('aria-hidden', 'false')
  app.start()
})

window.addEventListener('beforeunload', () => {
  app.dispose()
})
