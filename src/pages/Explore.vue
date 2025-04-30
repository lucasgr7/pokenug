<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePokemon } from '@/composables/usePokemon'
import { useInventory } from '@/composables/useInventory'
import { usePokemonCapture } from '@/composables/usePokemonCapture'
import { berryService } from '@/services/berryService'
import BattleLog from '@/components/BattleLog.vue'
import XPBar from '@/components/XPBar.vue'
import BerryIcon from '@/components/BerryIcon.vue'
import CachedImage from '@/components/CachedImage.vue'
import type { InventoryItem } from '@/types/pokemon'
import regions from '@/constants/regions'
import { useBuffStore } from '@/stores/buffStore'
import BuffDisplay from '@/components/BuffDisplay.vue'
import { tickSystem } from '@/services/tickSystem'

// Store and Pokemon data
const gameStore = useGameStore()
const buffStore = useBuffStore()
const { findById } = usePokemon()
const inventory = useInventory()
const { attemptCapture, isTryingCatch } = usePokemonCapture()
const showPokeballSelector = ref(false)
const showBerrySelector = ref(false)
const activeTasks = ref<any[]>([])
const wildPokemon = computed(() => gameStore.battle.wildPokemon)
const isPlayerAttacking = computed(() => gameStore.battle.isPlayerAttacking)
const isWildPokemonHurt = computed(() => gameStore.battle.isWildPokemonHurt)
const isEnemyAttacking = computed(() => gameStore.battle.isEnemyAttacking)
const recoveryProgress = ref(0)

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

// Fire rate state from buffStore
const fireRateState = computed(() => buffStore.getFireRateState)


// HP calculations
const hpPercentage = computed(() => {
  if (!gameStore.activePokemon?.currentHP || !gameStore.activePokemon?.maxHP) return 0
  return (gameStore.activePokemon.currentHP / gameStore.activePokemon.maxHP) * 100
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
  gameStore.battle.battleLogs.push({
    message: result.message,
    type: 'system'
  })
  
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


// Get potential Pokémon that could be caught from a region's berry pool
function getPotentialPokemon(regionId: string) {
  const region = regions[regionId as keyof typeof regions]
  if (!region) return []
  
  // Use the berry pool if available, otherwise use the regular pool
  const pool = region.berryPool || region.pool
  
  // Calculate total probability for percentage calculation
  const totalProbability = pool.reduce((sum, pokemon) => sum + (pokemon.probability || 1), 0)
  
  // Return formatted list with percentages
  return pool.map(pokemon => ({
    id: pokemon.id,
    name: pokemon.name,
    probability: (pokemon.probability / totalProbability) * 100
  }))
}

// Handle showing the berry selector
function openBerrySelector() {
  showBerrySelector.value = true
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

// Get remaining time for a berry task
function getRemainingTime(taskId: string) {
  return berryService.getRemainingTime(taskId)
}

// Format remaining time to human-readable string
function formatRemainingTime(ms: number) {
  const minutes = Math.floor(ms / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  
  return `${minutes}m ${seconds}s`
}

// Format time with milliseconds, preventing negative values
function formatTimeWithMs(ms: number) {
  // Ensure we don't have negative values
  ms = Math.max(0, ms);
  
  const seconds = Math.floor((ms / 1000) % 60)
  const milliseconds = Math.floor(ms % 1000)
  return `${seconds}s ${milliseconds}ms`
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
    'ironworks-zone (80-120)': '/images/backgrounds/ironworks.png',

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
  await gameStore.attack()
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
  const isActive = buffStore.toggleAutoAttack()
  if (isActive) {
    gameStore.addNotification(
      `Auto-Attack activated! Pokemon will attack every ${(buffStore.getAutoAttackInterval / 1000).toFixed(1)} seconds.`,
      'success',
    )
  }
}

// Handle region change
const handleRegionChange = () => {
  // Reset encounter when region changes
  gameStore.resetBattleState()
  gameStore.startSpawnTimer()
  
  // Update active berry tasks when region changes
  updateActiveTasks()
}

// Get region name from region ID
function getRegionName(regionId: string) {
  return regions[regionId as keyof typeof regions]?.name || regionId
}
// Watch for auto-attack triggers
watch(() => buffStore.autoAttackState.triggerAttack, (shouldAttack) => {
  if (shouldAttack && wildPokemon.value && gameStore.activePokemon) {
    attack()
    buffStore.recordAutoAttack()
  }
})

// Watch for wild Pokemon changes to start enemy attacks
watch(() => gameStore.battle.wildPokemon, (newPokemon) => {
  if (newPokemon) {
    setInterval(() => {
    }, 5000)
  }
})

const THREE_SECONDS = 3;
const TWENTY_SECONDS = 20;
let accumulatedTime = 0;

tickSystem.subscribe(() => {
  updateActiveTasks();

  accumulatedTime++;
  if (gameStore.battle.wildPokemon && (accumulatedTime % THREE_SECONDS === 0)) {
    accumulatedTime = 0;
    gameStore.enemyAttack()
  }

  if (gameStore.battle.wildPokemon && (accumulatedTime % TWENTY_SECONDS === 0)) {
    gameStore.tryPokemonRun()
  }
})
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <!-- XP Bar and Buffs Section - Modified layout -->
    <div v-if="gameStore.activePokemon" class="mb-4 flex flex-col gap-2">
      <!-- XP Bar with full width -->
      <XPBar
        class="w-full"
        :experience="gameStore.activePokemon.experience!"
        :experienceToNextLevel="gameStore.activePokemon.experienceToNextLevel!"
        :level="gameStore.activePokemon.level!"
      />
      <!-- BuffDisplay positioned below XPBar -->
      <BuffDisplay class="w-full" />
    </div>

    <!-- Add warning message -->
    <div v-if="!gameStore.activePokemon && gameStore.hasAnyHealthyPokemon()" 
         class="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
      Please pick a Pokemon to continue searching
    </div>

    <!-- Rest of the template -->
    <!-- Region Selection -->
    <div class="mb-4">
      <select 
        v-model="gameStore.currentRegion"
        @change="handleRegionChange"
        class="px-4 py-2 border rounded-lg bg-gray-50"
      >
        <option
          v-for="(region, id) in regions"
          :key="id"
          :value="id"
        >
          {{ region.name }} (Lvl {{ region.minLevel }}-{{ region.maxLevel }})
        </option>
      </select>
    </div>

    <!-- Zone Status Bar -->
    <div class="mb-4 bg-gray-100 p-3 rounded-lg flex justify-between items-center">
      <div>
        <span class="font-bold text-gray-700">{{ gameStore.currentRegionData.name }}</span>
        <span class="text-sm text-gray-500 ml-2">Encounter Rate: {{ gameStore.currentRegionData.encounterRate }}%</span>
      </div>
      <div v-if="!wildPokemon" class="text-sm text-gray-600">
        Next spawn in: {{ spawnTimer }}s
      </div>
      <div class="bg-red-100 px-3 py-1 rounded-full text-red-600">
        <span class="mr-1">🔴</span>{{ totalPokeballs }} Pokéballs
      </div>
    </div>

    <!-- Berry Tasks Display - Grid layout -->
    <div v-if="activeTasks.length > 0" class="mb-4 bg-green-50 p-3 rounded-lg">
      <h3 class="font-semibold text-green-700 mb-2">Active Berry Tasks</h3>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <div 
          v-for="task in activeTasks" 
          :key="task.id" 
          class="border border-green-100 rounded-md p-2 bg-white"
        >
          <!-- Berry header with icon and info -->
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <BerryIcon
                :berry="task.berryId"
                size="sm"
                :name="task.berryName"
                with-border
              />
              <div class="ml-2">
                <div class="font-medium text-sm">{{ task.berryName }}</div>
                <div class="text-xs text-gray-500">{{ getRegionName(task.regionId) }}</div>
              </div>
            </div>
            <button 
              @click="cancelBerryTask(task.id)" 
              class="text-red-400 hover:text-red-600 text-sm p-1"
              title="Cancel task"
            >
              &times;
            </button>
          </div>
          
          <!-- Progress bar and time -->
          <div class="space-y-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-amber-700 font-medium">{{ formatRemainingTime(getRemainingTime(task.id)) }}</span>
              <span class="text-gray-500">{{ Math.round(getProgressPercentage(task)) }}%</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-1.5">
              <div
                class="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: getProgressPercentage(task) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Potential catches - collapsible section -->
          <div class="mt-2">
            <details class="text-xs">
              <summary class="text-gray-600 cursor-pointer">Potential catches</summary>
              <div class="pt-1 flex flex-wrap gap-1">
                <span 
                  v-for="pokemon in getPotentialPokemon(task.regionId).slice(0, 5)" 
                  :key="pokemon.id"
                  class="px-1.5 py-0.5 bg-gray-100 rounded-full inline-flex items-center"
                >
                  {{ pokemon.name }}
                  <span class="ml-1 text-gray-500 text-[10px]">({{ Math.round(pokemon.probability) }}%)</span>
                </span>
                <span 
                  v-if="getPotentialPokemon(task.regionId).length > 5" 
                  class="px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-500"
                >
                  +{{ getPotentialPokemon(task.regionId).length - 5 }} more
                </span>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <!-- Battle Area -->
    <div class="grid grid-cols-3 gap-4">
      <!-- Player Pokemon Panel -->
      <div v-if="!gameStore.activePokemon && gameStore.hasAnyHealthyPokemon()" 
           class="bg-blue-50 p-4 rounded-lg shadow flex items-center justify-center text-gray-500">
        Select a Pokemon from your team
      </div>
      <div v-else-if="gameStore?.activePokemon" class="bg-blue-50 p-4 rounded-lg shadow">
        <div class="text-center mb-2 font-bold">Your Pokémon</div>
        <div class="relative">
          <CachedImage
            :src="gameStore?.activePokemon?.sprite ?? ''"
            :alt="'Player Pokemon'"
            :className="`w-32 h-32 mx-auto transition-transform duration-200 ${isPlayerAttacking ? 'animate-attack' : ''}`"
          />
          <!-- Type Tags -->
          <div class="flex justify-center gap-2 my-2">
            <span
              v-for="type in gameStore.activePokemon.types"
              :key="type"
              class="px-2 py-1 rounded-full text-xs text-white"
              :class="getTypeColor(type)"
            >
              {{ type }}
            </span>
          </div>
          <!-- HP Bar and Level -->
          <div class="mt-2">
            <div class="text-sm text-gray-700 flex justify-between items-center">
              <div>
                <span class="capitalize">{{ gameStore.activePokemon.name }}</span>
                <span class="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">Lvl {{ gameStore.activePokemon.level }}</span>
              </div>
              <span>{{ gameStore.activePokemon.currentHP }}/{{ gameStore.activePokemon.maxHP }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div
                class="h-2.5 rounded-full transition-all duration-300"
                :class="{
                  'bg-green-600': hpPercentage > 25,
                  'bg-yellow-500': hpPercentage <= 25 && hpPercentage > 10,
                  'bg-red-500': hpPercentage <= 10
                }"
                :style="{ width: hpPercentage + '%' }"
              ></div>
            </div>
          </div>
          <!-- HP Recovery Bar (if needed) -->
          <div v-if="isRecovering" class="mt-1">
            <div class="w-full bg-gray-200 rounded-full h-1">
              <div
                class="bg-blue-400 h-1 rounded-full transition-all duration-300"
                :style="{ width: recoveryProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Battle Controls with Fire Rate Effects -->
      <div class="flex flex-col justify-center items-center space-y-4 relative">
        <!-- Auto-attack toggle button (shown when Electric Emblem is active) -->
        <button
          v-if="buffStore.canAutoAttack"
          @click="toggleAutoAttack"
          class="relative px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 overflow-hidden flex items-center"
          :class="{
            'bg-yellow-600': buffStore.autoAttackState.active,
            'bg-yellow-500': !buffStore.autoAttackState.active
          }"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
          </svg>
          <span class="relative z-10">{{ buffStore.autoAttackState.active ? 'Auto-Attack: ON' : 'Auto-Attack: OFF' }}</span>
          <!-- If auto-attack is active, show the interval -->
          <span v-if="buffStore.autoAttackState.active" class="ml-2 text-xs bg-yellow-400 px-2 py-0.5 rounded-full text-yellow-900">
            {{ (buffStore.getAutoAttackInterval / 1000).toFixed(1) }}s
          </span>
        </button>
        
        <!-- Attack Button with Fire Effects -->
        <button
          @click="attack"
          :disabled="!wildPokemon"
          class="relative px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 overflow-hidden"
          :class="{
            'fire-rate-button-tier-1': fireRateState.active && fireRateState.tier === 1,
            'fire-rate-button-tier-2': fireRateState.active && fireRateState.tier === 2,
            'fire-rate-button-tier-3': fireRateState.active && fireRateState.tier === 3
          }"
        >
          <span class="relative z-10">Attack</span>
          <!-- Fire Effect Overlay -->
          <div v-if="fireRateState.active" class="fire-button-overlay"></div>
        </button>
        
        <!-- Fire Rate Counter with dynamic time display and milliseconds -->
        <div v-if="fireRateState.active" class="fire-rate-counter absolute -top-8 left-1/2 transform -translate-x-1/2">
          <div class="flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold shadow-lg"
            :class="{
              'bg-yellow-100 text-yellow-800': fireRateState.tier === 1,
              'bg-red-100 text-red-800': fireRateState.tier === 2,
              'bg-blue-100 text-blue-800': fireRateState.tier === 3
            }">
            <span>Fire Rate: {{ fireRateState.count }}</span>
            <span class="ml-1">
              ({{ formatTimeWithMs(fireRateState.timeAllowed - (Date.now() - fireRateState.lastAttackTime)) }})
            </span>
          </div>
        </div>

        <button
          @click="openPokeballSelector"
          :disabled="!wildPokemon || totalPokeballs <= 0"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Try Capture
        </button>
        
        <!-- New Berry Button -->
        <button
          @click="openBerrySelector"
          class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Use Berry
        </button>
      </div>

      <!-- Wild Pokemon Panel -->
      <div v-if="wildPokemon" class="bg-red-50 p-4 rounded-lg shadow">
        <div class="text-center mb-2 font-bold">Wild Pokémon</div>
        <div class="relative h-48 overflow-hidden rounded-lg mb-2">
          <!-- Background image based on region -->
          <img 
            :src="getRegionBackgroundImage(gameStore.currentRegion)"
            alt="Region Background"
            class="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <!-- Pokemon container with fixed position -->
          <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 z-10">
            <!-- Pokemon image inside container -->
            <CachedImage
              :src="wildPokemon.sprite"
              :alt="'Wild Pokemon'"
              :className="`w-full h-full transition-transform duration-200 ${
                isWildPokemonHurt ? 'animate-damage' : ''
              } ${isEnemyAttacking ? 'animate-enemy-attack' : ''} ${
                isTryingCatch ? 'animate-catch' : ''
              }`"
              @error="(e: Event) => { 
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/not-found.png';
                }"
            />
          </div>
          <!-- Type Tags -->
          <div class="flex justify-center gap-2 my-2 absolute bottom-2 left-0 right-0">
            <span
              v-for="type in wildPokemon.types"
              :key="type"
              class="px-2 py-1 rounded-full text-xs text-white"
              :class="getTypeColor(type)"
            >
              {{ type }}
            </span>
          </div>
        </div>
        <!-- HP Bar -->
        <div class="mt-2">
          <div class="text-sm text-gray-700 flex justify-between items-center">
            <div>
              <span class="capitalize">{{ wildPokemon.name }}</span>
              <span class="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">Lvl {{ wildPokemon.level }}</span>
            </div>
            <span>{{ wildPokemon.currentHP }}/{{ wildPokemon.maxHP }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div
              class="h-2.5 rounded-full transition-all duration-300"
              :class="{
                'bg-green-600': (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 > 25,
                'bg-yellow-500': (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 <= 25 && (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 > 10,
                'bg-red-500': (wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100 <= 10
              }"
              :style="{ width: ((wildPokemon.currentHP ?? 0) / (wildPokemon.maxHP ?? 1) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
      <div v-else class="bg-gray-100 p-4 rounded-lg shadow flex items-center justify-center text-gray-500">
        No wild Pokémon found...
      </div>
    </div>

    <!-- Pokeball Selector Modal -->
    <div v-if="showPokeballSelector" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-bold mb-4">Select a Pokéball</h3>
        
        <div class="grid grid-cols-1 gap-3">
          <div 
            v-for="ball in availablePokeballs" 
            :key="ball.id"
            class="border rounded-lg p-3 flex items-center hover:bg-gray-100 cursor-pointer"
            @click="selectPokeball(ball)"
          >
            <div class="w-10 h-10 flex-shrink-0 mr-3 bg-gray-100 rounded-lg overflow-hidden">
              <img 
                :src="ball.icon" 
                :alt="ball.name"
                class="w-full h-full object-contain"
                @error="(e: Event) => { 
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/not-found.png';
                }"
              >
            </div>
            
            <div class="flex-1">
              <div class="font-medium">{{ ball.name }} <span class="text-sm text-gray-500">({{ ball.quantity }})</span></div>
              <div class="text-xs text-gray-600">{{ ball.description }}</div>
            </div>
          </div>
        </div>
        
        <button 
          @click="showPokeballSelector = false"
          class="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors w-full"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Berry Selector Modal -->
    <div v-if="showBerrySelector" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-bold mb-4">Select a Berry</h3>
        
        <div v-if="availableBerries.length === 0" class="text-center py-4 text-gray-500">
          You don't have any berry items that can catch Pokémon automatically.
        </div>

        <div v-else class="grid grid-cols-1 gap-3">
          <div 
            v-for="berry in availableBerries" 
            :key="berry.id"
            class="border rounded-lg p-3 flex items-center hover:bg-gray-100 cursor-pointer"
            @click="selectBerry(berry)"
          >
            <div class="w-10 h-10 flex-shrink-0 mr-3 bg-gray-100 rounded-lg overflow-hidden">
              <img 
                :src="berry.icon" 
                :alt="berry.name"
                class="w-full h-full object-contain"
                @error="(e: Event) => { 
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/berry.png';
                }"
              >
            </div>
            
            <div class="flex-1">
              <div class="font-medium">{{ berry.name }} <span class="text-sm text-gray-500">({{ berry.quantity }})</span></div>
              <div class="text-xs text-gray-600">{{ berry.description }}</div>
            </div>
          </div>
        </div>
        
        <button 
          @click="showBerrySelector = false"
          class="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors w-full"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Battle Log -->
    <BattleLog :logs="gameStore.battle.battleLogs" />
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
  0% { transform: translateX(0); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(0); }
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
  0% { transform: translateX(0); }
  50% { transform: translateX(-20px); }
  100% { transform: translateX(0); }
}

@keyframes catch-attempt {
  0% { transform: scale(1) translateX(0); }
  25% { transform: scale(1.2) translateX(0); }
  50% { transform: scale(0.8) translateX(100px); }
  75% { transform: scale(0.6) translateX(0); }
  100% { transform: scale(1) translateX(0); }
}

/* Fire rate button tier styles */
.fire-rate-button-tier-1 {
  background: linear-gradient(to bottom, #f59e0b, #d97706);
  box-shadow: 0 0 15px rgba(252, 211, 77, 0.7);
  border: 1px solid #f59e0b;
}

.fire-rate-button-tier-1 .fire-button-overlay {
  background: radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 25%, rgba(252, 211, 77, 0.5) 75%, rgba(252, 211, 77, 0) 100%);
  animation: fire-effect 1.2s infinite;
}

.fire-rate-button-tier-2 {
  background: linear-gradient(to bottom, #ef4444, #b91c1c);
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
  border: 1px solid #ef4444;
}

.fire-rate-button-tier-2 .fire-button-overlay {
  background: radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 25%, rgba(239, 68, 68, 0.6) 75%, rgba(239, 68, 68, 0) 100%);
  animation: fire-effect 0.9s infinite;
}

.fire-rate-button-tier-3 {
  background: linear-gradient(to bottom, #2563eb, #1d4ed8);
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.8);
  border: 1px solid #2563eb;
}

.fire-rate-button-tier-3 .fire-button-overlay {
  background: radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 25%, rgba(96, 165, 250, 0.7) 75%, rgba(96, 165, 250, 0) 100%);
  animation: fire-effect 0.6s infinite;
}

/* Fire rate counter styles */
.fire-rate-counter {
  animation: pulse 1s infinite alternate;
  z-index: 10;
}

@keyframes pulse {
  0% { transform: translateX(-50%) scale(1); }
  100% { transform: translateX(-50%) scale(1.1); }
}

/* Cursor counter for fire rate */
#fire-rate-cursor-counter {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  transform: translate(-50%, -100%);
  margin-top: -15px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
  transition: opacity 0.2s ease;
}
</style>