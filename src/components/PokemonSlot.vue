<!-- 
  A reusable Pokemon slot component with type-based styling and a card layout.
  The component shows a Pokemon's image, name, level, health, and experience.
  It supports drag and drop functionality and type-based theming.
-->
<template>
  <div
    class="w-full h-full bg-white rounded-lg shadow-md p-2 hover:shadow-lg transition-shadow duration-200"
    :class="{ 
      'border-2 border-red-500': isParty && isSelected,
      'cursor-pointer': true
    }"
    draggable="true"
    @dragstart="$emit('dragstart', $event)"
  >
    <div class="flex flex-col items-center">
      <img
        :src="pokemon.sprite"
        :alt="pokemon.name"
        class="w-20 h-20 object-contain"
      />
      <div class="text-center mt-2">
        <div class="font-semibold capitalize">{{ pokemon.name }}</div>
        <div class="text-sm text-gray-500">Lvl {{ pokemon.level }}</div>
        <div class="flex justify-center space-x-1 mt-1">
          <span
            v-for="type in pokemon.types"
            :key="type"
            class="px-2 py-0.5 rounded-full text-xs text-white"
            :class="getTypeColor(type)"
          >
            {{ type }}
          </span>
        </div>
      </div>
      <!-- Health Bar -->
      <div class="w-full mt-2">
        <div class="flex justify-between items-center text-xs text-gray-600">
          <span>HP</span>
          <span>{{ Math.floor(pokemon.currentHP || 0) }}/{{ pokemon.maxHP }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-0.5">
          <div
            class="h-1.5 rounded-full transition-all duration-300"
            :class="{
              'bg-green-600': hpPercentage > 50,
              'bg-yellow-500': hpPercentage <= 50 && hpPercentage > 25,
              'bg-red-500': hpPercentage <= 25
            }"
            :style="{ width: hpPercentage + '%' }"
          ></div>
        </div>
      </div>
      
      <!-- Fainted Status Overlay -->
      <div
        v-if="pokemon.faintedAt"
        class="absolute inset-0 bg-red-900 bg-opacity-50 flex items-center justify-center rounded-lg"
      >
        <div class="text-white font-bold text-center">
          <div>Fainted</div>
          <div class="text-xs mt-1">Recovering: {{ recoveryTimeLeft }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted, defineEmits } from 'vue'
import type { Pokemon } from '../types/pokemon'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const emits = defineEmits(['dragstart'])

const props = defineProps<{
  pokemon: Pokemon
  isParty: boolean
}>()

const isSelected = computed(() => {
  return props.isParty && gameStore.playerPokemon[gameStore.activePokemonIndex] === props.pokemon
})

// Calculate HP percentage for display
const hpPercentage = computed(() => {
  if (!props.pokemon.currentHP || !props.pokemon.maxHP) return 0
  const percentage = (props.pokemon.currentHP / props.pokemon.maxHP) * 100
  return Math.min(100, Math.max(0, percentage)) // Clamp between 0-100
})

// Calculate recovery time left
const recoveryTimeLeft = ref('--:--')
const recoveryInterval = ref<number | null>(null)

const updateRecoveryTime = () => {
  if (props.pokemon.recoveryEndTime) {
    const now = Date.now()
    const timeLeft = props.pokemon.recoveryEndTime - now
    
    if (timeLeft <= 0) {
      recoveryTimeLeft.value = 'Ready'
      clearInterval(recoveryInterval.value!)
      recoveryInterval.value = null
    } else {
      const seconds = Math.floor((timeLeft / 1000) % 60).toString().padStart(2, '0')
      const minutes = Math.floor((timeLeft / 1000 / 60)).toString().padStart(2, '0')
      recoveryTimeLeft.value = `${minutes}:${seconds}`
    }
  }
}

if (props.pokemon.faintedAt) {
  updateRecoveryTime()
  recoveryInterval.value = setInterval(updateRecoveryTime, 1000)
}

onUnmounted(() => {
  if (recoveryInterval.value) {
    clearInterval(recoveryInterval.value)
  }
})

// Color mapping for Pokemon types
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