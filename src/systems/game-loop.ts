import { Game } from '../core/game'
import type { GameTickResult } from '../core/game'

export type FrameListener = (result: GameTickResult) => void

export class GameLoop {
  private rafId: number | null = null
  private lastTimestamp = 0
  private running = false
  private readonly game: Game
  private readonly listener: FrameListener

  constructor(game: Game, listener: FrameListener) {
    this.game = game
    this.listener = listener
  }

  start() {
    if (this.running) return
    this.game.start()
    this.running = true
    this.lastTimestamp = performance.now()
    this.rafId = requestAnimationFrame(this.handleFrame)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  togglePause() {
    this.game.togglePause()
  }

  setSoftDrop(active: boolean) {
    this.game.setSoftDrop(active)
  }

  moveLeft() {
    this.game.moveHorizontal(-1)
  }

  moveRight() {
    this.game.moveHorizontal(1)
  }

  rotateClockwise() {
    this.game.rotate('clockwise')
  }

  rotateCounterClockwise() {
    this.game.rotate('counterclockwise')
  }

  softDropStep() {
    this.game.softDropStep()
  }

  hardDrop() {
    this.game.hardDrop()
  }

  private handleFrame = (timestamp: number) => {
    if (!this.running) return

    const deltaSeconds = (timestamp - this.lastTimestamp) / 1000
    this.lastTimestamp = timestamp

    const result = this.game.tick(deltaSeconds)
    this.listener(result)

    this.rafId = requestAnimationFrame(this.handleFrame)
  }
}
