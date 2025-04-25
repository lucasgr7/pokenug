<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <!-- Zone Status Bar -->
    <div class="mb-4 bg-gray-100 p-3 rounded-lg flex justify-between items-center">
      <div>
        <span class="font-bold text-gray-700">{{ currentZone }}</span>
        <span class="text-sm text-gray-500 ml-2">Encounter Rate: {{ encounterRate }}%</span>
      </div>
      <div v-if="!wildPokemon" class="text-sm text-gray-600">
        Next spawn in: {{ spawnTimer }}s
      </div>
      <div class="bg-red-100 px-3 py-1 rounded-full text-red-600">
        <span class="mr-1">🔴</span>{{ pokeballs }} Pokéballs
      </div>
    </div>

    <!-- Battle Area -->
    <div class="grid grid-cols-3 gap-4">
      <!-- Player Pokemon Panel -->
      <div class="bg-blue-50 p-4 rounded-lg shadow">
        <div class="text-center mb-2 font-bold">Your Pokémon</div>
        <div class="relative">
          <img
            :src="playerPokemon.sprite"
            alt="Player Pokemon"
            class="w-32 h-32 mx-auto transition-transform duration-200"
            :class="{ 'animate-attack': isPlayerAttacking }"
          >
          <!-- HP Bar -->
          <div class="mt-2">
            <div class="text-sm text-gray-700 flex justify-between">
              <span>{{ playerPokemon.name }}</span>
              <span>{{ playerPokemon.currentHP }}/{{ playerPokemon.maxHP }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div
                class="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                :style="{ width: (playerPokemon.currentHP / playerPokemon.maxHP * 100) + '%' }"
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
          :disabled="!wildPokemon || pokeballs <= 0"
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
            :class="{ 'animate-damage': isWildPokemonHurt }"
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
            <div class="text-sm text-gray-700 flex justify-between">
              <span>{{ wildPokemon.name }}</span>
              <span>{{ wildPokemon.currentHP }}/{{ wildPokemon.maxHP }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div
                class="bg-green-600 h-2.5 rounded-full transition-all duration-300"
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// State
const playerPokemon = ref({
  name: 'Pikachu', // Example
  sprite: 'path/to/sprite.png',
  currentHP: 100,
  maxHP: 100
})

const wildPokemon = ref(null)
const pokeballs = ref(5)
const currentZone = ref('Viridian Forest')
const encounterRate = ref(30)
const spawnTimer = ref(10)
const isPlayerAttacking = ref(false)
const isWildPokemonHurt = ref(false)
const isRecovering = ref(false)
const recoveryProgress = ref(0)

// Battle Functions
const attack = () => {
  if (!wildPokemon.value) return
  
  isPlayerAttacking.value = true
  setTimeout(() => {
    isPlayerAttacking.value = false
    isWildPokemonHurt.value = true
    
    // Calculate damage
    const damage = Math.floor(Math.random() * 20) + 10
    wildPokemon.value.currentHP = Math.max(0, wildPokemon.value.currentHP - damage)
    
    setTimeout(() => {
      isWildPokemonHurt.value = false
      if (wildPokemon.value.currentHP <= 0) {
        wildPokemon.value = null
        startSpawnTimer()
      }
    }, 300)
  }, 200)
}

const tryCapture = () => {
  if (!wildPokemon.value || pokeballs.value <= 0) return
  
  pokeballs.value--
  
  // Calculate capture chance based on remaining HP percentage
  const hpPercentage = wildPokemon.value.currentHP / wildPokemon.value.maxHP
  const captureChance = 1 - hpPercentage // Higher chance with lower HP
  
  if (Math.random() < captureChance) {
    // Success
    wildPokemon.value = null
    startSpawnTimer()
  }
}

const startSpawnTimer = () => {
  const interval = setInterval(() => {
    spawnTimer.value--
    if (spawnTimer.value <= 0) {
      clearInterval(interval)
      spawnWildPokemon()
    }
  }, 1000)
}

const spawnWildPokemon = () => {
  // Example wild Pokemon spawn
  wildPokemon.value = {
    name: 'Rattata',
    sprite: 'path/to/rattata.png',
    currentHP: 50,
    maxHP: 50,
    types: ['Normal']
  }
  spawnTimer.value = 10
}

const getTypeColor = (type) => {
  const colors = {
    Normal: 'bg-gray-400',
    Fire: 'bg-red-500',
    Water: 'bg-blue-500',
    Electric: 'bg-yellow-500',
    Grass: 'bg-green-500',
    // Add more types as needed
  }
  return colors[type] || 'bg-gray-400'
}

// Lifecycle
onMounted(() => {
  startSpawnTimer()
})

onUnmounted(() => {
  // Clean up any running timers
})
</script>

<style scoped>
.animate-attack {
  animation: attack 0.2s ease-in-out;
}

.animate-damage {
  animation: damage 0.3s ease-in-out;
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
</style>