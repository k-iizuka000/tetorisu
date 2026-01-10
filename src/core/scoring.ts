import { SCORE_TABLE } from './constants'
import type { GameStatsSnapshot } from './types'

export class Scoring {
  private score = 0
  private linesCleared = 0
  private level = 1
  private combo = 0
  private maxCombo = 0

  reset() {
    this.score = 0
    this.linesCleared = 0
    this.level = 1
    this.combo = 0
    this.maxCombo = 0
  }

  registerLineClear(
    count: number,
    options: { specialMultiplier: boolean; scoreMultiplier?: number },
  ) {
    if (count <= 0) {
      this.combo = 0
      return
    }
    const baseScore = SCORE_TABLE[count] ?? 0
    this.combo += 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    const comboBonus = this.combo > 1 ? 50 * (this.combo - 1) : 0
    const multiplier = options.specialMultiplier ? 2 : 1
    const scoreMultiplier = options.scoreMultiplier ?? 1
    const awarded = (baseScore * multiplier + comboBonus) * scoreMultiplier
    this.score += awarded
    this.linesCleared += count
    this.level = 1 + Math.floor(this.linesCleared / 10)
    return {
      awarded,
      totalScore: this.score,
    }
  }

  addSoftDropPoints(points: number) {
    if (points <= 0) return
    this.score += points
  }

  addHardDropPoints(points: number) {
    if (points <= 0) return
    this.score += points
  }

  addBonus(points: number) {
    if (points <= 0) return
    this.score += points
  }

  get currentLevel() {
    return this.level
  }

  get currentScore() {
    return this.score
  }

  snapshot(): GameStatsSnapshot {
    return {
      score: this.score,
      linesCleared: this.linesCleared,
      level: this.level,
      combo: this.combo,
      maxCombo: this.maxCombo,
    }
  }
}
