export interface LayoutScalerOptions {
  topOffsetPx?: number
  onAfterUpdate?: () => void
}

export class LayoutScaler {
  private readonly root: HTMLElement
  private readonly targets: HTMLElement[]
  private readonly options: LayoutScalerOptions
  private readonly observer: ResizeObserver | null
  private readonly handleWindowResize: () => void

  constructor(root: HTMLElement, targets: HTMLElement[], options: LayoutScalerOptions = {}) {
    this.root = root
    this.targets = targets
    this.options = options

    this.handleWindowResize = () => {
      this.update()
    }

    this.observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.update()) : null

    if (this.observer) {
      this.observer.observe(this.root)
      for (const target of this.targets) {
        this.observer.observe(target)
      }
    }

    window.addEventListener('resize', this.handleWindowResize)
    this.update()
  }

  update() {
    const availableWidth = this.root.clientWidth
    const availableHeight = this.root.clientHeight
    const topOffset = this.options.topOffsetPx ?? 0

    for (const target of this.targets) {
      if (!target.isConnected) {
        continue
      }

      if (target.hidden || target.getAttribute('aria-hidden') === 'true') {
        target.style.removeProperty('--layout-scale')
        target.style.removeProperty('--layout-offset-y')
        continue
      }

      target.style.setProperty('--layout-scale', '1')
      target.style.setProperty('--layout-offset-y', '0px')

      const rect = target.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0 || availableWidth === 0 || availableHeight === 0) {
        continue
      }

      const scale = Math.min(1, availableWidth / rect.width, availableHeight / rect.height)
      const scaledHeight = rect.height * scale
      const offset = Math.max(0, (availableHeight - scaledHeight) / 2 - topOffset)

      target.style.setProperty('--layout-scale', scale.toString())
      target.style.setProperty('--layout-offset-y', `${offset}px`)
    }

    this.options.onAfterUpdate?.()
  }

  dispose() {
    window.removeEventListener('resize', this.handleWindowResize)
    this.observer?.disconnect()
  }
}
