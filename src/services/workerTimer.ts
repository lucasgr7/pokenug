// Alternative Web Worker-based timer system
// This runs the timer in a separate thread to avoid blocking the main thread

class WorkerTimer {
  private worker: Worker | null = null
  private callbacks: Map<string, (elapsed: number) => void> = new Map()
  private isRunning = false

  constructor() {
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

  start(interval: number = 250) {
    if (!this.worker || this.isRunning) return
    
    this.isRunning = true
    this.worker.postMessage({ action: 'start', tickInterval: interval })
  }

  stop() {
    if (!this.worker || !this.isRunning) return
    
    this.isRunning = false
    this.worker.postMessage({ action: 'stop' })
  }

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

export const workerTimer = new WorkerTimer()
