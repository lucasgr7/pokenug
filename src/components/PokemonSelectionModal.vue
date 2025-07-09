<template>
  <div 
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click.self="onCancel"
  >
    <div 
      class="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 transform transition-all duration-300 ease-out"
      :class="isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <!-- Seeker Stone Icon -->
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <img src="/images/stone.png" alt="Seeker Stone" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Choose Your Next Pokemon</h3>
            <p class="text-sm text-gray-500">The seeker stone reveals three hidden Pokemon</p>
          </div>
        </div>
        
        <!-- Close button -->
        <button 
          @click="onCancel"
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-gray-700 leading-relaxed mb-6">
          The mystical seeker stone has revealed three Pokemon hiding in {{ currentRegion }}. 
          Choose wisely - your selected Pokemon will be the next one to appear!
        </p>
        
        <!-- Pokemon Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            v-for="pokemon in pokemonChoices" 
            :key="pokemon.id"
            @click="selectPokemon(pokemon)"
            class="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 rounded-lg p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-200 hover:border-blue-300 transition-all duration-200 transform hover:scale-105"
          >
            <div class="text-center">
              <!-- Pokemon Image -->
              <div class="relative mb-3">
                <img 
                  :src="pokemon.sprite || '/images/not-found.png'" 
                  :alt="pokemon.name"
                  class="w-20 h-20 mx-auto object-contain"
                  @error="handleImageError"
                />
                <!-- Source badge -->
                <span 
                  class="absolute top-0 right-0 px-2 py-1 text-xs rounded-full"
                  :class="pokemon.source === 'berryPool' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'"
                >
                  {{ pokemon.source === 'berryPool' ? 'Berry Pool' : 'Regular' }}
                </span>
              </div>
              
              <!-- Pokemon Info -->
              <h4 class="font-semibold text-gray-900 capitalize mb-1">{{ pokemon.name }}</h4>
              <p class="text-sm text-gray-600 mb-2">Level {{ minLevel }}-{{ maxLevel }}</p>
              
              <!-- Pokemon Types -->
              <div class="flex justify-center space-x-1 mb-3">
                <span 
                  v-for="type in pokemon.types" 
                  :key="type"
                  class="px-2 py-1 text-xs font-medium text-white rounded"
                  :style="{ backgroundColor: getTypeColor(type) }"
                >
                  {{ type }}
                </span>
              </div>
              
              <!-- Probability -->
              <div class="text-xs text-gray-500">
                Rarity: {{ getProbabilityLabel(pokemon.probability) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
        <button
          @click="onCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface PokemonChoice {
  id: number
  name: string
  sprite?: string
  types: string[]
  probability: number
  source: 'pool' | 'berryPool'
}

interface Props {
  isVisible: boolean
  pokemonChoices: PokemonChoice[]
  currentRegion: string
  minLevel: number
  maxLevel: number
}

interface Emits {
  (e: 'select', pokemon: PokemonChoice): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectPokemon = (pokemon: PokemonChoice) => {
  emit('select', pokemon)
}

const onCancel = () => {
  emit('cancel')
}

const getTypeColor = (type: string): string => {
  const typeColors: Record<string, string> = {
    normal: '#A8A878',
    fighting: '#C03028',
    flying: '#A890F0',
    poison: '#A040A0',
    ground: '#E0C068',
    rock: '#B8A038',
    bug: '#A8B820',
    ghost: '#705898',
    steel: '#B8B8D0',
    fire: '#F08030',
    water: '#6890F0',
    grass: '#78C850',
    electric: '#F8D030',
    psychic: '#F85888',
    ice: '#98D8D8',
    dragon: '#7038F8',
    dark: '#705848',
    fairy: '#EE99AC'
  }
  return typeColors[type.toLowerCase()] || '#A8A878'
}

const getProbabilityLabel = (probability: number): string => {
  if (probability >= 20) return 'Common'
  if (probability >= 10) return 'Uncommon'
  if (probability >= 5) return 'Rare'
  if (probability >= 1) return 'Very Rare'
  return 'Ultra Rare'
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = '/images/not-found.png'
}
</script>

<style scoped>
/* Smooth backdrop fade */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Animation for modal entrance */
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.transform {
  animation: modalEnter 0.3s ease-out;
}
</style>
