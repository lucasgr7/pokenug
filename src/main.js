import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useGameStore } from './stores/gameStore'
import { useBuffStore } from './stores/buffStore'
import { workerTimer } from './services/workerTimer.js'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Initialize the game store and set up job progress tracking
const gameStore = useGameStore()
gameStore.initializeGame()

// Initialize the buff store to load saved buffs from localStorage
const buffStore = useBuffStore()
buffStore.initializeBuffStore()

// Set up global tick handler for idle jobs
workerTimer.subscribe('idle jobs', (elapsed) => {
  Object.keys(gameStore.idleJobs).forEach(jobId => {
    gameStore.updateJobProgress(jobId, elapsed)
  })
})

// Start the worker timer - this is essential for all subscriptions to work
workerTimer.start()

app.mount('#app')
