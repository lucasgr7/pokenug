<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useInventory } from '@/composables/useInventory'
import { usePokemonCapture } from '@/composables/usePokemonCapture'
import { useSeekerStone } from '@/composables/useSeekerStone'
import { berryService } from '@/services/berryService'
import BattleLog from '@/components/BattleLog.vue'
import XPBar from '@/components/XPBar.vue'
import CachedImage from '@/components/CachedImage.vue'
import PokemonBattleDisplay from '@/components/PokemonBattleDisplay.vue'
// ...existing code...
import PokemonSelectionModal from '@/components/PokemonSelectionModal.vue'
import ActionButtonsMobile from '@/components/ActionButtonsMobile.vue'
import CircularActionButton from '@/components/CircularActionButton.vue'
import type { InventoryItem } from '@/types/pokemon'
import regions from '@/constants/regions'
import { useBuffStore } from '@/stores/buffStore'
import BuffDisplay from '@/components/BuffDisplay.vue'
import { workerTimer } from '@/services/workerTimer'

// Store and Pokemon data
const gameStore = useGameStore()
const buffStore = useBuffStore()
const inventory = useInventory()
const { attemptCapture, isTryingCatch } = usePokemonCapture()
const seekerStoneComposable = useSeekerStone()
const showPokeballSelector = ref(false)
const showBerrySelector = ref(false)
const activeTasks = ref<any[]>([])
const wildPokemon = computed(() => gameStore.battle.wildPokemon)
const isPlayerAttacking = computed(() => gameStore.battle.isPlayerAttacking)
const isWildPokemonHurt = computed(() => gameStore.battle.isWildPokemonHurt)
const isEnemyAttacking = computed(() => gameStore.battle.isEnemyAttacking)
const recoveryProgress = ref(0)

// Mobile-specific refs
const isMobile = ref(window.innerWidth < 768)
const battleAreaRef = ref<HTMLElement>()
const touchStartTime = ref(0)

const selectedPokeball = ref<InventoryItem | null>(null)

const spawnTimer = computed(() => {
  return gameStore.battle.spawnTimer
})

const isRecovering = ref(false)

// Total pokeball count
const totalPokeballs = computed(() => {
  return inventory.getPokeballCount()
})




// Get available pokeballs from inventory
const availablePokeballs = computed(() => {
  return inventory.getItemsByType('pokeball')
})

// Get available berries from inventory
const availableBerries = computed(() => {
  return inventory.getItemsByType('berries').filter((berry: InventoryItem) => {
    const definition = inventory.getItemDefinition(berry.id)
    return definition?.effect?.type === 'auto-catch'
  })
})

// Get available seeker stones from inventory
const availableSeekerStones = computed(() => {
  return inventory.getItemsByType('material').filter((material: InventoryItem) => {
    return material.id === 'seeker-stone' && material.usable
  })
})

// Get available dragon stones from inventory
const availableDragonStones = computed(() => {
  return inventory.getItemsByType('material').filter((material: InventoryItem) => {
    return material.id === 'dragon-stone' && material.usable
  })
})

// Action button states and counts
const canCapture = computed(() => {
  return !!wildPokemon.value && totalPokeballs.value > 0 && !gameStore.battle.isTryingCatch
})

const canUseBerry = computed(() => {
  return availableBerries.value.length > 0
})

const canUseSeekerStone = computed(() => {
  return availableSeekerStones.value.length > 0 && gameStore.currentRegion !== 'Home'
})

const canUseDragonStone = computed(() => {
  return availableDragonStones.value.length > 0 && !gameStore.isTemporaryRegionActive
})

const berryCount = computed(() => {
  return availableBerries.value.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0)
})

const seekerStoneCount = computed(() => {
  return availableSeekerStones.value.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0)
})

const dragonStoneCount = computed(() => {
  return availableDragonStones.value.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0)
})

// Fire rate state from buffStore
const fireRateState = computed(() => buffStore.getFireRateState)

// Computed property for progress ring color based on fire rate state
const getProgressRingColor = computed(() => {
  // If countdown is active, show warning color
  if (countdownProgress.value > 0 && countdownProgress.value < 100) {
    return 'rgb(251, 146, 60)' // Orange warning color
  }

  const count = fireRateState.value.count

  if (count < 40) {
    // 0-40 clicks: Red
    return 'rgb(239, 68, 68)' // Red
  } else if (count < 80) {
    // 40-80 clicks: Gold/Yellow
    return 'rgb(251, 191, 36)' // Gold
  } else {
    // 80+ clicks: Light Blue
    return 'rgb(96, 165, 250)' // Light Blue
  }
})

// Background ring color - darker version of the progress color
const getBackgroundRingColor = computed(() => {
  const count = fireRateState.value.count

  if (count < 40) {
    // 0-40 clicks: Dark Red
    return 'rgb(185, 28, 28)' // Dark Red
  } else if (count < 80) {
    // 40-80 clicks: Darker Gold
    return 'rgb(217, 119, 6)' // Darker Gold
  } else {
    // 80+ clicks: Blue
    return 'rgb(59, 130, 246)' // Blue
  }
})

// Reactive countdown progress that updates in real-time
const countdownProgress = ref(0)
let ticksSinceLastAttack = 0
const TICKS_BEFORE_COUNTDOWN = 3 // 3 ticks (750ms) before countdown starts
const COUNTDOWN_DURATION_TICKS = 20 // 20 ticks (5 seconds) for countdown

// Update countdown progress using tickSystem
function updateCountdownFromTick() {
  if (fireRateState.value.count > 0) {
    ticksSinceLastAttack++

    if (ticksSinceLastAttack >= TICKS_BEFORE_COUNTDOWN) {
      // Start countdown after 3 ticks of no activity
      const countdownTicks = ticksSinceLastAttack - TICKS_BEFORE_COUNTDOWN
      const maxCountdownTicks = COUNTDOWN_DURATION_TICKS

      if (countdownTicks <= maxCountdownTicks) {
        // Show countdown progress (100% to 0%)
        countdownProgress.value = Math.max(0, ((maxCountdownTicks - countdownTicks) / maxCountdownTicks) * 100)
      } else {
        // Countdown finished, reset fire rate in buffStore
        buffStore.resetFireRate()
        countdownProgress.value = 0
        ticksSinceLastAttack = 0
      }
    } else {
      // Still within the 3-tick grace period
      countdownProgress.value = 0
    }
  } else {
    // No clicks accumulated, reset everything
    ticksSinceLastAttack = 0
    countdownProgress.value = 0
  }
}

// Reset tick counter when attack happens
function resetTickCounter() {
  ticksSinceLastAttack = 0
  countdownProgress.value = 0
}

// Computed property for the final progress value to show in the ring
const finalProgressValue = computed(() => {
  const count = fireRateState.value.count

  // If no clicks, show empty ring
  if (count === 0) {
    return 0
  }

  // If countdown is active, show countdown progress
  if (countdownProgress.value > 0 && countdownProgress.value < 100) {
    return countdownProgress.value
  }

  if (count < 40) {
    // 0-40 clicks: Show progress toward 40
    return (count / 40) * 100
  } else if (count < 80) {
    // 40-80 clicks: Show progress from 40 to 80
    return ((count - 40) / 40) * 100
  } else {
    // 80+ clicks: Show progress from 80 onward (cycle every 40 clicks)
    const cyclePosition = (count - 80) % 40
    return (cyclePosition / 40) * 100
  }
})

// Fear Factor calculations
const fearFactorProgress = computed(() => {
  return gameStore.getFearFactorProgress(gameStore.currentRegion)
})

const isRegionDisabledByFear = computed(() => {
  return gameStore.isRegionDisabledByFear(gameStore.currentRegion)
})

const fearFactorTimeRemaining = computed(() => {
  const ms = gameStore.getFearFactorTimeRemaining(gameStore.currentRegion)
  return Math.ceil(ms / 1000) // Convert to seconds
})

// Select a pokeball to use
function selectPokeball(ball: InventoryItem) {
  selectedPokeball.value = ball
  showPokeballSelector.value = false
  performCapture(ball)
}


// Perform the actual capture attempt with the selected pokeball
async function performCapture(ball: InventoryItem) {
  if (!wildPokemon.value) return

  // Get the item definition for the ball from constants
  const ballDefinition = inventory.getItemDefinition(ball.id)

  if (!ballDefinition) {
    gameStore.battle.battleLogs.push({
      message: `Error: Could not find the ball definition`,
      type: 'system'
    })
    return
  }

  gameStore.battle.battleLogs.push({
    message: `Threw a ${ball.name} at ${wildPokemon.value.name}!`,
    type: 'system'
  })
  // Use the capture composable to attempt the capture
  const result = await attemptCapture(wildPokemon.value, ballDefinition)

  // Add the result message to battle logs
  if(result.success){
    gameStore.battle.battleLogs.push({
      message: result.message,
      type: 'success'
    })
  }
  else {
    gameStore.battle.battleLogs.push({
      message: `Failed to catch ${wildPokemon.value.name} with ${ball.name}.`,
      type: 'system'
    })
  }

  // If the capture was successful, clear the wild Pokemon and restart spawn timer
  if (result.success) {
    gameStore.spawnWildPokemon()
  }
}

// Handle showing the pokeball selector
function openPokeballSelector() {
  if (!wildPokemon.value) return

  // If only one type of pokeball is available, use it directly
  if (availablePokeballs.value.length === 1) {
    selectPokeball(availablePokeballs.value[0])
    return
  }

  showPokeballSelector.value = true
}

// Calculate progress percentage for a task
function getProgressPercentage(task: any) {
  const totalDuration = task.endTime - task.startTime
  const elapsed = Date.now() - task.startTime
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
}

// Handle showing the berry selector
function openBerrySelector() {
  showBerrySelector.value = true
}

// Handle showing the seeker stone selector
function openSeekerStoneSelector() {
  if (availableSeekerStones.value.length === 0) {
    gameStore.addNotification('No seeker stones available!', 'error')
    return
  }
  
  if (gameStore.currentRegion === 'Home') {
    gameStore.addNotification('Cannot use seeker stones in the Home region!', 'error')
    return
  }

  // Use the first available seeker stone
  const seekerStone = availableSeekerStones.value[0]
  seekerStoneComposable.useSeekerStone(seekerStone)
}

// Handle using dragon stone
function openDragonStoneSelector() {
  if (availableDragonStones.value.length === 0) {
    gameStore.addNotification('No dragon stones available!', 'error')
    return
  }
  
  if (gameStore.isTemporaryRegionActive) {
    gameStore.addNotification('A temporary region is already active!', 'error')
    return
  }

  // Use the first available dragon stone
  const dragonStone = availableDragonStones.value[0]
  useDragonStone(dragonStone)
}

// Use dragon stone function
function useDragonStone(dragonStone: InventoryItem) {
  // Remove the dragon stone from inventory
  inventory.getInventoryStore().removeItem(dragonStone.id, 1)
  
  // Activate the temporary region
  gameStore.consumeDragonStone()
  
  gameStore.addNotification('Dragon Stone consumed! The Ethereal Nexus portal is now open!', 'success')
}

// Select a berry to use
function selectBerry(berry: InventoryItem) {
  showBerrySelector.value = false

  const berryDefinition = inventory.getItemDefinition(berry.id)
  if (!berryDefinition) {
    gameStore.addNotification(`Error: Could not find the berry definition`, 'error')
    return
  }

  // Use the berry in the current region
  berryService.startBerryTask(berryDefinition, gameStore.currentRegion)

  // Update the active tasks list
  updateActiveTasks()
}

// Cancel a berry task
function cancelBerryTask(taskId: string) {
  berryService.cancelTask(taskId)
  updateActiveTasks()
}

// Add this function to map regions to background images
const getRegionBackgroundImage = (regionId: string) => {
  const backgroundMap: Record<string, string> = {
    'viridian-forest': '/images/backgrounds/viridian-palace.png',
    'cerulean-cave (10-15)': '/images/backgrounds/cave.png',
    // Default to viridian for other regions until more backgrounds are available
    'beach-zone (15-25)': '/images/backgrounds/beach.png',
    'Mountains (30-50)': '/images/backgrounds/mountains.png',
    'ironworks-zone': '/images/backgrounds/ironworks.png',
    'ethereal-nexus': '/images/backgrounds/etheral.png',

  }

  return backgroundMap[regionId] || '/images/backgrounds/viridian-palace.png'
}

// Update the active tasks list
function updateActiveTasks() {
  activeTasks.value = berryService.getActiveTasksForRegion(gameStore.currentRegion)
}
// Handle attack action
const attack = async () => {
  if (!wildPokemon.value || !gameStore.activePokemon) return

  // Add haptic feedback for mobile
  if (isMobile.value && 'vibrate' in navigator) {
    navigator.vibrate(50)
  }

  // Reset the tick counter since user is attacking
  resetTickCounter()

  await gameStore.attack()
}

// Mobile swipe handlers
const handleSwipeLeft = () => {
  // Swipe left to capture
  if (canCapture.value) {
    openPokeballSelector()
  }
}

const handleSwipeRight = () => {
  // Swipe right to attack
  if (wildPokemon.value && gameStore.activePokemon) {
    attack()
  }
}

const handleSwipeUp = () => {
  // Swipe up to use berry if available
  if (canUseBerry.value) {
    openBerrySelector()
  }
}

const handleSwipeDown = () => {
  // Swipe down to use seeker stone if available
  if (canUseSeekerStone.value) {
    openSeekerStoneSelector()
  }
}

// Touch handlers for better mobile experience
const handleTouchStart = (event: TouchEvent) => {
  touchStartTime.value = Date.now()
}

const handleTouchEnd = (event: TouchEvent) => {
  const touchDuration = Date.now() - touchStartTime.value
  
  // Long press detection (500ms)
  if (touchDuration > 500) {
    // Long press on wild pokemon area - show details or special action
    if (wildPokemon.value && event.target && (event.target as Element).closest('.wild-pokemon-area')) {
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
      // Could show pokemon details modal here
    }
  }
}

// Handle guaranteed capture action
const useGuaranteedCapture = () => {
  if (isMobile.value && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100])
  }
  gameStore.useGuaranteedCapture()
}

// Type colors function
const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    normal: 'bg-gray-400',
    fire: 'bg-red-500',
    water: 'bg-blue-500',
    electric: 'bg-yellow-500',
    grass: 'bg-green-500',
    ice: 'bg-blue-300',
    fighting: 'bg-red-700',
    poison: 'bg-purple-500',
    ground: 'bg-yellow-700',
    flying: 'bg-indigo-400',
    psychic: 'bg-pink-500',
    bug: 'bg-green-600',
    rock: 'bg-yellow-600',
    ghost: 'bg-purple-700',
    dragon: 'bg-indigo-700',
    dark: 'bg-gray-700',
    steel: 'bg-gray-500',
    fairy: 'bg-pink-400'
  }
  return colors[type.toLowerCase()] || 'bg-gray-400'
}

// Handle auto-attack toggle
const toggleAutoAttack = () => {
  buffStore.toggleAutoAttack()
}

// Handle region change
const handleRegionChange = () => {
  // Reset encounter when region changes
  gameStore.resetBattleState()
  gameStore.startSpawnTimer()

  // Update active berry tasks when region changes
  updateActiveTasks()
}

// Watch for auto-attack triggers
watch(() => buffStore.autoAttackState.triggerAttack, (shouldAttack) => {
  if (shouldAttack && wildPokemon.value && gameStore.activePokemon) {
    attack()
    buffStore.recordAutoAttack()
  }
})

// Watch for fire rate state changes to reset countdown when fire rate is reset
watch(() => fireRateState.value.count, (newCount) => {
  if (newCount === 0) {
    // Fire rate was reset, clear countdown
    ticksSinceLastAttack = 0
    countdownProgress.value = 0
  }
})

const ENEMY_ATTACK_INTERVAL = 3000; // 3 seconds in milliseconds
const POKEMON_RUN_CHECK_INTERVAL = 20000; // 20 seconds in milliseconds
let enemyAttackAccumulator = 0;
let pokemonRunAccumulator = 0;

workerTimer.subscribe('explore.vue', (elapsed: number) => {
  updateActiveTasks();
  
  // Update countdown progress for fire rate
  updateCountdownFromTick();

  // Update temporary region timer
  gameStore.updateTemporaryRegionTimer();

  // Accumulate time for enemy attacks
  if (gameStore.battle.wildPokemon) {
    enemyAttackAccumulator += elapsed;
    if (enemyAttackAccumulator >= ENEMY_ATTACK_INTERVAL) {
      gameStore.enemyAttack();
      enemyAttackAccumulator -= ENEMY_ATTACK_INTERVAL; // Maintain precision
    }

    // Accumulate time for Pokemon run attempts
    pokemonRunAccumulator += elapsed;
    if (pokemonRunAccumulator >= POKEMON_RUN_CHECK_INTERVAL) {
      gameStore.tryPokemonRun();
      pokemonRunAccumulator -= POKEMON_RUN_CHECK_INTERVAL; // Maintain precision
    }
  } else {
    // Reset accumulators when no wild Pokemon
    enemyAttackAccumulator = 0;
    pokemonRunAccumulator = 0;
  }
})

// Computed properties for UI visibility and state
const shouldShowFireRateCounter = computed(() => {
  const fireEmblemBuff = buffStore.getBuffById('fire-emblem')
  if (!fireEmblemBuff) return false

  // Show counter when active OR when building and has at least 1 attack
  return fireRateState.value.active || (fireRateState.value.count > 0 && !fireRateState.value.active)
})

// Temporary region countdown
const temporaryRegionProgress = computed(() => {
  if (!gameStore.isTemporaryRegionActive) return 0
  const remaining = gameStore.temporaryRegionRemainingTime
  const total = 600000 // 10 minutes in milliseconds
  return ((total - remaining) / total) * 100
})

const temporaryRegionTimeFormatted = computed(() => {
  if (!gameStore.isTemporaryRegionActive) return ''
  const remaining = gameStore.temporaryRegionRemainingTime
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Fire rate button variants for the CircularActionButton component
const getAttackButtonVariant = computed(() => {
  if (fireRateState.value.active) {
    switch (fireRateState.value.tier) {
      case 1: return 'electric'
      case 2: return 'fire'
      case 3: return 'water'
      default: return 'attack'
    }
  }
  return 'attack'
})

const getFireRateBadgeVariant = computed(() => {
  if (!fireRateState.value.active) return 'error'
  switch (fireRateState.value.tier) {
    case 1: return 'warning'
    case 2: return 'warning'
    case 3: return 'active'
    default: return 'default'
  }
})

const getFireRateBottomVariant = computed(() => {
  switch (fireRateState.value.tier) {
    case 1: return 'yellow'
    case 2: return 'orange'
    case 3: return 'purple'
    default: return 'yellow'
  }
})

const getFireRateEffectVariant = computed(() => {
  switch (fireRateState.value.tier) {
    case 1: return 'electric'
    case 2: return 'fire'
    case 3: return 'water'
    default: return 'fire'
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 p-2 sm:p-6">
    <!-- Mobile-first container -->
    <div class="max-w-md mx-auto lg:max-w-4xl">
      
      <!-- Header Section - Compact on mobile -->
      <div class="mb-4 space-y-3">
        <!-- XP Bar and Buffs Section -->
        <div v-if="gameStore.activePokemon" class="space-y-2">
          <!-- Temporary Region Countdown -->
          <div v-if="gameStore.isTemporaryRegionActive" class="w-full">
            <div class="bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 rounded-lg p-3 border-2 border-yellow-400 shadow-lg">
              <div class="flex items-center justify-between mb-2">
                <div class="text-white font-bold flex items-center text-sm">
                  <span class="mr-2">✨</span>
                  <span class="hidden sm:inline">Ethereal Nexus Portal Active</span>
                  <span class="sm:hidden">Portal Active</span>
                </div>
                <div class="text-yellow-300 font-mono font-bold text-sm">
                  {{ temporaryRegionTimeFormatted }}
                </div>
              </div>
              <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-red-500 to-purple-500 transition-all duration-1000 ease-linear rainbow-glow"
                  :style="{ width: `${temporaryRegionProgress}%` }"
                ></div>
              </div>
              <div class="text-xs text-gray-300 mt-1 text-center">
                <span class="hidden sm:inline">Portal will close when time expires</span>
                <span class="sm:hidden">Portal closing soon</span>
              </div>
            </div>
          </div>

          <!-- XP Bar with full width -->
          <XPBar class="w-full" :experience="gameStore.activePokemon.experience!"
            :experienceToNextLevel="gameStore.activePokemon.experienceToNextLevel!"
            :level="gameStore.activePokemon.level!" />
          
          <!-- BuffDisplay positioned below XPBar -->
          <BuffDisplay class="w-full" />
        </div>
      
        <!-- Pokemon Selection Warning -->
        <div v-if="!gameStore.activePokemon && gameStore.hasAnyHealthyPokemon()"
          class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded text-sm">
          <span class="hidden sm:inline">Please pick a Pokemon to continue searching</span>
          <span class="sm:hidden">Pick a Pokemon to explore</span>
        </div>

        <!-- Region Selection - Mobile optimized -->
        <div class="bg-white rounded-lg p-3 shadow">
          <select v-model="gameStore.currentRegion" @change="handleRegionChange"
            class="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option v-for="(region, id) in regions" :key="id" :value="id">
              {{ region.name }} ({{ region.minLevel }}-{{ region.maxLevel }})
            </option>
          </select>
        </div>

        <!-- Zone Status Bar - Mobile friendly -->
        <div class="bg-white rounded-lg p-3 shadow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2" :class="{
          'border-l-4 border-green-500': gameStore.currentRegion === 'Home'
        }">
          <div class="flex-1">
            <div class="font-bold text-gray-800 text-sm">{{ gameStore.currentRegionData.name }}</div>
            <div v-if="gameStore.currentRegion !== 'Home'" class="text-xs text-gray-500">
              Encounter: {{ gameStore.currentRegionData.encounterRate }}%
            </div>
          </div>
          
          <div class="flex items-center justify-between sm:justify-end gap-3">
            <!-- Status indicator -->
            <div v-if="!wildPokemon && gameStore.currentRegion === 'Home'" 
              class="text-xs text-green-700 font-medium flex items-center">
              <span class="mr-1">🏠</span>
              <span class="hidden sm:inline">Ready for adventure!</span>
              <span class="sm:hidden">Ready!</span>
            </div>
            <div v-else-if="!wildPokemon && gameStore.currentRegion !== 'Home'" 
              class="text-xs text-gray-600">
              Next: {{ Math.ceil(spawnTimer) ?? '...' }}s
            </div>
            
            <!-- Pokeball count -->
            <div class="bg-red-100 px-2 py-1 rounded-full text-xs text-red-600 font-medium">
              <span class="mr-1">🔴</span>{{ totalPokeballs }}
              <span class="hidden sm:inline"> Pokéballs</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Battle Area - Mobile-first horizontal layout -->
      <div 
        ref="battleAreaRef"
        class="space-y-4"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <!-- Pokemon Battle Display - Horizontal layout for mobile -->
        <PokemonBattleDisplay
          :activePokemon="gameStore.activePokemon"
          :wildPokemon="wildPokemon"
          :hasAnyHealthyPokemon="gameStore.hasAnyHealthyPokemon()"
          :isPlayerAttacking="isPlayerAttacking"
          :isWildPokemonHurt="isWildPokemonHurt"
          :isEnemyAttacking="isEnemyAttacking"
          :isTryingCatch="isTryingCatch"
          :currentRegion="gameStore.currentRegion"
          :fearFactorProgress="fearFactorProgress"
          :isRegionDisabledByFear="isRegionDisabledByFear"
          :fearFactorTimeRemaining="fearFactorTimeRemaining"
          :getRegionBackgroundImage="getRegionBackgroundImage"
        />

        <!-- Battle Controls - Mobile optimized -->
        <div class="bg-white rounded-lg shadow-lg p-4">
          <!-- Auto-attack toggle (if available) -->
          <div v-if="buffStore.canAutoAttack" class="mb-4">
            <button @click="toggleAutoAttack"
              class="w-full py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 overflow-hidden flex items-center justify-center font-medium text-sm"
              :class="{
                'bg-yellow-600 shadow-lg': buffStore.autoAttackState.active,
                'bg-yellow-500': !buffStore.autoAttackState.active
              }">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clip-rule="evenodd" />
              </svg>
              <span>{{ buffStore.autoAttackState.active ? 'Auto-Attack: ON' : 'Auto-Attack: OFF' }}</span>
              <span v-if="buffStore.autoAttackState.active"
                class="ml-2 text-xs bg-yellow-400 px-2 py-1 rounded-full text-yellow-900">
                {{ (buffStore.getAutoAttackInterval / 1000).toFixed(1) }}s
              </span>
            </button>
          </div>

          <!-- Main Action Buttons - Mobile layout -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Attack Button -->
            <div class="col-span-2 flex justify-center">
              <CircularActionButton
                :disabled="!wildPokemon"
                :variant="getAttackButtonVariant"
                :show-progress-ring="true"
                :progress-value="finalProgressValue"
                :progress-ring-color="getProgressRingColor"
                :background-ring-color="getBackgroundRingColor"
                :badge="shouldShowFireRateCounter ? fireRateState.count : undefined"
                :badge-variant="getFireRateBadgeVariant"
                :bottom-indicator="fireRateState.active ? `${fireRateState.multiplier.toFixed(1)}x XP` : undefined"
                :bottom-indicator-variant="getFireRateBottomVariant"
                :show-effect-overlay="fireRateState.active"
                :effect-variant="getFireRateEffectVariant"
                :animate="fireRateState.active ? 'pulse' : undefined"
                @click="attack"
              >
                <template #icon>
                  <svg fill="#eee" viewBox="0 0 256 256" width="50" height="20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M221.65723,34.34326A8.00246,8.00246,0,0,0,216,32h-.02539l-63.79883.20117A8.00073,8.00073,0,0,0,146.0332,35.106L75.637,120.32275,67.31348,111.999A16.02162,16.02162,0,0,0,44.68555,112L32.001,124.68555A15.99888,15.99888,0,0,0,32,147.31348l20.88672,20.88769L22.94531,198.14258a16.01777,16.01777,0,0,0,.001,22.62695l12.28418,12.28418a16.00007,16.00007,0,0,0,22.62793,0L87.79883,203.1123,108.68652,224.001A16.02251,16.02251,0,0,0,131.31445,224L143.999,211.31445A15.99888,15.99888,0,0,0,144,188.68652l-8.32324-8.32324,85.21679-70.39648a8.00125,8.00125,0,0,0,2.90528-6.14258L224,40.02539A8.001,8.001,0,0,0,221.65723,34.34326Zm-13.84668,65.67822-83.49829,68.97706L111.314,156l54.34327-54.34277a8.00053,8.00053,0,0,0-11.31446-11.31446L100,144.686,87.00195,131.6875,155.97852,48.189l51.99609-.16357Z"></path>
                  </svg>
                </template>
              </CircularActionButton>
            </div>

            <!-- Secondary Actions -->
            <ActionButtonsMobile 
              class="col-span-2"
              :canCapture="canCapture"
              :canUseBerry="canUseBerry"
              :canUseSeekerStone="canUseSeekerStone"
              :canUseDragonStone="canUseDragonStone"
              :pokeballCount="totalPokeballs"
              :berryCount="berryCount"
              :seekerStoneCount="seekerStoneCount"
              :dragonStoneCount="dragonStoneCount"
              @capture="openPokeballSelector"
              @berry="openBerrySelector"
              @seeker-stone="openSeekerStoneSelector"
              @dragon-stone="openDragonStoneSelector"
            />
          </div>

          <!-- Mobile Swipe Instructions -->
          <div class="mt-4 text-center text-xs text-gray-500 sm:hidden">
            <div class="bg-gray-50 rounded p-2">
              <div class="font-medium mb-1">Quick Actions:</div>
              <div class="grid grid-cols-2 gap-1 text-xs">
                <div>← Swipe to Capture</div>
                <div>→ Swipe to Attack</div>
                <div>↑ Swipe for Berry</div>
                <div>↓ Swipe for Stone</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Wild Pokemon Area - Mobile optimized -->
        <div class="wild-pokemon-area bg-white rounded-lg shadow-lg overflow-hidden">
          <div v-if="wildPokemon" class="relative">
            <!-- Fear Factor Indicator -->
            <div class="absolute left-2 top-2 bottom-2 w-3 flex flex-col items-center z-20">
              <div class="text-red-600 mb-1 text-sm">💀</div>
              <div class="flex-1 w-3 bg-gray-300 rounded-full relative overflow-hidden">
                <div 
                  class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-red-400 rounded-full transition-all duration-500"
                  :style="{ height: fearFactorProgress + '%' }"
                ></div>
              </div>
            </div>
            
            <div class="p-4 pl-8">
              <div class="text-center mb-3">
                <div class="text-sm font-bold text-red-800 mb-2">Wild Pokémon</div>
                
                <!-- Pokemon Image with Background -->
                <div class="relative h-40 sm:h-48 overflow-hidden rounded-lg mb-3 mx-auto max-w-xs">
                  <img :src="getRegionBackgroundImage(gameStore.currentRegion)" alt="Region Background"
                    class="absolute inset-0 w-full h-full object-cover opacity-80" />
                  <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 z-10">
                    <CachedImage 
                      :pokemonId="wildPokemon.id" 
                      :shiny="wildPokemon.isShiny" 
                      :alt="'Wild Pokemon'" 
                      :className="`w-full h-full transition-transform duration-200 ${isWildPokemonHurt ? 'animate-damage' : ''} ${isEnemyAttacking ? 'animate-enemy-attack' : ''} ${isTryingCatch ? 'animate-catch' : ''}`" 
                    />
                  </div>
                </div>
                
                <!-- Type Tags -->
                <div class="flex justify-center gap-1 mb-3">
                  <span v-for="type in wildPokemon.types" :key="type" 
                    class="px-2 py-1 rounded-full text-xs text-white font-medium" :class="getTypeColor(type)">
                    {{ type }}
                  </span>
                </div>
                
                <!-- Pokemon Info -->
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="flex justify-between items-center mb-2 text-sm">
                    <div class="font-medium capitalize">{{ wildPokemon.name }}</div>
                    <div class="flex items-center gap-2">
                      <span class="bg-gray-200 px-2 py-1 rounded-full text-xs">
                        Lvl {{ wildPokemon.level }}
                      </span>
                      <span class="text-xs">{{ wildPokemon.currentHP }}/{{ wildPokemon.maxHP }}</span>
                    </div>
                  </div>
                  
                  <!-- HP Bar -->
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="h-3 rounded-full transition-all duration-300" :class="{
                      'bg-green-500': (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 > 25,
                      'bg-yellow-500': (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 <= 25 && (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 > 10,
                      'bg-red-500': (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 <= 10
                    }" :style="{ width: ((wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Home Region Display -->
          <div v-else-if="gameStore.currentRegion === 'Home'" class="p-4">
            <div class="text-center">
              <div class="text-sm font-bold text-green-800 mb-3">🏠 Safe Haven</div>
              <div class="relative h-32 sm:h-40 overflow-hidden rounded-lg mb-3 bg-gradient-to-b from-green-100 to-green-200 flex items-center justify-center mx-auto max-w-xs">
                <img src="/images/home.png" alt="House to relax" class="max-h-full max-w-full object-contain"/>
              </div>
              <div class="text-center text-sm text-green-700 space-y-2">
                <p class="flex items-center justify-center gap-1">
                  <span>🌿</span>
                  <span class="hidden sm:inline">A peaceful place where your Pokémon can rest.</span>
                  <span class="sm:hidden">Your Pokémon can rest here.</span>
                </p>
                <p class="text-xs text-green-600 bg-green-100 p-2 rounded-lg">
                  <span class="font-medium">Ready for adventure?</span> 
                  <span class="hidden sm:inline">Head to <strong>Viridian Forest</strong>!</span>
                  <span class="sm:hidden">Select <strong>Viridian Forest</strong> above!</span>
                </p>
              </div>
            </div>
          </div>
          
          <!-- Other Regions - No Pokemon -->
          <div v-else class="p-4" :class="{
            'bg-red-50': isRegionDisabledByFear
          }">
            <!-- Fear Factor Indicator -->
            <div class="absolute left-2 top-2 bottom-2 w-3 flex flex-col items-center z-20">
              <div class="mb-1 text-sm" :class="{
                'text-red-600': fearFactorProgress > 0,
                'text-gray-400': fearFactorProgress === 0
              }">💀</div>
              <div class="flex-1 w-3 bg-gray-300 rounded-full relative overflow-hidden">
                <div 
                  class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-red-400 rounded-full transition-all duration-500"
                  :style="{ height: fearFactorProgress + '%' }"
                ></div>
              </div>
            </div>
            
            <div class="flex items-center justify-center text-center py-8 pl-6">
              <div>
                <div class="text-2xl mb-2">
                  {{ isRegionDisabledByFear ? '😨' : '🔍' }}
                </div>
                <div class="text-sm text-gray-600">
                  <span v-if="isRegionDisabledByFear" class="text-red-600 font-medium">
                    Pokemon are too frightened!<br>
                    <span class="text-xs">Return in {{ fearFactorTimeRemaining }}s</span>
                  </span>
                  <span v-else>
                    No wild Pokémon found...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Battle Log - Collapsible on mobile -->
      <div class="mt-4">
        <BattleLog :logs="gameStore.battle.battleLogs" />
      </div>
    </div>

    <!-- Modals -->
    <!-- Berry Selector Modal -->
    <div v-if="showBerrySelector" class="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div class="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-md max-h-[80vh] overflow-y-auto">
        <div class="p-4 sm:p-6">
          <h3 class="text-lg font-bold mb-4">Select a Berry</h3>

          <div v-if="availableBerries.length === 0" class="text-center py-8 text-gray-500">
            <div class="text-2xl mb-2">🫐</div>
            <div class="text-sm">No auto-catch berries available</div>
          </div>

          <div v-else class="space-y-3">
            <div v-for="berry in availableBerries" :key="berry.id"
              class="border rounded-lg p-3 flex items-center hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
              @click="selectBerry(berry)">
              <div class="w-12 h-12 flex-shrink-0 mr-3 bg-gray-100 rounded-lg overflow-hidden">
                <img :src="berry.icon" :alt="berry.name" class="w-full h-full object-contain" @error="(e: Event) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/berry.png';
                }">
              </div>

              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ berry.name }} 
                  <span class="text-gray-500">({{ berry.quantity }})</span>
                </div>
                <div class="text-xs text-gray-600 mt-1">{{ berry.description }}</div>
              </div>
            </div>
          </div>

          <button @click="showBerrySelector = false"
            class="mt-4 w-full py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Pokemon Selection Modal for Seeker Stone -->
    <PokemonSelectionModal 
      :isVisible="seekerStoneComposable.isModalVisible.value"
      :pokemonChoices="seekerStoneComposable.pokemonChoices.value"
      :currentRegion="seekerStoneComposable.currentRegion.value"
      :minLevel="seekerStoneComposable.minLevel.value"
      :maxLevel="seekerStoneComposable.maxLevel.value"
      @select="seekerStoneComposable.selectPokemon"
      @cancel="seekerStoneComposable.cancelSelection"
    />
  </div>
</template>

<style scoped>
.animate-attack {
  animation: attack 0.2s ease-in-out;
}

.animate-damage {
  animation: damage 0.3s ease-in-out;
}

.animate-enemy-attack {
  animation: enemy-attack 0.2s ease-in-out;
}

.animate-catch {
  animation: catch-attempt 1s ease-in-out;
}

@keyframes attack {
  0% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(20px);
  }

  100% {
    transform: translateX(0);
  }
}

@keyframes damage {
  0% {
    transform: translateX(0);
    filter: none;
  }

  50% {
    transform: translateX(20px);
    filter: sepia(1) saturate(100%) hue-rotate(-50deg) opacity(0.5);
  }

  100% {
    transform: translateX(0);
    filter: none;
  }
}

@keyframes enemy-attack {
  0% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-20px);
  }

  100% {
    transform: translateX(0);
  }
}

@keyframes catch-attempt {
  0% {
    transform: scale(1) translateX(0);
  }

  25% {
    transform: scale(1.2) translateX(0);
  }

  50% {
    transform: scale(0.8) translateX(100px);
  }

  75% {
    transform: scale(0.6) translateX(0);
  }

  100% {
    transform: scale(1) translateX(0);
  }
}

/* Fire rate button tier styles */
.fire-rate-button-tier-1 {
  background: linear-gradient(to bottom, #f59e0b, #d97706);
  box-shadow: 0 0 15px rgba(252, 211, 77, 0.7);
  border: 1px solid #f59e0b;
}

.fire-rate-button-tier-1 .fire-button-overlay {
  background: radial-gradient(circle, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 25%, rgba(252, 211, 77, 0.5) 75%, rgba(252, 211, 77, 0) 100%);
  animation: fire-effect 1.2s infinite;
}

.fire-rate-button-tier-2 {
  background: linear-gradient(to bottom, #ef4444, #b91c1c);
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
  border: 1px solid #ef4444;
}

.fire-rate-button-tier-2 .fire-button-overlay {
  background: radial-gradient(circle, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 25%, rgba(239, 68, 68, 0.6) 75%, rgba(239, 68, 68, 0) 100%);
  animation: fire-effect 0.9s infinite;
}

.fire-rate-button-tier-3 {
  background: linear-gradient(to bottom, #2563eb, #1d4ed8);
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.8);
  border: 1px solid #2563eb;
}

.fire-rate-button-tier-3 .fire-button-overlay {
  background: radial-gradient(circle, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 25%, rgba(96, 165, 250, 0.7) 75%, rgba(96, 165, 250, 0) 100%);
  animation: fire-effect 0.6s infinite;
}

/* Fire rate counter styles */
.fire-rate-counter {
  animation: pulse 1s infinite alternate;
  z-index: 10;
}

@keyframes pulse {
  0% {
    transform: translateX(-50%) scale(1);
  }

  100% {
    transform: translateX(-50%) scale(1.1);
  }
}

/* Cursor counter for fire rate */
#fire-rate-cursor-counter {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  transform: translate(-50%, -100%);
  margin-top: -15px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  transition: opacity 0.2s ease;
}

/* Rainbow glow effect for temporary region countdown */
.rainbow-glow {
  animation: rainbow-animation 3s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

@keyframes rainbow-animation {
  0% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(180deg); }
  100% { filter: hue-rotate(360deg); }
}
</style>