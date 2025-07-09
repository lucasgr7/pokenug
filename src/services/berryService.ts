import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import type { ItemDefinition } from '@/constants/items'
import type { Pokemon } from '@/types/pokemon'
import { workerTimer } from './workerTimer.js'

interface BerryTask {
  id: string;
  regionId: string;
  startTime: number;
  endTime: number;
  berryId: string;
  berryName: string;
  catchRate: number;
  completed: boolean;
}

/**
 * Service that manages berry tasks for automatic Pokémon catching
 */
class BerryService {
  private readonly activeTasks = ref<BerryTask[]>([])
  private unsubscribe: (() => void) | null = null

  constructor() {
    this.loadState()
    this.setupTicker()
  }

  /**
   * Start a new berry task in a specific region
   */
  startBerryTask(berry: ItemDefinition, regionId: string) {
    if (!berry.effect || berry.effect.type !== 'auto-catch') {
      return false
    }

    const gameStore = useGameStore()
    const inventoryStore = useInventoryStore()
    
    // Check if berry is available in inventory and consume it
    if (!inventoryStore.useItem(berry.id)) {
      gameStore.addNotification(`You don't have any ${berry.name} left!`, 'error')
      return false
    }

    const now = Date.now()
    const task: BerryTask = {
      id: `berry-task-${now}-${Math.random().toString(36).substring(2, 9)}`,
      regionId,
      startTime: now,
      endTime: now + berry.effect.duration,
      berryId: berry.id,
      berryName: berry.name,
      catchRate: berry.effect.catchRate,
      completed: false
    }

    // Add the task to the active tasks
    this.activeTasks.value.push(task)
    
    // Display notification that the berry has been used
    gameStore.addNotification(
      `Used ${berry.name} in ${gameStore.currentRegionData.name}. It will attract a Pokémon in ${this.formatDuration(berry.effect.duration)}.`,
      'success'
    )

    // Save the state
    this.saveState()
    return true
  }

  /**
   * Get all active berry tasks
   */
  getActiveTasks() {
    return this.activeTasks.value
  }

  /**
   * Get active tasks for a specific region
   */
  getActiveTasksForRegion(regionId: string) {
    return this.activeTasks.value.filter(task => task.regionId === regionId)
  }

  /**
   * Cancel a berry task
   */
  cancelTask(taskId: string) {
    const index = this.activeTasks.value.findIndex(task => task.id === taskId)
    if (index !== -1) {
      this.activeTasks.value.splice(index, 1)
      this.saveState()
      return true
    }
    return false
  }

  /**
   * Get remaining time for a berry task
   */
  getRemainingTime(taskId: string) {
    const task = this.activeTasks.value.find(t => t.id === taskId)
    if (!task) return 0

    const now = Date.now()
    return Math.max(0, task.endTime - now)
  }

  /**
   * Check if a berry task is completed
   */
  isTaskCompleted(taskId: string) {
    const task = this.activeTasks.value.find(t => t.id === taskId)
    return task ? task.completed : false
  }

  /**
   * Format duration from milliseconds to human-readable string
   */
  private formatDuration(ms: number) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`
    }
    
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  /**
   * Complete berry task and catch a Pokémon
   */
  private async completeBerryTask(task: BerryTask) {
    if (task.completed) return

    const gameStore = useGameStore()
    const regionData = gameStore.currentRegionData

    // Mark the task as completed
    task.completed = true

    // Try to catch a Pokémon from the berry pool
    try {
      // Use the region's berry pool if it exists, otherwise fall back to normal pool
      const pool = regionData.berryPool || regionData.pool
      if (!pool || pool.length === 0) {
        gameStore.addNotification(`No Pokémon found for berry in ${regionData.name}!`, 'warning')
        this.cancelTask(task.id)
        return
      }

      // Select a random Pokémon from the pool
      const weightedPool: Array<{id: number, name: string}> = []
      pool.forEach((pokemon: { probability: number; id: any; name: any }) => {
        const count = pokemon.probability || 1
        for (let i = 0; i < count; i++) {
          weightedPool.push({ id: pokemon.id, name: pokemon.name })
        }
      })

      // Select a random Pokémon from the weighted pool
      const selectedPokemon = weightedPool[Math.floor(Math.random() * weightedPool.length)]
      
      // Fetch the complete Pokémon data
      const response = await fetch('/pokemon-data.json')
      const pokemonList = await response.json()
      const pokemon = pokemonList.find((p: Pokemon) => p.id === selectedPokemon.id)
      
      if (pokemon) {
        // Always catch the Pokémon - 100% success rate
        // Calculate a level within region boundaries
        const level = Math.floor(Math.random() * 
          (regionData.maxLevel - regionData.minLevel + 1)) + regionData.minLevel
        
        // Generate stats for this level
        const stats = gameStore.calculateStats(level)
        
        // Create the caught Pokémon with a unique ID
        const caughtPokemon = { 
          ...pokemon,
          level,
          currentHP: stats.maxHP,
          maxHP: stats.maxHP,
          attack: stats.attack,
          defense: stats.defense,
          uniqueId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          experience: 0,
          experienceToNextLevel: Math.floor(100 * Math.pow(level, 1.5))
        }
        
        // Add the Pokémon to inventory
        gameStore.addPokemonToInventory(caughtPokemon)
        
        // Add notification
        gameStore.addNotification(
          `Your ${task.berryName} caught a wild ${pokemon.name} (Lvl ${level}) in ${regionData.name}!`,
          'success'
        )
      }
    } catch (error) {
      console.error('Error completing berry task:', error)
      gameStore.addNotification('Failed to complete berry task due to an error.', 'error')
    }

    // Remove the completed task
    this.cancelTask(task.id)
  }

  /**
   * Setup the tick system subscription
   */
  private setupTicker() {
    // Clean up any existing subscription
    if (this.unsubscribe) {
      this.unsubscribe()
    }

    // Subscribe to the tick system
    this.unsubscribe = workerTimer.subscribe(this.workerHandleBerryTasks.name, () => {
      this.workerHandleBerryTasks();
    })
  }

  public workerHandleBerryTasks() {
    const now = Date.now()
      const completedTasks: BerryTask[] = []

      // Check for completed tasks
      this.activeTasks.value.forEach(task => {
        if (!task.completed && now >= task.endTime) {
          completedTasks.push(task)
        }
      })

      // Process all completed tasks
      completedTasks.forEach(task => {
        this.completeBerryTask(task)
      })

      // Save state if there were any changes
      if (completedTasks.length > 0) {
        this.saveState()
      }
    }

  /**
   * Save the current state to localStorage
   */
  private saveState() {
    localStorage.setItem('berryTasks', JSON.stringify(this.activeTasks.value))
  }

  /**
   * Load the state from localStorage
   */
  private loadState() {
    try {
      const savedState = localStorage.getItem('berryTasks')
      if (savedState) {
        const tasks = JSON.parse(savedState)
        // Filter out any completed tasks
        this.activeTasks.value = tasks.filter((task: BerryTask) => !task.completed)
        
        // Check for tasks that should have completed while offline
        const now = Date.now()
        const completedTasks: BerryTask[] = []
        
        this.activeTasks.value.forEach(task => {
          if (now >= task.endTime) {
            completedTasks.push(task)
          }
        })

        // Process offline completions
        completedTasks.forEach(task => {
          this.completeBerryTask(task)
        })
      }
    } catch (error) {
      console.error('Error loading berry tasks:', error)
    }
  }
}

// Export a singleton instance
export const berryService = new BerryService()