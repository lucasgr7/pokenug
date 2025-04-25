<template>
  <div class="w-full space-y-2">
    <template v-for="index in 6" :key="index">
      <!-- Filled slot -->
      <div v-if="gameStore.playerPokemon[index - 1]"
           class="flex items-center p-2 bg-red-500 hover:bg-red-700 rounded-lg cursor-pointer transition-colors"
           :class="{ 'opacity-75': gameStore.playerPokemon[index - 1] !== gameStore.activePokemon }"
           @click="swapPokemon(gameStore.playerPokemon[index - 1])">
        <img :src="gameStore.playerPokemon[index - 1].sprite" 
             :alt="gameStore.playerPokemon[index - 1].name" 
             class="w-5 h-5 object-contain">
        <div class="ml-2 flex-1">
          <div class="flex justify-between items-center">
            <span class="text-xs text-white capitalize">{{ gameStore.playerPokemon[index - 1].name }}</span>
            <span class="text-xs text-white">
              {{ Math.floor(gameStore.playerPokemon[index - 1].currentHP!) }}/{{ gameStore.playerPokemon[index - 1].maxHP }}
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

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import type { Pokemon } from '../types/pokemon'

const gameStore = useGameStore()
const HP_REGEN_RATE = 2.5 // 2.5% per second
let regenInterval: number | null = null

const hpPercentage = (pokemon: Pokemon) => {
  return Math.floor((pokemon.currentHP! / pokemon.maxHP!) * 100)
}

const swapPokemon = (pokemon: Pokemon) => {
  if (pokemon === gameStore.activePokemon) return
  gameStore.setActivePokemon(pokemon)
}

const regenHP = () => {
  if (!gameStore.playerPokemon) return

  gameStore.playerPokemon.forEach(pokemon => {
    if (pokemon !== gameStore.activePokemon && pokemon.currentHP! < pokemon.maxHP!) {
      const regenAmount = (pokemon.maxHP! * HP_REGEN_RATE) / 100
      pokemon.currentHP = Math.min(pokemon.maxHP!, pokemon.currentHP! + regenAmount)
    }
  })
  gameStore.saveState()
}

onMounted(() => {
  regenInterval = setInterval(regenHP, 1000) as unknown as number
})

onUnmounted(() => {
  if (regenInterval) {
    clearInterval(regenInterval)
  }
})
</script>