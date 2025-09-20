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
const startButton = query<HTMLButtonElement>('#start-button')
const startScreen = query<HTMLElement>('#start-screen')
const gameScreen = query<HTMLElement>('#game-screen')

function setScreenVisibility(screen: HTMLElement, hidden: boolean) {
  if (hidden) {
    screen.setAttribute('aria-hidden', 'true')
    screen.setAttribute('inert', '')
  } else {
    screen.setAttribute('aria-hidden', 'false')
    screen.removeAttribute('inert')
  }
}

function showStartScreen() {
  setScreenVisibility(startScreen, false)
  setScreenVisibility(gameScreen, true)
}

function showGameScreen() {
  setScreenVisibility(startScreen, true)
  setScreenVisibility(gameScreen, false)
}

pauseButton.disabled = true
showStartScreen()

const app = new GameApp({
  playfieldCanvas,
  nextCanvas,
  pauseButton,
})

let hasStarted = false

startButton.addEventListener('click', () => {
  if (hasStarted) return
  hasStarted = true
  pauseButton.disabled = false
  showGameScreen()
  pauseButton.focus()
  app.start()
})

window.addEventListener('beforeunload', () => {
  app.dispose()
})
