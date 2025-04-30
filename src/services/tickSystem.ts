import { ref } from 'vue'

const TICK_INTERVAL = 250 // 1 second
const SAVE_INTERVAL = 5000 // Save state every 5 seconds

interface GameTime {
  lastTick: number;
  currentTick: number;
}

/**
 * Manages game time and tick-based updates for the game system.
 * Handles saving/loading game state and notifying subscribers of time updates.
 */
/**
 * Example of creating a 3-second tick using TickSystem:
 * 
 * ```typescript
 * const THREE_SECONDS = 3000; // milliseconds
 * let accumulatedTime = 0;
 * 
 * const tickSystem = new TickSystem();
 * tickSystem.subscribe((elapsed: number) => {
 *   accumulatedTime += elapsed;
 *   if (accumulatedTime >= THREE_SECONDS) {
 *     // Your code to run every 3 seconds goes here
 *     console.log('3 seconds have passed!');
 *     accumulatedTime -= THREE_SECONDS; // Reset accumulated time
 *   }
 * });
 * ```
 * 
 * @remarks
 * The elapsed parameter in the callback represents the time passed since the last tick in milliseconds.
 * You need to accumulate this time and check when it reaches your desired interval (3000ms).
 * Remember to subtract the interval from accumulated time instead of setting to 0 to maintain precision.
 */
class TickSystem {
  /** Set of callback functions to be called on each tick */
  private readonly subscribers: Set<(elapsed: number) => void> = new Set()
  /** Reference to the main tick interval */
  private interval: ReturnType<typeof setInterval> | null = null
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