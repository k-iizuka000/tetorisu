import { SCORE_TABLE } from './constants'
import type { GameStatsSnapshot } from './types'

export class Scoring {
  private score = 0
  private linesCleared = 0
  private level = 1

  reset() {
    this.score = 0
    this.linesCleared = 0
    this.level = 1
  }

  registerLineClear(count: number, specialMultiplier: boolean) {
    if (count <= 0) return
    const baseScore = SCORE_TABLE[count] ?? 0
    const awarded = specialMultiplier ? baseScore * 2 : baseScore
    this.score += awarded
    this.linesCleared += count
    this.level = 1 + Math.floor(this.linesCleared / 10)
    return {
      awarded,
      totalScore: this.score,
    }
  }

  snapshot(): GameStatsSnapshot {
    return {
      score: this.score,
      linesCleared: this.linesCleared,
      level: this.level,
    }
  }
}
