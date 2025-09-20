import { Game, type GameTickResult, type GameViewState } from '../core/game'
import { GameLoop } from '../systems/game-loop'
import {
  BOARD_HIDDEN_ROWS,
  BOARD_VISIBLE_HEIGHT,
  BOARD_WIDTH,
  TETROMINO_SHAPES,
} from '../core/constants'
import type { PieceType } from '../core/types'

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0d000',
  T: '#b05cff',
  S: '#1ed760',
  Z: '#ff4d4d',
  J: '#4d79ff',
  L: '#ff9b3d',
}

const GRID_COLOR = 'rgba(255, 255, 255, 0.08)'

const SWIPE_THRESHOLD = 24
const TAP_SLOP = 10
const LONG_PRESS_DURATION_MS = 350

export interface AppOptions {
  playfieldCanvas: HTMLCanvasElement
  nextCanvas: HTMLCanvasElement
  pauseButton: HTMLButtonElement
}

export class GameApp {
  private readonly game = new Game()
  private readonly loop: GameLoop
  private readonly playfieldCanvas: HTMLCanvasElement
  private readonly playfieldCtx: CanvasRenderingContext2D
  private readonly nextCtx: CanvasRenderingContext2D
  private readonly pauseButton: HTMLButtonElement
  private readonly scoreElement: HTMLElement
  private currentState: GameViewState | null = null
  private hasStarted = false
  private activePointerId: number | null = null
  private pointerStartX = 0
  private pointerStartY = 0
  private pointerStartTime = 0
  private pointerHandled = false
  private softDropEngaged = false
  private lastSoftDropOffset = 0
  private longPressTimeoutId: number | null = null
  private longPressTriggered = false

  constructor(options: AppOptions) {
    this.playfieldCanvas = options.playfieldCanvas
    const playfieldCtx = options.playfieldCanvas.getContext('2d')
    const nextCtx = options.nextCanvas.getContext('2d')

    if (!playfieldCtx) {
      throw new Error('Failed to acquire playfield 2D context')
    }

    if (!nextCtx) {
      throw new Error('Failed to acquire next preview 2D context')
    }

    this.playfieldCtx = playfieldCtx
    this.nextCtx = nextCtx
    this.pauseButton = options.pauseButton
    this.scoreElement = document.getElementById('score-value') ?? this.pauseButton
    this.loop = new GameLoop(this.game, (result) => this.handleFrame(result))

    this.bindPauseButton()
    this.bindKeyboard()
    this.bindTouchControls()
  }

  start() {
    if (this.hasStarted) return
    this.hasStarted = true
    this.pauseButton.textContent = 'Pause'
    this.loop.start()
  }

  togglePause() {
    if (!this.hasStarted) return
    if (this.currentState?.isGameOver) {
      this.game.reset()
      const state = this.game.getState()
      this.currentState = state
      this.updateHud(state)
      this.pauseButton.textContent = 'Pause'
      return
    }
    this.loop.togglePause()
    const state = this.game.getState()
    this.pauseButton.textContent = state.isPaused ? 'Resume' : 'Pause'
  }

  dispose() {
    this.loop.stop()
    this.pauseButton.removeEventListener('click', this.handlePauseClick)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.playfieldCanvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.playfieldCanvas.removeEventListener('pointermove', this.handlePointerMove)
    this.playfieldCanvas.removeEventListener('pointerup', this.handlePointerUp)
    this.playfieldCanvas.removeEventListener('pointercancel', this.handlePointerCancel)
    this.playfieldCanvas.removeEventListener('pointerleave', this.handlePointerCancel)
    this.clearLongPressTimer()
  }

  private handleFrame(result: GameTickResult) {
    this.currentState = result.state
    this.renderPlayfield(result.state)
    this.renderNextQueue(result.state)
    this.updateHud(result.state)
  }

  private bindPauseButton() {
    this.pauseButton.addEventListener('click', this.handlePauseClick)
  }

  private readonly handlePauseClick = () => {
    this.togglePause()
  }

  private bindKeyboard() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  private bindTouchControls() {
    const canvas = this.playfieldCanvas
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointercancel', this.handlePointerCancel)
    canvas.addEventListener('pointerleave', this.handlePointerCancel)
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return

    if (!this.hasStarted) {
      if (event.key === ' ') {
        event.preventDefault()
      }
      return
    }

    switch (event.key) {
      case 'ArrowLeft':
        this.loop.moveLeft()
        break
      case 'ArrowRight':
        this.loop.moveRight()
        break
      case 'ArrowDown':
        this.loop.setSoftDrop(true)
        this.loop.softDropStep()
        break
      case ' ':
        event.preventDefault()
        this.loop.rotateClockwise()
        break
      case 'p':
      case 'P':
        this.togglePause()
        break
      default:
        break
    }
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    if (!this.hasStarted) return
    if (event.key === 'ArrowDown') {
      this.loop.setSoftDrop(false)
    }
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return
    if (!this.hasStarted) return

    const state = this.currentState
    if (state?.isPaused || state?.isGameOver) return

    this.playfieldCanvas.setPointerCapture(event.pointerId)
    this.activePointerId = event.pointerId
    this.pointerStartX = event.clientX
    this.pointerStartY = event.clientY
    this.pointerStartTime = performance.now()
    this.pointerHandled = false
    this.softDropEngaged = false
    this.lastSoftDropOffset = 0
    this.longPressTriggered = false
    this.clearLongPressTimer()
    this.longPressTimeoutId = window.setTimeout(() => {
      if (this.activePointerId === event.pointerId && !this.pointerHandled) {
        this.loop.rotateCounterClockwise()
        this.longPressTriggered = true
        this.pointerHandled = true
      }
      this.longPressTimeoutId = null
    }, LONG_PRESS_DURATION_MS)
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return
    if (!this.hasStarted) return

    const state = this.currentState
    if (state?.isPaused || state?.isGameOver) return

    const dx = event.clientX - this.pointerStartX
    const dy = event.clientY - this.pointerStartY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx > TAP_SLOP || absDy > TAP_SLOP) {
      if (!this.longPressTriggered) {
        this.clearLongPressTimer()
      }
    }

    if (this.pointerHandled) {
      if (this.softDropEngaged) {
        const additionalOffset = dy - this.lastSoftDropOffset
        if (additionalOffset >= SWIPE_THRESHOLD) {
          this.lastSoftDropOffset = dy
          this.loop.softDropStep()
        }
      }
      return
    }

    if (absDx >= SWIPE_THRESHOLD && absDx > absDy) {
      this.pointerHandled = true
      this.clearLongPressTimer()
      if (dx < 0) {
        this.loop.moveLeft()
      } else {
        this.loop.moveRight()
      }
      return
    }

    if (dy >= SWIPE_THRESHOLD && absDy > absDx) {
      this.pointerHandled = true
      this.clearLongPressTimer()
      this.beginSoftDrop(dy)
      return
    }
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    this.finishPointerInteraction(event, false)
  }

  private readonly handlePointerCancel = (event: PointerEvent) => {
    this.finishPointerInteraction(event, true)
  }

  private finishPointerInteraction(event: PointerEvent, cancelled: boolean) {
    if (event.pointerId !== this.activePointerId) return

    if (this.playfieldCanvas.hasPointerCapture(event.pointerId)) {
      this.playfieldCanvas.releasePointerCapture(event.pointerId)
    }

    if (this.softDropEngaged) {
      this.loop.setSoftDrop(false)
      this.softDropEngaged = false
      this.lastSoftDropOffset = 0
    }

    const handled = this.pointerHandled
    const longPressTriggered = this.longPressTriggered
    const startX = this.pointerStartX
    const startY = this.pointerStartY
    const startTime = this.pointerStartTime

    this.clearLongPressTimer()

    if (!cancelled && this.hasStarted) {
      const state = this.currentState
      if (!state || (!state.isPaused && !state.isGameOver)) {
        const dx = event.clientX - startX
        const dy = event.clientY - startY
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        const duration = performance.now() - startTime

        if (!handled && !longPressTriggered) {
          if (absDx >= SWIPE_THRESHOLD && absDx > absDy) {
            if (dx < 0) {
              this.loop.moveLeft()
            } else {
              this.loop.moveRight()
            }
          } else if (dy >= SWIPE_THRESHOLD && absDy > absDx) {
            this.loop.setSoftDrop(true)
            this.loop.softDropStep()
            this.loop.setSoftDrop(false)
          } else if (duration < LONG_PRESS_DURATION_MS && absDx <= TAP_SLOP && absDy <= TAP_SLOP) {
            this.loop.rotateClockwise()
          }
        }
      }
    }

    this.resetPointerState()
  }

  private beginSoftDrop(offsetY: number) {
    if (!this.softDropEngaged) {
      this.softDropEngaged = true
      this.loop.setSoftDrop(true)
    }
    this.lastSoftDropOffset = offsetY
    this.loop.softDropStep()
  }

  private clearLongPressTimer() {
    if (this.longPressTimeoutId !== null) {
      window.clearTimeout(this.longPressTimeoutId)
      this.longPressTimeoutId = null
    }
  }

  private resetPointerState() {
    this.activePointerId = null
    this.pointerHandled = false
    this.softDropEngaged = false
    this.lastSoftDropOffset = 0
    this.longPressTriggered = false
    this.longPressTimeoutId = null
    this.pointerStartX = 0
    this.pointerStartY = 0
    this.pointerStartTime = 0
  }

  private renderPlayfield(state: GameViewState) {
    const ctx = this.playfieldCtx
    const { width, height } = ctx.canvas
    const cellWidth = width / BOARD_WIDTH
    const cellHeight = height / BOARD_VISIBLE_HEIGHT

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#0f1621'
    ctx.fillRect(0, 0, width, height)

    // Render settled blocks
    for (let row = 0; row < BOARD_VISIBLE_HEIGHT; row++) {
      const boardY = row + BOARD_HIDDEN_ROWS
      const cells = state.board[boardY]
      if (!cells) continue

      for (let col = 0; col < BOARD_WIDTH; col++) {
        const cell = cells[col]
        if (!cell) continue
        this.drawCell(ctx, col, row, cellWidth, cellHeight, cell.type, cell.isSpecial)
      }
    }

    // Render active piece
    const piece = state.activePiece
    if (piece) {
      piece.blocks.forEach(({ x, y }, index) => {
        const worldX = piece.position.x + x
        const worldY = piece.position.y + y
        const visibleY = worldY - BOARD_HIDDEN_ROWS
        if (
          worldX < 0 ||
          worldX >= BOARD_WIDTH ||
          visibleY < 0 ||
          visibleY >= BOARD_VISIBLE_HEIGHT
        ) {
          return
        }
        const isSpecial = piece.isSpecial && index === piece.specialBlockIndex
        this.drawCell(
          ctx,
          worldX,
          visibleY,
          cellWidth,
          cellHeight,
          piece.type,
          isSpecial,
        )
      })
    }

    this.drawGrid(ctx, cellWidth, cellHeight, width, height)
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    gridX: number,
    gridY: number,
    cellWidth: number,
    cellHeight: number,
    type: PieceType,
    isSpecial: boolean,
  ) {
    const x = gridX * cellWidth
    const y = gridY * cellHeight
    const padding = 2

    ctx.fillStyle = PIECE_COLORS[type]
    ctx.fillRect(x + padding, y + padding, cellWidth - padding * 2, cellHeight - padding * 2)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.fillRect(x + padding, y + padding, cellWidth - padding * 2, (cellHeight - padding * 2) / 3)

    if (isSpecial) {
      const gradient = ctx.createRadialGradient(
        x + cellWidth / 2,
        y + cellHeight / 2,
        cellWidth * 0.1,
        x + cellWidth / 2,
        y + cellHeight / 2,
        cellWidth * 0.6,
      )
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, cellWidth, cellHeight)
    }
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    cellWidth: number,
    cellHeight: number,
    width: number,
    height: number,
  ) {
    ctx.save()
    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 1

    for (let col = 0; col <= BOARD_WIDTH; col++) {
      const x = Math.round(col * cellWidth) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let row = 0; row <= BOARD_VISIBLE_HEIGHT; row++) {
      const y = Math.round(row * cellHeight) + 0.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    ctx.restore()
  }

  private renderNextQueue(state: GameViewState) {
    const ctx = this.nextCtx
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#11161f'
    ctx.fillRect(0, 0, width, height)

    const slotHeight = height / 2

    state.nextQueue.forEach((type, index) => {
      this.drawPreviewPiece(ctx, type, width, slotHeight, index)
    })
  }

  private drawPreviewPiece(
    ctx: CanvasRenderingContext2D,
    type: PieceType,
    slotWidth: number,
    slotHeight: number,
    index: number,
  ) {
    const offsetY = index * slotHeight
    const shape = TETROMINO_SHAPES[type][0]
    const cellSize = Math.min(slotWidth / 4, slotHeight / 4)

    const minX = Math.min(...shape.map((p) => p.x))
    const maxX = Math.max(...shape.map((p) => p.x))
    const minY = Math.min(...shape.map((p) => p.y))
    const maxY = Math.max(...shape.map((p) => p.y))

    const pieceWidth = maxX - minX + 1
    const pieceHeight = maxY - minY + 1

    const startX = (slotWidth - pieceWidth * cellSize) / 2 - minX * cellSize
    const startY =
      offsetY + (slotHeight - pieceHeight * cellSize) / 2 - minY * cellSize

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.fillRect(8, offsetY + 8, slotWidth - 16, slotHeight - 16)

    shape.forEach(({ x, y }) => {
      const drawX = startX + x * cellSize
      const drawY = startY + y * cellSize
      ctx.fillStyle = PIECE_COLORS[type]
      ctx.fillRect(drawX, drawY, cellSize - 4, cellSize - 4)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(drawX, drawY, cellSize - 4, (cellSize - 4) / 3)
    })
  }

  private updateHud(state: GameViewState) {
    this.scoreElement.textContent = state.stats.score.toString()
    this.pauseButton.textContent = state.isPaused ? 'Resume' : 'Pause'
    if (state.isGameOver) {
      this.pauseButton.textContent = 'Restart'
    }
  }
}
