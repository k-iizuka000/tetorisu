import './style.css'
import { GameApp } from './ui/app'
import { LayoutScaler } from './ui/layout-scaler'

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
const holdCanvas = query<HTMLCanvasElement>('#hold-preview')
const pauseButton = query<HTMLButtonElement>('#pause-toggle')
const startButton = query<HTMLButtonElement>('#start-button')
const howtoButton = query<HTMLButtonElement>('#howto-button')
const backToStartButton = query<HTMLButtonElement>('#back-to-start')
const startScreen = query<HTMLElement>('#start-screen')
const howtoScreen = query<HTMLElement>('#howto-screen')
const gameScreen = query<HTMLElement>('#game-screen')
const holdButton = query<HTMLButtonElement>('#hold-button')
const itemButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-item-slot]'))
const effectList = query<HTMLDivElement>('#effect-list')
const scoreValue = query<HTMLElement>('#score-value')
const linesValue = query<HTMLElement>('#lines-value')
const levelValue = query<HTMLElement>('#level-value')
const comboValue = query<HTMLElement>('#combo-value')

appRoot.dataset.screen = 'intro'
pauseButton.disabled = true
holdButton.disabled = true
itemButtons.forEach((button) => {
  button.disabled = true
})
startScreen.hidden = false
startScreen.setAttribute('aria-hidden', 'false')
howtoScreen.hidden = true
howtoScreen.setAttribute('aria-hidden', 'true')
gameScreen.hidden = true
gameScreen.setAttribute('aria-hidden', 'true')

const app = new GameApp({
  playfieldCanvas,
  nextCanvas,
  holdCanvas,
  pauseButton,
  holdButton,
  itemButtons,
  effectList,
  scoreValue,
  linesValue,
  levelValue,
  comboValue,
})

const layoutScaler = new LayoutScaler(appRoot, [startScreen, howtoScreen, gameScreen], {
  topOffsetPx: 24,
  onAfterUpdate: () => app.handleResize(),
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
  howtoScreen.hidden = true
  howtoScreen.setAttribute('aria-hidden', 'true')
  gameScreen.hidden = false
  gameScreen.setAttribute('aria-hidden', 'false')
  layoutScaler.update()
  app.start()
})

howtoButton.addEventListener('click', () => {
  if (hasStarted) return
  appRoot.dataset.screen = 'howto'
  startScreen.hidden = true
  startScreen.setAttribute('aria-hidden', 'true')
  howtoScreen.hidden = false
  howtoScreen.setAttribute('aria-hidden', 'false')
  gameScreen.hidden = true
  gameScreen.setAttribute('aria-hidden', 'true')
  layoutScaler.update()
})

backToStartButton.addEventListener('click', () => {
  if (hasStarted) return
  appRoot.dataset.screen = 'intro'
  startScreen.hidden = false
  startScreen.setAttribute('aria-hidden', 'false')
  howtoScreen.hidden = true
  howtoScreen.setAttribute('aria-hidden', 'true')
  gameScreen.hidden = true
  gameScreen.setAttribute('aria-hidden', 'true')
  layoutScaler.update()
})

const dispose = () => {
  app.dispose()
  layoutScaler.dispose()
}

window.addEventListener('beforeunload', dispose)
