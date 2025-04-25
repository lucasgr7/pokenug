<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <!-- XP Bar -->
    <div v-if="gameStore.activePokemon" class="relative mb-4">
      <div class="relative w-full h-3 bg-yellow-100 rounded-full overflow-hidden">
        <!-- XP Bar -->
        <div
          class="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-600 ease-out rounded-full"
          :class="{ 'animate-level-up': isLevelingUp }"
          :style="{
            width: `${(gameStore.activePokemon.experience! / gameStore.activePokemon.experienceToNextLevel!) * 100}%`,
            boxShadow: isGainingXP ? '0 0 10px rgba(234, 179, 8, 0.8)' : 'none'
          }"
        ></div>
        <!-- Floating XP Numbers -->
        <TransitionGroup name="float-up" tag="div" class="absolute inset-0 overflow-hidden pointer-events-none">
          <div v-for="xpGain in recentXPGains" 
               :key="xpGain.id"
               class="absolute text-yellow-600 font-bold text-sm animate-float-up"
               :style="{ left: `${xpGain.x}%`, bottom: '0' }">
            +{{ xpGain.amount }}
          </div>
        </TransitionGroup>
      </div>
      <!-- XP Text -->
      <div class="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs text-yellow-700 font-bold">
        Level {{ gameStore.activePokemon.level }} - {{ Math.floor(gameStore.activePokemon.experience!) }}/{{ gameStore.activePokemon.experienceToNextLevel! }} XP
      </div>
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
        <span class="mr-1">🔴</span>{{ gameStore.pokeballs }} Pokéballs
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
          <img
            :src="gameStore?.activePokemon?.sprite ?? ''"
            alt="Player Pokemon"
            class="w-32 h-32 mx-auto transition-transform duration-200"
            :class="{ 'animate-attack': isPlayerAttacking }"
          >
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

      <!-- Battle Controls -->
      <div class="flex flex-col justify-center items-center space-y-4">
        <button
          @click="attack"
          :disabled="!wildPokemon"
          class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Attack
        </button>
        <button
          @click="tryCapture"
          :disabled="!wildPokemon || gameStore.pokeballs <= 0"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Try Capture
        </button>
      </div>

      <!-- Wild Pokemon Panel -->
      <div v-if="wildPokemon" class="bg-red-50 p-4 rounded-lg shadow">
        <div class="text-center mb-2 font-bold">Wild Pokémon</div>
        <div class="relative">
          <img
            :src="wildPokemon.sprite"
            alt="Wild Pokemon"
            class="w-32 h-32 mx-auto transition-transform duration-200"
            :class="{ 
              'animate-damage': isWildPokemonHurt, 
              'animate-enemy-attack': isEnemyAttacking,
              'animate-catch': isTryingCatch 
            }"
          >
          <!-- Type Tags -->
          <div class="flex justify-center gap-2 my-2">
            <span
              v-for="type in wildPokemon.types"
              :key="type"
              class="px-2 py-1 rounded-full text-xs text-white"
              :class="getTypeColor(type)"
            >
              {{ type }}
            </span>
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
                  'bg-green-600': (wildPokemon.currentHP / wildPokemon.maxHP * 100) > 25,
                  'bg-yellow-500': (wildPokemon.currentHP / wildPokemon.maxHP * 100) <= 25 && (wildPokemon.currentHP / wildPokemon.maxHP * 100) > 10,
                  'bg-red-500': (wildPokemon.currentHP / wildPokemon.maxHP * 100) <= 10
                }"
                :style="{ width: (wildPokemon.currentHP / wildPokemon.maxHP * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="bg-gray-100 p-4 rounded-lg shadow flex items-center justify-center text-gray-500">
        No wild Pokémon found...
      </div>
    </div>

    <!-- Battle Log -->
    <BattleLog :logs="battleLogs" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, TransitionGroup } from 'vue'
import { useGameStore, regions } from '../stores/gameStore'
import { usePokemon } from '../composables/usePokemon'
import { tickSystem } from '../services/tickSystem'
import BattleLog from '../components/BattleLog.vue'
import type { Pokemon } from '../types/pokemon'

// Store and Pokemon data
const gameStore = useGameStore()
const { pokemonList, findById } = usePokemon()

// Battle state
const wildPokemon = ref<Pokemon | null>(null)
const DEFAULT_SPAWN_TIMER = 1
const spawnTimer = ref(DEFAULT_SPAWN_TIMER)
const isPlayerAttacking = ref(false)
const isWildPokemonHurt = ref(false)
const isRecovering = ref(false)
const recoveryProgress = ref(0)
const battleLogs = ref<Array<{ message: string; type: 'damage' | 'heal' | 'system' }>>([])
const isEnemyAttacking = ref(false)
const isTryingCatch = ref(false)

// Add computed property for HP percentage
const hpPercentage = computed(() => {
  if (!gameStore.activePokemon) return 0
  return Math.floor((gameStore.activePokemon.currentHP / gameStore.activePokemon.maxHP) * 100)
})

// Constants
const ENEMY_ATTACK_INTERVAL = 3000 // 3 seconds
const RUN_CHANCE = 0.15 // 15% chance to run each check
const RUN_CHECK_INTERVAL = 5000 // Check for running every 5 seconds
const BASE_HITS_TO_DEFEAT = 10 // Base number of hits needed to defeat same-level enemy
const LEVEL_SCALING_FACTOR = 1.2 // How much harder it gets per level difference

const calculateStats = (level: number) => {
  const baseHP = 100 // Base HP for level 1
  const hpPerLevel = 20 // HP increase per level
  
  // Calculate max HP based on level
  const maxHP = Math.floor(baseHP + (hpPerLevel * (level - 1)))
  
  // Calculate attack to achieve desired number of hits to defeat
  const baseAttack = Math.floor(baseHP / BASE_HITS_TO_DEFEAT)
  const attackPerLevel = baseAttack * 0.2 // 20% increase per level
  const attack = Math.floor(baseAttack + (attackPerLevel * (level - 1)))
  
  // Defense scales similarly to attack but slightly lower
  const baseDefense = Math.floor(baseAttack * 0.8)
  const defensePerLevel = baseDefense * 0.2
  const defense = Math.floor(baseDefense + (defensePerLevel * (level - 1)))
  
  return {
    maxHP,
    attack,
    defense
  }
}

const calculateDamage = (attack: number, defense: number, attackerLevel: number, defenderLevel: number) => {
  // Base damage calculation
  const levelDifference = attackerLevel - defenderLevel
  const levelScaling = Math.pow(LEVEL_SCALING_FACTOR, levelDifference)
  
  // Calculate base damage
  let baseDamage = (attack * levelScaling) * (1 - (defense / (defense + 100)))
  
  // Add randomness (±15% variation)
  const variation = 0.85 + (Math.random() * 0.3)
  const finalDamage = Math.max(1, Math.floor(baseDamage * variation))
  
  return finalDamage
}

const calculateXPGain = (playerLevel: number, enemyLevel: number) => {
  return Math.floor(10 * (enemyLevel / playerLevel))
}

const calculateXPForNextLevel = (currentLevel: number) => {
  return Math.floor(100 * Math.pow(currentLevel, 1.5))
}

// Update the spawnWildPokemon function
const spawnWildPokemon = async () => {
  const region = gameStore.currentRegionData
  const poolPokemon = region.pool[Math.floor(Math.random() * region.pool.length)]
  
  const pokemon = await findById(poolPokemon.id)
  if (pokemon) {
    const level = Math.floor(Math.random() * (region.maxLevel - region.minLevel + 1)) + region.minLevel
    const stats = calculateStats(level)
    
    wildPokemon.value = {
      ...pokemon,
      level,
      currentHP: stats.maxHP,
      maxHP: stats.maxHP,
      attack: stats.attack,
      defense: stats.defense,
      lastAttackTime: Date.now(),
      isRunning: false
    }

    battleLogs.value.push({
      message: `A wild ${pokemon.name} (Lvl ${level}) appeared!`,
      type: 'system'
    })
  }
  
  spawnTimer.value = DEFAULT_SPAWN_TIMER
}

// Add new refs for XP animations
const isGainingXP = ref(false)
const isLevelingUp = ref(false)
const recentXPGains = ref<Array<{ id: number, amount: number, x: number }>>([])
let xpGainCounter = 0

// Handle XP gain separately to reduce nesting
const handleXPGain = (playerPokemon: Pokemon, defeatedPokemon: Pokemon) => {
  const xpGain = calculateXPGain(playerPokemon.level!, defeatedPokemon.level!)
  const currentXP = playerPokemon.experience || 0
  const nextLevelXP = playerPokemon.experienceToNextLevel || calculateXPForNextLevel(playerPokemon.level!)
  
  // Add floating XP number
  const newXPGain = {
    id: xpGainCounter++,
    amount: xpGain,
    x: Math.random() * 80 + 10
  }
  recentXPGains.value.push(newXPGain)
  setTimeout(() => {
    recentXPGains.value = recentXPGains.value.filter(g => g.id !== newXPGain.id)
  }, 2000)
  
  // Animate XP bar
  isGainingXP.value = true
  setTimeout(() => {
    isGainingXP.value = false
  }, 600)
  
  playerPokemon.experience = currentXP + xpGain
  
  battleLogs.value.push({
    message: `${playerPokemon.name} gained ${xpGain} XP!`,
    type: 'system'
  })
  
  // Check for level up
  if (playerPokemon.experience >= nextLevelXP) {
    isLevelingUp.value = true
    setTimeout(() => {
      isLevelingUp.value = false
    }, 1000)
    gameStore.levelUpPokemon(playerPokemon)
  }
}

// Update attack function to use handleXPGain
const attack = () => {
  if (!wildPokemon.value || !gameStore.activePokemon) return
  
  isPlayerAttacking.value = true
  setTimeout(() => {
    isPlayerAttacking.value = false
    isWildPokemonHurt.value = true
    
    const damage = calculateDamage(
      gameStore.activePokemon.attack!,
      wildPokemon.value.defense!,
      gameStore.activePokemon.level!,
      wildPokemon.value.level!
    )
    
    wildPokemon.value.currentHP = Math.max(0, wildPokemon.value.currentHP! - damage)
    
    battleLogs.value.push({
      message: `${gameStore.activePokemon.name} attacks ${wildPokemon.value.name} for ${damage} damage!`,
      type: 'damage'
    })
    
    setTimeout(() => {
      isWildPokemonHurt.value = false
      if (wildPokemon.value?.currentHP === 0) {
        const defeatedPokemon = { ...wildPokemon.value }
        handleXPGain(gameStore.activePokemon!, defeatedPokemon)
        
        battleLogs.value.push({
          message: `${defeatedPokemon.name} fainted!`,
          type: 'system'
        })
        wildPokemon.value = null
        startSpawnTimer()
        
        gameStore.saveState()
      }
    }, 300)
  }, 200)
}

const handlePokemonFaint = () => {
  if (!gameStore.activePokemon) return
  
  // Set fainted status and recovery timer
  const now = Date.now()
  gameStore.activePokemon.faintedAt = now
  gameStore.activePokemon.recoveryEndTime = now + (60 * 1000) // 60 seconds
  gameStore.saveState()

  // Find next available Pokemon
  const nextPokemon = gameStore.findNextAvailablePokemon()
  
  if (nextPokemon) {
    battleLogs.value.push({
      message: `Go, ${nextPokemon.name}!`,
      type: 'system'
    })
    gameStore.setActivePokemon(nextPokemon)
  } else if (wildPokemon.value) {
    battleLogs.value.push({
      message: `No more Pokemon available! The wild ${wildPokemon.value.name} fled.`,
      type: 'system'
    })
    wildPokemon.value = null
    startSpawnTimer()
  }
}

// Update the enemyAttack function
const enemyAttack = () => {
  if (!wildPokemon.value || !gameStore.activePokemon || wildPokemon.value.isRunning) return
  
  const now = Date.now()
  if (!wildPokemon.value.lastAttackTime || (now - wildPokemon.value.lastAttackTime) >= ENEMY_ATTACK_INTERVAL) {
    isEnemyAttacking.value = true
    setTimeout(() => {
      isEnemyAttacking.value = false
      const damage = calculateDamage(
        wildPokemon.value!.attack!,
        gameStore.activePokemon!.defense!,
        wildPokemon.value!.level!,
        gameStore.activePokemon!.level!
      )
      
      const updatedHP = Math.max(0, gameStore.activePokemon.currentHP! - damage)
      
      // Use the new store action to update HP
      gameStore.updatePokemonHP(gameStore.activePokemon, updatedHP)
      
      wildPokemon.value!.lastAttackTime = now
      
      battleLogs.value.push({
        message: `${wildPokemon.value!.name} attacks ${gameStore.activePokemon.name} for ${damage} damage!`,
        type: 'damage'
      })

      if (updatedHP === 0) {
        battleLogs.value.push({
          message: `${gameStore.activePokemon.name} fainted!`,
          type: 'system'
        })
        handlePokemonFaint()
      }
    }, 200)
  }
}

const tryPokemonRun = () => {
  if (!wildPokemon.value || wildPokemon.value.isRunning) return
  
  if (Math.random() < RUN_CHANCE) {
    wildPokemon.value.isRunning = true
    battleLogs.value.push({
      message: `Wild ${wildPokemon.value.name} is trying to run away!`,
      type: 'system'
    })
    
    setTimeout(() => {
      if (wildPokemon.value) {
        battleLogs.value.push({
          message: `Wild ${wildPokemon.value.name} ran away!`,
          type: 'system'
        })
        wildPokemon.value = null
        startSpawnTimer()
      }
    }, 2000)
  }
}

const tryCapture = async () => {
  if (!wildPokemon.value || !gameStore.usePokeball()) return

  isTryingCatch.value = true
  battleLogs.value.push({
    message: `Threw a Pokéball at ${wildPokemon.value.name}!`,
    type: 'system'
  })

  // Calculate catch chance based on HP percentage
  const hpPercentage = (wildPokemon.value.currentHP! / wildPokemon.value.maxHP!) * 100
  let catchChance = 0

  if (hpPercentage > 50) {
    catchChance = Math.max(5 - wildPokemon.value.level!, 1)
  } else if (hpPercentage < 10) {
    catchChance = Math.max(55 - wildPokemon.value.level!, 10)
  } else if (hpPercentage < 25) {
    catchChance = Math.max(35 - wildPokemon.value.level!, 5)
  }

  // Wait for animation
  await new Promise(resolve => setTimeout(resolve, 1000))
  isTryingCatch.value = false

  // Check if catch successful
  if (Math.random() * 100 <= catchChance) {
    battleLogs.value.push({
      message: `Caught ${wildPokemon.value.name}!`,
      type: 'system'
    })
    
    gameStore.addPokemonToInventory({ ...wildPokemon.value })
    wildPokemon.value = null
    startSpawnTimer()
  } else {
    battleLogs.value.push({
      message: `${wildPokemon.value.name} broke free!`,
      type: 'system'
    })
  }
}

// Spawn system
const startSpawnTimer = () => {
  spawnTimer.value = DEFAULT_SPAWN_TIMER;
  const interval = setInterval(() => {
    spawnTimer.value--
    if (spawnTimer.value <= 0) {
      clearInterval(interval)
      spawnWildPokemon()
    }
  }, 1000)
}


// Lifecycle
let unsubscribe: (() => void) | null = null

onMounted(() => {
  gameStore.initializeGame()
  startSpawnTimer()
  
  // Subscribe to tick system
  unsubscribe = tickSystem.subscribe((elapsed) => {
    if (wildPokemon.value) {
      enemyAttack()
      if (elapsed >= RUN_CHECK_INTERVAL) {
        tryPokemonRun()
      }
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

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
</script>

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
  0% { transform: translateX(0); opacity: 1; }
  25% { transform: translateX(-10px); opacity: 0.7; }
  50% { transform: translateX(10px); opacity: 0.7; }
  75% { transform: translateX(-10px); opacity: 0.7; }
  100% { transform: translateX(0); opacity: 1; }
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

.animate-level-up {
  animation: levelUp 0.6s ease-out;
}

@keyframes levelUp {
  0% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); filter: brightness(1.5); }
  100% { transform: scaleY(1); }
}

.float-up-enter-active {
  animation: float-up 2s ease-out forwards;
}

.float-up-leave-active {
  display: none;
}

@keyframes float-up {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    transform: translateY(-50px);
    opacity: 0;
  }
}

.animate-float-up {
  animation: float-up 2s ease-out forwards;
}
</style>