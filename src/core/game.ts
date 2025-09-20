import { Board } from './board'
import { defaultRules } from './rules'
import { SevenBagRandomizer } from './randomizer'
import { Scoring } from './scoring'
import type {
  ActivePiece,
  CellState,
  GameStatsSnapshot,
  PieceType,
  Point,
  RotationDirection,
  RulesConfig,
} from './types'
import { createActivePiece, movePiece, rotatePiece } from './piece'

const SOFT_DROP_REWARD_INTERVAL = 0.5
const SOFT_DROP_REWARD_POINTS = 50

export interface GameViewState {
  board: readonly (readonly (CellState | null)[])[]
  activePiece: ActivePiece | null
  nextQueue: readonly PieceType[]
  stats: GameStatsSnapshot
  isPaused: boolean
  isGameOver: boolean
}

export type GameEvent =
  | { type: 'spawn'; piece: ActivePiece }
  | { type: 'lock'; linesCleared: number; specialMultiplier: boolean }
  | { type: 'game-over' }

export interface GameTickResult {
  state: GameViewState
  events: GameEvent[]
}

export class Game {
  private readonly board = new Board()
  private readonly randomizer = new SevenBagRandomizer()
  private readonly scoring = new Scoring()
  private readonly rules: RulesConfig
  private readonly previewCount = 2

  private nextQueue: PieceType[] = []
  private activePiece: ActivePiece | null = null
  private isPaused = false
  private isGameOver = false
  private softDropActive = false
  private fallAccumulator = 0
  private softDropScoreAccumulator = 0
  private lockTimerMs: number | null = null
  private pendingEvents: GameEvent[] = []

  constructor(rules: RulesConfig = defaultRules) {
    this.rules = rules
  }

  start() {
    this.reset()
  }

  reset() {
    this.board.reset()
    this.randomizer.reset()
    this.scoring.reset()
    this.nextQueue = []
    this.activePiece = null
    this.isPaused = false
    this.isGameOver = false
    this.softDropActive = false
    this.fallAccumulator = 0
    this.softDropScoreAccumulator = 0
    this.lockTimerMs = null
    this.pendingEvents = []
    this.ensureQueue(this.previewCount + 1)
    this.spawnNextPiece()
  }

  tick(deltaSeconds: number): GameTickResult {
    if (!this.isPaused && !this.isGameOver) {
      this.updateSoftDropBonus(deltaSeconds)
      this.advanceGravity(deltaSeconds)
      this.processLockDelay(deltaSeconds)
    }

    const state = this.getState()
    const events = this.flushEvents()
    return { state, events }
  }

  togglePause() {
    this.isPaused = !this.isPaused
  }

  setSoftDrop(active: boolean) {
    this.softDropActive = active
    if (!active) {
      this.softDropScoreAccumulator = 0
    }
  }

  moveHorizontal(direction: -1 | 1): boolean {
    return this.tryMove({ x: direction, y: 0 })
  }

  softDropStep(): boolean {
    if (!this.activePiece) return false
    const moved = this.tryMove({ x: 0, y: 1 }, { resetAccumulator: true })
    if (!moved) {
      this.beginLockDelay()
    }
    return moved
  }

  rotate(direction: RotationDirection): boolean {
    if (!this.activePiece) return false

    const { rotated, kicks } = rotatePiece(this.activePiece, direction)

    for (const kick of kicks) {
      const candidate = movePiece(rotated, kick)
      if (!this.board.hasCollision(candidate)) {
        this.activePiece = candidate
        this.refreshLockDelay()
        return true
      }
    }

    return false
  }

  hardDrop(): number {
    let dropped = 0
    while (this.tryMove({ x: 0, y: 1 }, { resetAccumulator: true })) {
      dropped += 1
    }
    this.beginLockDelay(true)
    return dropped
  }

  getState(): GameViewState {
    return {
      board: this.board.snapshot(),
      activePiece: this.activePiece,
      nextQueue: this.nextQueue.slice(0, this.previewCount),
      stats: this.scoring.snapshot(),
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
    }
  }

  private advanceGravity(deltaSeconds: number) {
    if (!this.activePiece) {
      this.spawnNextPiece()
      if (!this.activePiece) {
        return
      }
    }

    const gravityRate =
      this.rules.gravityPerSecond *
      (this.softDropActive ? this.rules.softDropMultiplier : 1)

    this.fallAccumulator += gravityRate * deltaSeconds

    while (this.fallAccumulator >= 1) {
      const moved = this.tryMove({ x: 0, y: 1 }, { resetAccumulator: true })
      if (!moved) {
        this.beginLockDelay()
        break
      }
      this.fallAccumulator -= 1
    }
  }

  private processLockDelay(deltaSeconds: number) {
    if (!this.activePiece) return

    if (this.board.hasCollision(this.activePiece, { x: 0, y: 1 })) {
      if (this.lockTimerMs === null) {
        this.lockTimerMs = 0
      } else {
        this.lockTimerMs += deltaSeconds * 1000
        if (this.lockTimerMs >= this.rules.lockDelayMs) {
          this.lockActivePiece()
        }
      }
    } else {
      this.lockTimerMs = null
    }
  }

  private tryMove(
    delta: Point,
    options?: { resetAccumulator?: boolean },
  ): boolean {
    if (!this.activePiece) {
      return false
    }

    const candidate = movePiece(this.activePiece, delta)
    if (this.board.hasCollision(candidate)) {
      return false
    }

    this.activePiece = candidate

    if (options?.resetAccumulator) {
      this.fallAccumulator = 0
    }

    if (delta.x !== 0 || delta.y < 0) {
      this.refreshLockDelay()
    }

    return true
  }

  private refreshLockDelay() {
    if (
      this.lockTimerMs !== null &&
      this.activePiece &&
      this.board.hasCollision(this.activePiece, { x: 0, y: 1 })
    ) {
      this.lockTimerMs = 0
    }
  }

  private beginLockDelay(force = false) {
    if (this.lockTimerMs === null || force) {
      this.lockTimerMs = 0
    }
  }

  private lockActivePiece() {
    if (!this.activePiece) return
    const piece = this.activePiece

    const lockResult = this.board.lockPiece(piece)
    this.activePiece = null
    this.lockTimerMs = null
    this.fallAccumulator = 0

    this.scoring.registerLineClear(
      lockResult.linesCleared,
      lockResult.specialMultiplierApplied,
    )

    this.pendingEvents.push({
      type: 'lock',
      linesCleared: lockResult.linesCleared,
      specialMultiplier: lockResult.specialMultiplierApplied,
    })

    if (!this.spawnNextPiece()) {
      this.isGameOver = true
      this.pendingEvents.push({ type: 'game-over' })
    }
  }

  private spawnNextPiece(): boolean {
    this.ensureQueue(this.previewCount + 1)
    const nextType = this.nextQueue.shift()

    if (!nextType) {
      return false
    }

    const isSpecial = Math.random() < this.rules.specialPieceChance
    const piece = createActivePiece(nextType, { isSpecial })

    if (this.board.hasCollision(piece)) {
      this.activePiece = null
      this.isGameOver = true
      this.pendingEvents.push({ type: 'game-over' })
      return false
    }

    this.activePiece = piece
    this.pendingEvents.push({ type: 'spawn', piece })
    this.ensureQueue(this.previewCount + 1)
    return true
  }

  private ensureQueue(targetLength: number) {
    while (this.nextQueue.length < targetLength) {
      this.nextQueue.push(this.randomizer.next())
    }
  }

  private updateSoftDropBonus(deltaSeconds: number) {
    if (!this.softDropActive || !this.activePiece) {
      this.softDropScoreAccumulator = 0
      return
    }

    this.softDropScoreAccumulator += deltaSeconds

    while (this.softDropScoreAccumulator >= SOFT_DROP_REWARD_INTERVAL) {
      this.scoring.addSoftDropPoints(SOFT_DROP_REWARD_POINTS)
      this.softDropScoreAccumulator -= SOFT_DROP_REWARD_INTERVAL
    }
  }

  private flushEvents(): GameEvent[] {
    const events = this.pendingEvents
    this.pendingEvents = []
    return events
  }
}
