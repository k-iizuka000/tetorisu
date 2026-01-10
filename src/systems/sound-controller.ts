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
  destination?: GainNode | null
}

export class SoundController {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private bgmGain: GainNode | null = null
  private bgmTimerId: number | null = null
  private bgmStepIndex = 0
  private bgmNextNoteTime = 0

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

  startBgm() {
    const context = this.getOrCreateContext()
    if (!context || this.bgmTimerId !== null) {
      return
    }

    if (!this.bgmGain) {
      this.bgmGain = context.createGain()
      this.bgmGain.gain.setValueAtTime(0.18, context.currentTime)
      this.bgmGain.connect(this.masterGain ?? context.destination)
    }

    this.bgmStepIndex = 0
    this.bgmNextNoteTime = context.currentTime + 0.05
    this.bgmTimerId = window.setInterval(() => {
      this.scheduleBgm()
    }, 80)
  }

  stopBgm() {
    if (this.bgmTimerId !== null) {
      window.clearInterval(this.bgmTimerId)
      this.bgmTimerId = null
    }
  }

  setBgmPaused(paused: boolean) {
    const context = this.getOrCreateContext()
    if (!context || !this.bgmGain) return
    const targetVolume = paused ? 0.04 : 0.18
    this.bgmGain.gain.cancelScheduledValues(context.currentTime)
    this.bgmGain.gain.linearRampToValueAtTime(targetVolume, context.currentTime + 0.2)
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

  playSpawn() {
    this.playTone(520, {
      type: 'triangle',
      duration: 0.12,
      attack: 0.01,
      decay: 0.1,
      volume: 0.2,
      sweepTo: 620,
    })
  }

  playMove() {
    this.playTone(360, {
      type: 'square',
      duration: 0.06,
      attack: 0.005,
      decay: 0.05,
      volume: 0.12,
      sweepTo: 420,
    })
  }

  playHold() {
    this.playTone(300, {
      type: 'triangle',
      duration: 0.14,
      attack: 0.01,
      decay: 0.12,
      volume: 0.18,
      sweepTo: 220,
    })
  }

  playItemUse() {
    this.playTone(660, {
      type: 'sawtooth',
      duration: 0.18,
      attack: 0.01,
      decay: 0.16,
      volume: 0.2,
      sweepTo: 880,
    })
    this.playTone(980, {
      type: 'sine',
      duration: 0.16,
      attack: 0.01,
      decay: 0.12,
      volume: 0.16,
      startOffset: 0.06,
    })
  }

  playPause() {
    this.playTone(220, {
      type: 'triangle',
      duration: 0.2,
      attack: 0.01,
      decay: 0.16,
      volume: 0.18,
      sweepTo: 160,
    })
  }

  playResume() {
    this.playTone(260, {
      type: 'triangle',
      duration: 0.2,
      attack: 0.01,
      decay: 0.16,
      volume: 0.18,
      sweepTo: 420,
    })
  }

  playGameOver() {
    this.playTone(200, {
      type: 'sawtooth',
      duration: 0.4,
      attack: 0.02,
      decay: 0.3,
      volume: 0.25,
      sweepTo: 120,
    })
    this.playTone(120, {
      type: 'square',
      duration: 0.35,
      attack: 0.02,
      decay: 0.3,
      volume: 0.2,
      startOffset: 0.08,
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
      if (event.type === 'spawn') {
        this.playSpawn()
      }
      if (event.type === 'lock' && event.linesCleared > 0) {
        this.playLineClear(event.linesCleared, event.specialMultiplier)
      }
      if (event.type === 'game-over') {
        this.stopBgm()
        this.playGameOver()
      }
    }
  }

  dispose() {
    this.stopBgm()
  }

  private scheduleBgm() {
    const context = this.audioContext
    if (!context || !this.bgmGain) return

    const lookAhead = 0.4
    while (this.bgmNextNoteTime < context.currentTime + lookAhead) {
      this.playBgmStep(this.bgmNextNoteTime, this.bgmStepIndex)
      const stepDuration = 0.2
      this.bgmNextNoteTime += stepDuration
      this.bgmStepIndex = (this.bgmStepIndex + 1) % 16
    }
  }

  private playBgmStep(time: number, stepIndex: number) {
    const melody = [392, 440, 523, 587, 659, 587, 523, 440]
    const bass = [98, 131, 110, 147]
    const melodyNote = melody[stepIndex % melody.length]
    const bassNote = bass[Math.floor(stepIndex / 4) % bass.length]

    this.playTone(melodyNote, {
      type: 'square',
      duration: 0.12,
      attack: 0.01,
      decay: 0.08,
      volume: 0.16,
      startOffset: Math.max(0, time - (this.audioContext?.currentTime ?? 0)),
      destination: this.bgmGain,
    })

    if (stepIndex % 4 === 0) {
      this.playTone(bassNote, {
        type: 'triangle',
        duration: 0.22,
        attack: 0.02,
        decay: 0.12,
        volume: 0.2,
        startOffset: Math.max(0, time - (this.audioContext?.currentTime ?? 0)),
        destination: this.bgmGain,
      })
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
    const destination = options.destination ?? this.masterGain
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
