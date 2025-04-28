import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { tickSystem } from './services/tickSystem'
import { useGameStore } from './stores/gameStore'
import { useBuffStore } from './stores/buffStore'

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
tickSystem.subscribe((elapsed) => {
  Object.keys(gameStore.idleJobs).forEach(jobId => {
    gameStore.updateJobProgress(jobId, elapsed)
  })
})

app.mount('#app')
