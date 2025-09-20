import './style.css'
import { GameApp } from './ui/app'

function query<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector(selector)
  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }
  return element as T
}

const app = new GameApp({
  playfieldCanvas: query<HTMLCanvasElement>('#playfield'),
  nextCanvas: query<HTMLCanvasElement>('#next-preview'),
  pauseButton: query<HTMLButtonElement>('#pause-toggle'),
  controlButtons: Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-action]'),
  ),
})

app.start()

window.addEventListener('beforeunload', () => {
  app.dispose()
})
