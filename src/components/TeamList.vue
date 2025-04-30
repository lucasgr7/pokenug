<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { tickSystem } from '../services/tickSystem'
import type { Pokemon } from '../types/pokemon'
import CachedImage from './CachedImage.vue'

const gameStore = useGameStore()
let regenInterval: number | NodeJS.Timeout | null = null
let unsubscribe: (() => void) | null = null

const hpPercentage = (pokemon: Pokemon) => {
  return Math.floor((pokemon.currentHP! / pokemon.maxHP!) * 100)
}

const getPokemonHP = computed(() => (pokemon: Pokemon) => {
  return `${Math.floor(pokemon.currentHP!)}/${pokemon.maxHP}`
})

const isFainted = (pokemon: Pokemon) => {
  return pokemon.currentHP === 0 && pokemon.faintedAt !== undefined
}

// Using ref to make the recovery times reactive
const recoveryTimes = ref<{ [key: number]: number }>({})

const getRecoveryTimeLeft = (pokemon: Pokemon) => {
  const index = gameStore.playerPokemon.indexOf(pokemon)
  return recoveryTimes.value[index] || 0
}

const updateRecoveryTimes = () => {
  gameStore.playerPokemon.forEach((pokemon, index) => {
    if (pokemon.recoveryEndTime) {
      recoveryTimes.value[index] = Math.max(0, Math.floor((pokemon.recoveryEndTime - Date.now()) / 1000))
    } else {
      recoveryTimes.value[index] = 0
    }
  })
}

const getRecoveryProgress = (pokemon: Pokemon) => {
  if (!pokemon.faintedAt || !pokemon.recoveryEndTime) return 0
  const now = Date.now()
  const totalTime = pokemon.recoveryEndTime - pokemon.faintedAt
  const elapsed = now - pokemon.faintedAt
  return Math.min(100, Math.floor((elapsed / totalTime) * 100))
}

const swapPokemon = (pokemon: Pokemon) => {
  if (pokemon === gameStore.activePokemon || isFainted(pokemon)) return
  gameStore.setActivePokemon(pokemon)
}

onMounted(() => {
  regenInterval = gameStore.startHPRegen()
  // Subscribe to tick system for recovery time updates
  unsubscribe = tickSystem.subscribe(() => {
    updateRecoveryTimes()
  })
})

onUnmounted(() => {
  if (regenInterval) {
    clearInterval(regenInterval)
  }
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>
<template>
  <div class="w-full space-y-2">
    <template v-for="index in 6" :key="index">
      <!-- Filled slot -->
      <div v-if="gameStore.playerPokemon[index - 1]"
           class="flex items-center p-2 rounded-lg cursor-pointer transition-colors"
           :class="{ 
             'bg-red-500 hover:bg-red-700': !isFainted(gameStore.playerPokemon[index - 1]),
             'bg-gray-500 hover:bg-gray-600': isFainted(gameStore.playerPokemon[index - 1]),
             'opacity-75': gameStore.playerPokemon[index - 1] !== gameStore.activePokemon 
           }"
           @click="swapPokemon(gameStore.playerPokemon[index - 1])">
        <CachedImage 
          :src="gameStore.playerPokemon[index - 1].sprite" 
          :alt="gameStore.playerPokemon[index - 1].name" 
          class="w-5 h-5 object-contain"
        />
        <div class="ml-2 flex-1">
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <span class="text-xs text-white capitalize">{{ gameStore.playerPokemon[index - 1].name }}</span>
              <span v-if="isFainted(gameStore.playerPokemon[index - 1])" 
                    class="ml-1 text-xs bg-gray-700 text-white px-1 rounded">
                Fainted ({{ getRecoveryTimeLeft(gameStore.playerPokemon[index - 1]) }}s)
              </span>
            </div>
            <span class="text-xs text-white">
              {{ getPokemonHP(gameStore.playerPokemon[index - 1]) }}
            </span>
          </div>
          <div class="w-full bg-red-800/50 rounded-full h-1">
            <div class="h-1 rounded-full transition-all duration-300"
                 :class="{
                   'bg-green-500': hpPercentage(gameStore.playerPokemon[index - 1]) > 25,
                   'bg-yellow-500': hpPercentage(gameStore.playerPokemon[index - 1]) <= 25 && hpPercentage(gameStore.playerPokemon[index - 1]) > 10,
                   'bg-red-500': hpPercentage(gameStore.playerPokemon[index - 1]) <= 10
                 }"
                 :style="{ width: hpPercentage(gameStore.playerPokemon[index - 1]) + '%' }">
            </div>
          </div>
          <!-- Recovery Progress Bar -->
          <div v-if="isFainted(gameStore.playerPokemon[index - 1])" class="mt-1">
            <div class="w-full bg-gray-700/50 rounded-full h-1">
              <div class="h-1 rounded-full bg-blue-400 transition-all duration-300"
                   :style="{ width: getRecoveryProgress(gameStore.playerPokemon[index - 1]) + '%' }">
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Empty slot -->
      <div v-else
           class="flex items-center p-2 bg-red-500/25 rounded-lg cursor-not-allowed">
        <div class="w-5 h-5 bg-white/10 rounded-full"></div>
        <div class="ml-2 flex-1">
          <div class="flex justify-between items-center">
            <span class="text-xs text-white/50">Empty Slot</span>
          </div>
          <div class="w-full bg-red-800/25 rounded-full h-1"></div>
        </div>
      </div>
    </template>
  </div>
</template>
