import {
  SRS_KICK_TABLE,
  TETROMINO_SHAPES,
  SPAWN_POSITION,
} from './constants'
import type {
  ActivePiece,
  PieceType,
  Point,
  Rotation,
  RotationDirection,
} from './types'

export const rotateRotation = (
  rotation: Rotation,
  direction: RotationDirection,
): Rotation => {
  if (direction === 'clockwise') {
    return ((rotation + 1) % 4) as Rotation
  }
  return ((rotation + 3) % 4) as Rotation
}

export const createActivePiece = (
  type: PieceType,
  options?: {
    rotation?: Rotation
    position?: Point
    isSpecial?: boolean
    specialBlockIndex?: number | null
  },
): ActivePiece => {
  const rotation = options?.rotation ?? 0
  const position = options?.position ?? { ...SPAWN_POSITION[type] }
  const isSpecial = options?.isSpecial ?? false
  const shapes = TETROMINO_SHAPES[type]
  const blocks = shapes[rotation]
  const specialBlockIndex = isSpecial
    ? options?.specialBlockIndex ?? Math.floor(Math.random() * blocks.length)
    : null

  return {
    type,
    rotation,
    position: { ...position },
    blocks,
    isSpecial,
    specialBlockIndex,
  }
}

export const translateBlocks = (
  piece: ActivePiece,
  offset?: Point,
): readonly Point[] => {
  const { position } = piece
  const dx = offset?.x ?? 0
  const dy = offset?.y ?? 0
  return piece.blocks.map(({ x, y }) => ({
    x: position.x + x + dx,
    y: position.y + y + dy,
  }))
}

export const getKickTests = (
  type: PieceType,
  current: Rotation,
  next: Rotation,
): readonly Point[] => {
  const table = SRS_KICK_TABLE[type]
  const key = `${current}-${next}` as const
  return table[key] ?? [{ x: 0, y: 0 }]
}

export const rotatePiece = (
  piece: ActivePiece,
  direction: RotationDirection,
): { rotated: ActivePiece; kicks: readonly Point[] } => {
  const nextRotation = rotateRotation(piece.rotation, direction)
  const rotated = createActivePiece(piece.type, {
    rotation: nextRotation,
    position: piece.position,
    isSpecial: piece.isSpecial,
    specialBlockIndex: piece.specialBlockIndex,
  })

  return {
    rotated,
    kicks: getKickTests(piece.type, piece.rotation, nextRotation),
  }
}

export const movePiece = (piece: ActivePiece, delta: Point): ActivePiece => ({
  ...piece,
  position: {
    x: piece.position.x + delta.x,
    y: piece.position.y + delta.y,
  },
})
