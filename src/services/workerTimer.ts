// Alternative Web Worker-based timer system
// This runs the timer in a separate thread to avoid blocking the main thread

class WorkerTimer {
  private worker: Worker | null = null
  private callbacks: Map<string, (elapsed: number) => void> = new Map()
  private isRunning = false
  private tickInterval: number

  /**
   * @param interval Tick interval in ms. Default is 750ms to match game logic.
   */
  constructor(interval: number = 500) {
    this.tickInterval = interval
    this.initWorker()
  }

  private initWorker() {
    console.log('Initializing WorkerTimer...')
    // Create worker inline
    const workerCode = `
      let lastTime = Date.now()
      let interval = null
      
      self.onmessage = function(e) {
        const { action, tickInterval } = e.data
        
        if (action === 'start') {
          if (interval) return
          interval = setInterval(() => {
            const now = Date.now()
            const elapsed = now - lastTime
            lastTime = now
            self.postMessage({ type: 'tick', elapsed })
          }, tickInterval)
        } else if (action === 'stop') {
          if (interval) {
            clearInterval(interval)
            interval = null
          }
        }
      }
    `

    const blob = new Blob([workerCode], { type: 'application/javascript' })
    this.worker = new Worker(URL.createObjectURL(blob))

    this.worker.onmessage = (e) => {
      if (e.data.type === 'tick') {
        // Schedule callbacks to run on next frame to avoid blocking
        requestAnimationFrame(() => {
          this.callbacks.forEach(callback => {
            try {
              callback(e.data.elapsed)
            } catch (error) {
              console.error('Timer callback error:', error)
            }
          })
        })
      }
    }
  }

  /**
   * Start the timer. If already running, does nothing.
   * @param interval Optional override for tick interval (ms).
   */
  start(interval?: number) {
    if (!this.worker || this.isRunning) return
    this.isRunning = true
    const useInterval = interval ?? this.tickInterval
    this.worker.postMessage({ action: 'start', tickInterval: useInterval })
  }

  stop() {
    if (!this.worker || !this.isRunning) return
    this.isRunning = false
    this.worker.postMessage({ action: 'stop' })
  }

  /**
   * Subscribe to timer ticks. The callback receives elapsed ms since last tick.
   * @param id Unique subscriber id (e.g. 'gameLoop', 'battleSystem')
   * @param callback Function to call on each tick
   */
  subscribe(id: string, callback: (elapsed: number) => void) {
    this.callbacks.set(id, callback)
    return () => this.callbacks.delete(id)
  }

  unsubscribe(id: string) {
    this.callbacks.delete(id)
  }

  destroy() {
    this.stop()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.callbacks.clear()
  }
}

// IMPORTANT: Use the same interval as your game logic expects (default 750ms)
export const workerTimer = new WorkerTimer(750)
