export type PieceType = 'I' | 'O' | 'S' | 'Z' | 'J' | 'L' | 'T'
export type Rotation = 0 | 1 | 2 | 3
export type RotationDirection = 'clockwise' | 'counterclockwise'

export interface Point {
  x: number
  y: number
}

export interface CellState {
  type: PieceType
  isSpecial: boolean
}

export interface ActivePiece {
  type: PieceType
  rotation: Rotation
  position: Point
  blocks: readonly Point[]
  isSpecial: boolean
  specialBlockIndex: number | null
}

export interface LockResult {
  linesCleared: number
  clearedRows: number[]
  specialMultiplierApplied: boolean
}

export interface GameStatsSnapshot {
  score: number
  linesCleared: number
  level: number
}

export interface RulesConfig {
  gravityPerSecond: number
  lockDelayMs: number
  dasMs: number
  arrMs: number
  softDropMultiplier: number
  specialPieceChance: number
}
