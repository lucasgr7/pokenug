import { ref } from 'vue'

const TICK_INTERVAL = 750 // 250ms (4 ticks per second)
const SAVE_INTERVAL = 5000 // Save state every 5 seconds

interface GameTime {
  lastTick: number;
  currentTick: number;
}

class TickSystem {
  /** Set of callback functions to be called on each tick */
  private readonly subscribers: Set<(elapsed: number) => void> = new Set()
  /** Reference to the main tick interval */
  private interval: ReturnType<typeof setInterval> | number | null = null
  /** Reactive game time state */
  private readonly gameTime = ref<GameTime>({
    lastTick: Date.now(),
    currentTick: Date.now()
  })

  constructor() {
    this.loadState()
    this.start()
  }

  private loadState() {
    const savedState = localStorage.getItem('gameTime')
    if (savedState) {
      const parsed = JSON.parse(savedState)
      this.gameTime.value = {
        lastTick: parsed.lastTick,
        currentTick: Date.now()
      }
      // Calculate missed ticks
      const missedTime = Date.now() - parsed.lastTick
      if (missedTime > 0) {
        this.notifySubscribers(missedTime)
      }
    }
  }

  private saveState() {
    localStorage.setItem('gameTime', JSON.stringify({
      lastTick: Date.now(),
      currentTick: Date.now()
    }))
  }

  private start() {
    if (this.interval) return

    let lastTime = Date.now()
    let saveAccumulator = 0

    const tick = () => {
      const now = Date.now()
      const elapsed = now - lastTime
      
      // Only process if enough time has passed (throttle to ~4 FPS)
      if (elapsed >= TICK_INTERVAL) {
        this.gameTime.value = {
          lastTick: this.gameTime.value.currentTick,
          currentTick: now
        }
        
        // Use requestIdleCallback if available, otherwise setTimeout for async processing
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => this.notifySubscribers(elapsed), { timeout: 100 })
        } else {
          setTimeout(() => this.notifySubscribers(elapsed), 0)
        }
        
        lastTime = now
        
        // Handle periodic save
        saveAccumulator += elapsed
        if (saveAccumulator >= SAVE_INTERVAL) {
          this.saveState()
          saveAccumulator = 0
        }
      }
      
      this.interval = requestAnimationFrame(tick)
    }

    this.interval = requestAnimationFrame(tick)
  }

  private notifySubscribers(elapsed: number) {
    this.subscribers.forEach(callback => callback(elapsed))
  }

  subscribe(callback: (elapsed: number) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  stop() {
    if (this.interval) {
      if (typeof this.interval === 'number') {
        cancelAnimationFrame(this.interval)
      } else {
        clearInterval(this.interval)
      }
      this.interval = null
    }
  }
}

// Create a singleton instance
export const tickSystem = new TickSystem()