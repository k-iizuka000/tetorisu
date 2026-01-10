import { Board } from './board'
import { defaultRules } from './rules'
import { SevenBagRandomizer } from './randomizer'
import { Scoring } from './scoring'
import { EFFECT_DURATIONS, ITEM_TYPES } from './items'
import type {
  ActivePiece,
  ActiveEffects,
  CellState,
  GameStatsSnapshot,
  HeldPiece,
  ItemType,
  PieceType,
  Point,
  RotationDirection,
  RulesConfig,
} from './types'
import { createActivePiece, movePiece, rotatePiece } from './piece'

const SOFT_DROP_REWARD_INTERVAL = 0.5
const SOFT_DROP_REWARD_POINTS = 50
const HARD_DROP_REWARD_POINTS = 100
const ITEM_BONUS_POINTS = 200
const ITEM_MAX_SLOTS = 3
const SCORE_SPEED_INTERVAL = 1000
const SCORE_SPEED_STEP = 0.03

export interface GameViewState {
  board: readonly (readonly (CellState | null)[])[]
  activePiece: ActivePiece | null
  nextQueue: readonly PieceType[]
  holdPiece: HeldPiece | null
  inventory: readonly ItemType[]
  effects: ActiveEffects
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
  private holdPiece: HeldPiece | null = null
  private holdUsed = false
  private isPaused = false
  private isGameOver = false
  private softDropActive = false
  private fallAccumulator = 0
  private softDropScoreAccumulator = 0
  private lockTimerMs: number | null = null
  private pendingEvents: GameEvent[] = []
  private inventory: ItemType[] = []
  private activeEffects: ActiveEffects = { freeze: 0, boost: 0 }

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
    this.holdPiece = null
    this.holdUsed = false
    this.isPaused = false
    this.isGameOver = false
    this.softDropActive = false
    this.fallAccumulator = 0
    this.softDropScoreAccumulator = 0
    this.lockTimerMs = null
    this.pendingEvents = []
    this.inventory = []
    this.activeEffects = { freeze: 0, boost: 0 }
    this.ensureQueue(this.previewCount + 1)
    this.spawnNextPiece()
  }

  tick(deltaSeconds: number): GameTickResult {
    if (!this.isPaused && !this.isGameOver) {
      this.updateActiveEffects(deltaSeconds)
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

  hold(): boolean {
    if (!this.activePiece) return false
    if (this.holdUsed) return false
    const current = this.activePiece
    const held = this.holdPiece
    this.holdUsed = true
    this.activePiece = null
    this.lockTimerMs = null
    this.fallAccumulator = 0

    if (held) {
      const swapped = createActivePiece(held.type, { isSpecial: held.isSpecial })
      if (this.board.hasCollision(swapped)) {
        this.isGameOver = true
        this.pendingEvents.push({ type: 'game-over' })
        return false
      }
      this.activePiece = swapped
      this.holdPiece = { type: current.type, isSpecial: current.isSpecial }
      return true
    }

    this.holdPiece = { type: current.type, isSpecial: current.isSpecial }
    return this.spawnNextPiece()
  }

  hardDrop(): number {
    let dropped = 0
    while (this.tryMove({ x: 0, y: 1 }, { resetAccumulator: true })) {
      dropped += 1
    }
    if (dropped > 0) {
      this.scoring.addHardDropPoints(HARD_DROP_REWARD_POINTS)
    }
    this.beginLockDelay(true)
    return dropped
  }

  getState(): GameViewState {
    return {
      board: this.board.snapshot(),
      activePiece: this.activePiece,
      nextQueue: this.nextQueue.slice(0, this.previewCount),
      holdPiece: this.holdPiece,
      inventory: this.inventory.slice(),
      effects: { ...this.activeEffects },
      stats: this.scoring.snapshot(),
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
    }
  }

  useItem(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.inventory.length) {
      return false
    }
    const item = this.inventory[slotIndex]
    if (!item) return false

    this.inventory.splice(slotIndex, 1)

    switch (item) {
      case 'bomb': {
        const cleared = this.board.clearRows([this.board.height - 1, this.board.height - 2])
        if (cleared > 0) {
          this.scoring.addBonus(cleared * ITEM_BONUS_POINTS)
        }
        break
      }
      case 'shuffle': {
        this.nextQueue = this.shuffleArray(this.nextQueue)
        this.scoring.addBonus(ITEM_BONUS_POINTS)
        break
      }
      case 'freeze': {
        this.activeEffects.freeze = EFFECT_DURATIONS.freeze
        break
      }
      case 'boost': {
        this.activeEffects.boost = EFFECT_DURATIONS.boost
        break
      }
      default:
        break
    }

    return true
  }

  private advanceGravity(deltaSeconds: number) {
    if (!this.activePiece) {
      this.spawnNextPiece()
      if (!this.activePiece) {
        return
      }
    }

    const levelMultiplier = 1 + (this.scoring.currentLevel - 1) * 0.08
    const scoreSteps = Math.floor(this.scoring.currentScore / SCORE_SPEED_INTERVAL)
    const scoreMultiplier = 1 + scoreSteps * SCORE_SPEED_STEP
    const freezeMultiplier = this.activeEffects.freeze > 0 ? 0.35 : 1
    const gravityRate =
      this.rules.gravityPerSecond *
      (this.softDropActive ? this.rules.softDropMultiplier : 1) *
      levelMultiplier *
      scoreMultiplier *
      freezeMultiplier

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
    this.holdUsed = false

    const scoreMultiplier = this.activeEffects.boost > 0 ? 2 : 1
    this.scoring.registerLineClear(lockResult.linesCleared, {
      specialMultiplier: lockResult.specialMultiplierApplied,
      scoreMultiplier,
    })

    if (lockResult.linesCleared > 0 && lockResult.specialMultiplierApplied) {
      this.awardRandomItem()
    }

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

  private awardRandomItem() {
    if (this.inventory.length >= ITEM_MAX_SLOTS) return
    const item = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]
    if (!item) return
    this.inventory.push(item)
  }

  private updateActiveEffects(deltaSeconds: number) {
    for (const key of Object.keys(this.activeEffects) as Array<keyof ActiveEffects>) {
      if (this.activeEffects[key] > 0) {
        this.activeEffects[key] = Math.max(0, this.activeEffects[key] - deltaSeconds)
      }
    }
  }

  private shuffleArray<T>(items: T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
}
