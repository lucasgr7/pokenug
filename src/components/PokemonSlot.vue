<!-- 
  A reusable Pokemon slot component with type-based styling and a card layout.
  The component shows a Pokemon's image, name, level, health, and experience.
  It supports drag and drop functionality and type-based theming.
-->
<template>
  <div
    class="pokemon-slot relative overflow-hidden transition-transform duration-200 hover:scale-105"
    :class="[
      isParty ? 'bg-red-50' : 'bg-white',
      { 'cursor-pointer': !disabled },
      { 'shadow-md': !isParty },
      { 'shadow-lg': isParty }
    ]"
    :draggable="!disabled"
    @dragstart="handleDragStart"
  >
    <!-- Type-based background -->
    <div 
      class="absolute inset-0"
      :class="backgroundClass"
    >
      <template v-if="pokemon?.types.length === 2">
        <div class="absolute inset-0 diagonal-split first-type opacity-25" :class="getTypeColor(pokemon.types[0])"></div>
        <div class="absolute inset-0 diagonal-split second-type opacity-25" :class="getTypeColor(pokemon.types[1])"></div>
      </template>
      <div v-else class="absolute inset-0 opacity-25" :class="getTypeColor(pokemon?.types[0] || '')"></div>
    </div>

    <!-- Pokemon Card Content -->
    <div class="relative p-2 rounded-lg">
      <!-- Rest of the content remains the same -->
      <div class="w-32 h-32 mx-auto">
        <img 
          v-if="pokemon" 
          :src="pokemon.sprite" 
          :alt="pokemon.name"
          class="w-full h-full object-contain"
          :class="{ 'opacity-50': disabled }"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
          Empty Slot
        </div>
      </div>

      <!-- Pokemon Info -->
      <div v-if="pokemon" class="mt-2 space-y-2">
        <!-- Name and Level -->
        <div class="flex justify-between items-center">
          <span class="text-sm font-semibold capitalize">{{ pokemon.name }}</span>
          <span class="text-xs bg-gray-100 px-2 py-1 rounded-full">Lvl {{ pokemon.level || 1 }}</span>
        </div>

        <!-- Health Bar -->
        <div v-if="pokemon.maxHP">
          <div class="flex justify-between text-xs text-gray-600">
            <span>HP</span>
            <span>{{ pokemon.currentHP }}/{{ pokemon.maxHP }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all duration-300"
              :class="{
                'bg-green-500': healthPercentage > 50,
                'bg-yellow-500': healthPercentage <= 50 && healthPercentage > 25,
                'bg-red-500': healthPercentage <= 25
              }"
              :style="{ width: `${healthPercentage}%` }"
            ></div>
          </div>
          <!-- Add Healing Indicator -->
          <div v-if="isHealing" class="mt-1">
            <div class="w-full bg-gray-200 rounded-full h-1">
              <div class="bg-blue-400 h-1 rounded-full transition-all duration-300 animate-pulse"></div>
            </div>
            <div class="text-xs text-blue-500 text-center mt-0.5">Healing...</div>
          </div>
        </div>

        <!-- Experience Bar -->
        <div v-if="pokemon.experienceToNextLevel">
          <div class="flex justify-between text-xs text-gray-600">
            <span>EXP</span>
            <span>{{ pokemon.experience }}/{{ pokemon.experienceToNextLevel }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-1">
            <div
              class="h-1 bg-blue-500 rounded-full transition-all duration-300"
              :style="{ width: `${expPercentage}%` }"
            ></div>
          </div>
        </div>

        <!-- Type Tags -->
        <div class="flex flex-wrap gap-1">
          <span
            v-for="type in pokemon.types"
            :key="type"
            class="px-2 py-0.5 rounded-full text-white text-xs"
            :class="getTypeColor(type)"
          >
            {{ type }}
          </span>
        </div>
      </div>
    </div>

    <!-- Add healing indicator -->
    <div v-if="isHealing && !disabled" class="absolute bottom-0 left-0 right-0 p-2 bg-blue-500/20">
      <div class="flex items-center justify-center space-x-1">
        <div class="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
        <div class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        <div class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pokemon } from '../types/pokemon'
import { computed } from 'vue'

const props = defineProps<{
  pokemon?: Pokemon
  disabled?: boolean
  isParty?: boolean
}>()

// Define emits for the component
const emit = defineEmits(['dragstart'])

// Add isHealing computed property
const isHealing = computed(() => {
  if (!props.pokemon) return false
  return props.pokemon.currentHP! < props.pokemon.maxHP! && 
         !props.pokemon.faintedAt && 
         !props.disabled
})

// Update healthPercentage to handle cases where HP is being regenerated
const healthPercentage = computed(() => {
  if (!props.pokemon?.maxHP) return 0
  const currentHP = props.pokemon.currentHP || 0
  const maxHP = props.pokemon.maxHP
  return Math.min(100, Math.max(0, (currentHP / maxHP) * 100))
})

const expPercentage = computed(() => {
  if (!props.pokemon?.experienceToNextLevel) return 0
  return (props.pokemon.experience || 0) / props.pokemon.experienceToNextLevel * 100
})

const backgroundClass = computed(() => {
  if (!props.pokemon?.types.length) return ''
  return props.pokemon.types.length === 2 ? 'dual-type' : 'single-type'
})

// Event handlers
function handleDragStart(event: DragEvent) {
  if (props.disabled || !props.pokemon || !event.dataTransfer) return
  
  event.dataTransfer.setData('application/json', JSON.stringify(props.pokemon))
  emit('dragstart', props.pokemon)
}

// Type color mapping
function getTypeColor(type: string) {
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
.pokemon-slot {
  width: 12rem;
  min-height: 18rem;
}

.diagonal-split {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}

.first-type {
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.second-type {
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}
</style>