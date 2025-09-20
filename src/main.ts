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

const controlButtonNodeList = document.querySelectorAll<HTMLButtonElement>('[data-action]')
const controlButtons = controlButtonNodeList.length > 0 ? Array.from(controlButtonNodeList) : undefined

function setScreenVisibility(screen: HTMLElement, visible: boolean) {
  if (visible) {
    screen.removeAttribute('hidden')
    screen.setAttribute('aria-hidden', 'false')
    screen.removeAttribute('inert')
  } else {
    screen.setAttribute('hidden', '')
    screen.setAttribute('aria-hidden', 'true')
    screen.setAttribute('inert', '')
  }
}

function showStartScreen() {
  setScreenVisibility(startScreen, true)
  setScreenVisibility(gameScreen, false)
}

function showGameScreen() {
  setScreenVisibility(startScreen, false)
  setScreenVisibility(gameScreen, true)
}

pauseButton.disabled = true
showStartScreen()

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
  pauseButton.disabled = false
  showGameScreen()
  pauseButton.focus()
  app.start()
})

window.addEventListener('beforeunload', () => {
  app.dispose()
})
