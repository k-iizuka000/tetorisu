import type { GameEvent } from '../core/game'

type OscillatorShape = OscillatorType

interface ToneOptions {
  type?: OscillatorShape
  duration?: number
  attack?: number
  decay?: number
  volume?: number
  sweepTo?: number
  startOffset?: number
}

export class SoundController {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null

  async resume() {
    const context = this.getOrCreateContext()
    if (!context) return
    if (context.state === 'suspended') {
      try {
        await context.resume()
      } catch (error) {
        console.warn('Failed to resume audio context', error)
      }
    }
  }

  playGameStart() {
    const context = this.getOrCreateContext()
    if (!context) return
    this.playTone(440, { type: 'triangle', duration: 0.22, attack: 0.01, decay: 0.12, volume: 0.35 })
    this.playTone(660, {
      type: 'triangle',
      duration: 0.2,
      attack: 0.01,
      decay: 0.16,
      startOffset: 0.08,
      volume: 0.3,
    })
    this.playTone(880, {
      type: 'sine',
      duration: 0.3,
      attack: 0.02,
      decay: 0.24,
      startOffset: 0.16,
      volume: 0.2,
    })
  }

  playRotation() {
    this.playTone(720, {
      type: 'square',
      duration: 0.1,
      attack: 0.005,
      decay: 0.12,
      volume: 0.2,
      sweepTo: 840,
    })
  }

  playHardDrop(distance: number) {
    const intensity = Math.min(Math.max(distance, 1), 20) / 20
    const frequency = 160 + intensity * 200
    const volume = 0.15 + intensity * 0.2
    this.playTone(frequency, {
      type: 'sawtooth',
      duration: 0.16,
      attack: 0.001,
      decay: 0.18,
      volume,
      sweepTo: frequency * 0.6,
    })
  }

  handleEvents(events: readonly GameEvent[]) {
    for (const event of events) {
      if (event.type === 'lock' && event.linesCleared > 0) {
        this.playLineClear(event.linesCleared, event.specialMultiplier)
      }
    }
  }

  private playLineClear(linesCleared: number, special: boolean) {
    const steps = Math.min(linesCleared, 4)
    const baseFrequency = special ? 520 : 400
    for (let index = 0; index < steps; index++) {
      const offset = index * 0.09
      const frequency = baseFrequency * Math.pow(1.15, index)
      this.playTone(frequency, {
        type: 'square',
        duration: 0.18,
        attack: 0.01,
        decay: 0.12,
        volume: special ? 0.28 : 0.22,
        startOffset: offset,
        sweepTo: frequency * 1.05,
      })
    }

    if (special) {
      this.playTone(baseFrequency * 1.9, {
        type: 'triangle',
        duration: 0.24,
        attack: 0.01,
        decay: 0.18,
        startOffset: steps * 0.08,
        volume: 0.26,
      })
    }
  }

  private playTone(frequency: number, options: ToneOptions = {}) {
    const context = this.getOrCreateContext()
    const destination = this.masterGain
    if (!context || !destination) {
      return
    }

    const {
      type = 'sine',
      duration = 0.2,
      attack = 0.01,
      decay = 0.1,
      volume = 0.25,
      sweepTo,
      startOffset = 0,
    } = options

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    const startTime = context.currentTime + Math.max(0, startOffset)
    const stopTime = startTime + Math.max(0.01, duration + decay)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startTime)
    if (sweepTo && sweepTo > 0) {
      oscillator.frequency.linearRampToValueAtTime(sweepTo, startTime + duration)
    }

    const safeVolume = Math.max(0.0001, Math.min(1, volume))
    gainNode.gain.setValueAtTime(0.0001, startTime)
    gainNode.gain.linearRampToValueAtTime(safeVolume, startTime + Math.max(0.001, attack))
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime)

    oscillator.connect(gainNode)
    gainNode.connect(destination)

    oscillator.start(startTime)
    oscillator.stop(stopTime + 0.02)
  }

  private getOrCreateContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext
    }

    if (typeof window === 'undefined') {
      return null
    }

    const AudioContextClass: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) {
      return null
    }

    const context = new AudioContextClass()
    const gainNode = context.createGain()
    gainNode.gain.setValueAtTime(0.6, context.currentTime)
    gainNode.connect(context.destination)

    this.audioContext = context
    this.masterGain = gainNode
    return context
  }
}
