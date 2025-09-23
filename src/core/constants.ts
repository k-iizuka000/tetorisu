import type { PieceType, Point, Rotation } from './types'

export const BOARD_WIDTH = 10
export const BOARD_VISIBLE_HEIGHT = 10
export const BOARD_HIDDEN_ROWS = 2
export const BOARD_TOTAL_HEIGHT = BOARD_VISIBLE_HEIGHT + BOARD_HIDDEN_ROWS

export const SPAWN_POSITION: Record<PieceType, Point> = {
  I: { x: 3, y: -1 },
  O: { x: 4, y: 0 },
  T: { x: 3, y: 0 },
  J: { x: 3, y: 0 },
  L: { x: 3, y: 0 },
  S: { x: 3, y: 0 },
  Z: { x: 3, y: 0 },
}

const createPoints = (points: Array<[number, number]>): Point[] =>
  points.map(([x, y]) => ({ x, y }))

export const TETROMINO_SHAPES: Record<PieceType, readonly Point[][]> = {
  I: [
    createPoints([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]),
    createPoints([
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ]),
    createPoints([
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ]),
    createPoints([
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ]),
  ],
  O: [
    createPoints([
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ]),
  ],
  T: [
    createPoints([
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ]),
    createPoints([
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ]),
    createPoints([
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ]),
  ],
  J: [
    createPoints([
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ]),
    createPoints([
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ]),
    createPoints([
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ]),
  ],
  L: [
    createPoints([
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ]),
    createPoints([
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ]),
    createPoints([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ]),
  ],
  S: [
    createPoints([
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ]),
    createPoints([
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ]),
    createPoints([
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ]),
    createPoints([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ]),
  ],
  Z: [
    createPoints([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ]),
    createPoints([
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ]),
    createPoints([
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ]),
    createPoints([
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]),
  ],
}

type KickKey = `${Rotation}-${Rotation}`
export type KickTable = Partial<Record<KickKey, readonly Point[]>>

const createKickTable = (tests: Array<[number, number]>): Point[] =>
  tests.map(([x, y]) => ({ x, y }))

const standardTests: KickTable = {
  '0-1': createKickTable([
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ]),
  '1-0': createKickTable([
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ]),
  '1-2': createKickTable([
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ]),
  '2-1': createKickTable([
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ]),
  '2-3': createKickTable([
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ]),
  '3-2': createKickTable([
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ]),
  '3-0': createKickTable([
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ]),
  '0-3': createKickTable([
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ]),
}

const iPieceTests: KickTable = {
  '0-1': createKickTable([
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ]),
  '1-0': createKickTable([
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ]),
  '1-2': createKickTable([
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ]),
  '2-1': createKickTable([
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ]),
  '2-3': createKickTable([
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ]),
  '3-2': createKickTable([
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ]),
  '3-0': createKickTable([
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ]),
  '0-3': createKickTable([
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ]),
}

const oPieceTests: KickTable = {
  '0-1': createPoints([[0, 0]]),
  '1-0': createPoints([[0, 0]]),
  '1-2': createPoints([[0, 0]]),
  '2-1': createPoints([[0, 0]]),
  '2-3': createPoints([[0, 0]]),
  '3-2': createPoints([[0, 0]]),
  '3-0': createPoints([[0, 0]]),
  '0-3': createPoints([[0, 0]]),
}

export const SRS_KICK_TABLE: Record<PieceType, KickTable> = {
  I: iPieceTests,
  O: oPieceTests,
  T: standardTests,
  J: standardTests,
  L: standardTests,
  S: standardTests,
  Z: standardTests,
}

export const SCORE_TABLE: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
}
