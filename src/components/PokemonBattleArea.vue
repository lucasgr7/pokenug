<template>
  <div class="space-y-4">
    <!-- Player Pokemon Card -->
    <div class="bg-white rounded-xl shadow-lg p-4">
      <div class="text-center mb-2">
        <h3 class="text-lg font-bold text-blue-700">Your Pokémon</h3>
      </div>
      
      <div v-if="!activePokemon && hasAnyHealthyPokemon" 
           class="flex items-center justify-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <p class="text-sm">Tap team button to select a Pokemon</p>
        </div>
      </div>
      
      <div v-else-if="activePokemon" class="space-y-3">
        <!-- Pokemon Image and Info -->
        <div class="flex items-center space-x-4">
          <div class="relative">
            <CachedImage
              :pokemonId="activePokemon.id"
              :shiny="activePokemon.isShiny"
              :alt="activePokemon.name"
              :className="'w-16 h-16 object-contain'"
            />
            <div v-if="activePokemon.isShiny" class="absolute -top-1 -right-1 text-lg">✨</div>
          </div>
          <div class="flex-1">
            <h4 class="font-bold text-lg capitalize" :class="activePokemon.isShiny ? 'text-yellow-600' : 'text-gray-800'">
              {{ activePokemon.name }}
            </h4>
            <p class="text-sm text-gray-600">Level {{ activePokemon.level }}</p>
            <div class="flex items-center space-x-1 text-xs mt-1">
              <span v-for="type in activePokemon.types" :key="type" 
                    class="px-2 py-1 rounded-full text-white" 
                    :class="getTypeColor(type)">
                {{ type }}
              </span>
            </div>
          </div>
        </div>

        <!-- HP Bar -->
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="font-medium">HP</span>
            <span>{{ Math.floor(activePokemon.currentHP!) }}/{{ activePokemon.maxHP }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div class="h-full transition-all duration-300 rounded-full"
                 :class="{
                   'bg-green-500': hpPercentage > 50,
                   'bg-yellow-500': hpPercentage <= 50 && hpPercentage > 25,
                   'bg-red-500': hpPercentage <= 25
                 }"
                 :style="{ width: hpPercentage + '%' }">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Wild Pokemon Card -->
    <div class="bg-white rounded-xl shadow-lg p-4">
      <div class="text-center mb-2">
        <h3 class="text-lg font-bold text-red-700">Wild Pokémon</h3>
      </div>
      
      <div v-if="wildPokemon" class="space-y-3">
        <!-- Pokemon Image and Info -->
        <div class="flex items-center space-x-4">
          <div class="relative">
            <CachedImage
              :pokemonId="wildPokemon.id"
              :shiny="wildPokemon.isShiny"
              :alt="wildPokemon.name"
              :className="'w-16 h-16 object-contain'"
            />
            <div v-if="wildPokemon.isShiny" class="absolute -top-1 -right-1 text-lg">✨</div>
          </div>
          <div class="flex-1">
            <h4 class="font-bold text-lg capitalize" :class="wildPokemon.isShiny ? 'text-yellow-600' : 'text-gray-800'">
              {{ wildPokemon.name }}
            </h4>
            <p class="text-sm text-gray-600">Level {{ wildPokemon.level }}</p>
            <div class="flex items-center space-x-1 text-xs mt-1">
              <span v-for="type in wildPokemon.types" :key="type" 
                    class="px-2 py-1 rounded-full text-white" 
                    :class="getTypeColor(type)">
                {{ type }}
              </span>
            </div>
          </div>
        </div>

        <!-- HP Bar -->
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="font-medium">HP</span>
            <span>{{ Math.floor(wildPokemon.currentHP!) }}/{{ wildPokemon.maxHP }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div class="h-full bg-red-500 transition-all duration-300 rounded-full"
                 :style="{ width: wildPokemonHpPercentage + '%' }">
            </div>
          </div>
        </div>
      </div>
      
      <!-- No Pokemon State -->
      <div v-else-if="currentRegion === 'Home'" class="text-center py-8">
        <div class="text-6xl mb-2">🏠</div>
        <h4 class="font-bold text-green-700 mb-2">Safe Haven</h4>
        <p class="text-sm text-green-600">You're home! Select a region above to start exploring.</p>
      </div>
      
      <div v-else class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">🔍</div>
        <p class="text-sm">Searching for Pokemon...</p>
        <p class="text-xs mt-1">Next spawn in: {{ Math.ceil(spawnTimer) }}s</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CachedImage from './CachedImage.vue'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  activePokemon: Pokemon | null
  wildPokemon: Pokemon | null
  hasAnyHealthyPokemon: boolean
  currentRegion: string
  spawnTimer: number
}

const props = defineProps<Props>()

const hpPercentage = computed(() => {
  if (!props.activePokemon?.currentHP || !props.activePokemon?.maxHP) return 0
  return (props.activePokemon.currentHP / props.activePokemon.maxHP) * 100
})

const wildPokemonHpPercentage = computed(() => {
  if (!props.wildPokemon?.currentHP || !props.wildPokemon?.maxHP) return 0
  return (props.wildPokemon.currentHP / props.wildPokemon.maxHP) * 100
})

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
