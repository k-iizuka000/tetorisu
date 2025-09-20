import { BOARD_WIDTH, BOARD_TOTAL_HEIGHT } from './constants'
import type { ActivePiece, CellState, LockResult, Point } from './types'
import { translateBlocks } from './piece'

const createEmptyRow = (): (CellState | null)[] => Array(BOARD_WIDTH).fill(null)

export class Board {
  private readonly grid: (CellState | null)[][]

  constructor() {
    this.grid = Array.from({ length: BOARD_TOTAL_HEIGHT }, createEmptyRow)
  }

  reset() {
    for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        this.grid[y][x] = null
      }
    }
  }

  get width() {
    return BOARD_WIDTH
  }

  get height() {
    return BOARD_TOTAL_HEIGHT
  }

  cellAt(point: Point): CellState | null {
    if (!this.isInside(point)) {
      return null
    }
    return this.grid[point.y][point.x]
  }

  isInside(point: Point): boolean {
    return (
      point.x >= 0 &&
      point.x < BOARD_WIDTH &&
      point.y >= 0 &&
      point.y < BOARD_TOTAL_HEIGHT
    )
  }

  isOutOfBounds(point: Point): boolean {
    return point.x < 0 || point.x >= BOARD_WIDTH || point.y >= BOARD_TOTAL_HEIGHT
  }

  hasCollision(piece: ActivePiece, offset?: Point): boolean {
    const cells = translateBlocks(piece, offset)
    for (const cell of cells) {
      if (this.isOutOfBounds(cell)) {
        return true
      }
      if (cell.y >= 0 && this.grid[cell.y][cell.x]) {
        return true
      }
    }
    return false
  }

  lockPiece(piece: ActivePiece): LockResult {
    const absoluteBlocks = translateBlocks(piece)
    const specialYRows = new Set<number>()

    absoluteBlocks.forEach((point, index) => {
      if (point.y < 0) {
        return
      }
      this.grid[point.y][point.x] = {
        type: piece.type,
        isSpecial: piece.isSpecial && index === piece.specialBlockIndex,
      }
      if (piece.isSpecial && index === piece.specialBlockIndex) {
        specialYRows.add(point.y)
      }
    })

    const { linesCleared, clearedRows } = this.clearFullLines()
    const specialMultiplierApplied =
      linesCleared > 0 && specialYRows.size > 0

    return {
      linesCleared,
      clearedRows,
      specialMultiplierApplied,
    }
  }

  peekLines(rowIndexes: number[]): (CellState | null)[][] {
    return rowIndexes.map((rowIndex) =>
      this.grid[rowIndex]?.map((cell) => (cell ? { ...cell } : null)) ?? [],
    )
  }

  private clearFullLines(): { linesCleared: number; clearedRows: number[] } {
    const clearedRows: number[] = []

    for (let y = this.grid.length - 1; y >= 0; y--) {
      if (this.grid[y].every((cell) => cell !== null)) {
        clearedRows.push(y)
        this.grid.splice(y, 1)
        this.grid.unshift(createEmptyRow())
        y++
      }
    }

    return {
      linesCleared: clearedRows.length,
      clearedRows,
    }
  }

  snapshot(): readonly (readonly (CellState | null)[])[] {
    return this.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
  }
}
