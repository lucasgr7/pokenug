import { ref } from 'vue'

const TICK_INTERVAL = 1000 // 1 second
const SAVE_INTERVAL = 5000 // Save state every 5 seconds

interface GameTime {
  lastTick: number;
  currentTick: number;
}

class TickSystem {
  private readonly subscribers: Set<(elapsed: number) => void> = new Set()
  private interval: ReturnType<typeof setInterval> | null = null
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

    this.interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - this.gameTime.value.currentTick
      this.gameTime.value = {
        lastTick: this.gameTime.value.currentTick,
        currentTick: now
      }
      this.notifySubscribers(elapsed)
    }, TICK_INTERVAL)

    // Save state periodically
    setInterval(() => this.saveState(), SAVE_INTERVAL)
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
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

// Create a singleton instance
export const tickSystem = new TickSystem()