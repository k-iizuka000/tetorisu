import type { PieceType } from './types'

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

const shuffle = <T>(items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export class SevenBagRandomizer {
  private bag: PieceType[] = []

  reset() {
    this.bag = []
  }

  next(): PieceType {
    if (this.bag.length === 0) {
      this.refill()
    }
    const piece = this.bag.pop()
    if (!piece) {
      throw new Error('Failed to draw piece from bag')
    }
    return piece
  }

  private refill() {
    this.bag = shuffle([...PIECE_TYPES])
  }
}
