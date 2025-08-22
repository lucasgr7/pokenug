<template>
  <div class="flex gap-4 w-full">
    <!-- Player Pokemon -->
    <div class="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
      <div v-if="!activePokemon && hasAnyHealthyPokemon"
        class="p-4 text-center text-gray-500 bg-blue-50">
        <div class="text-lg mb-2">🎮</div>
        <div class="text-xs sm:text-sm">Select a Pokemon from your team</div>
      </div>
      
      <div v-else-if="activePokemon" class="p-3">
        <div class="text-center">
          <div class="text-xs font-bold text-blue-800 mb-2">Your Pokémon</div>
          <div class="relative inline-block">
            <CachedImage 
              :pokemonId="activePokemon.id" 
              :shiny="activePokemon.isShiny" 
              :alt="'Player Pokemon'"
              :className="`w-16 h-16 sm:w-24 sm:h-24 transition-transform duration-200 ${isPlayerAttacking ? 'animate-attack' : ''}`" 
            />
          </div>
          
          <!-- Type Tags -->
          <div class="flex justify-center gap-1 mt-1 mb-2 flex-wrap">
            <span v-for="type in activePokemon.types" :key="type"
              class="px-1 py-0.5 rounded-full text-xs text-white font-medium" :class="getTypeColor(type)">
              {{ type }}
            </span>
          </div>
          
          <!-- Pokemon Info -->
          <div class="bg-gray-50 rounded-lg p-2">
            <div class="flex justify-between items-center mb-1 text-xs">
              <div class="font-medium capitalize truncate">{{ activePokemon.name }}</div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <span class="bg-gray-200 px-1 py-0.5 rounded-full text-xs">
                  Lvl {{ activePokemon.level }}
                </span>
              </div>
            </div>
            <div class="text-xs text-center mb-1">{{ activePokemon.currentHP }}/{{ activePokemon.maxHP }}</div>
            
            <!-- HP Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full transition-all duration-300" :class="{
                'bg-green-500': hpPercentage > 25,
                'bg-yellow-500': hpPercentage <= 25 && hpPercentage > 10,
                'bg-red-500': hpPercentage <= 10
              }" :style="{ width: hpPercentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Wild Pokemon -->
    <div class="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
      <div v-if="wildPokemon" class="relative">
        <!-- Fear Factor Indicator -->
        <div class="absolute left-1 top-1 bottom-1 w-2 flex flex-col items-center z-20">
          <div class="text-red-600 mb-1 text-xs">💀</div>
          <div class="flex-1 w-2 bg-gray-300 rounded-full relative overflow-hidden">
            <div 
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-red-400 rounded-full transition-all duration-500"
              :style="{ height: fearFactorProgress + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="p-3 pl-5">
          <div class="text-center">
            <div class="text-xs font-bold text-red-800 mb-2">Wild Pokémon</div>
            
            <!-- Pokemon Image with Background -->
            <div class="relative h-24 sm:h-32 overflow-hidden rounded-lg mb-2 mx-auto">
              <img :src="getRegionBackgroundImage(currentRegion)" alt="Region Background"
                class="absolute inset-0 w-full h-full object-cover opacity-80" />
              <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 z-10">
                <CachedImage 
                  :pokemonId="wildPokemon.id" 
                  :shiny="wildPokemon.isShiny" 
                  :alt="'Wild Pokemon'" 
                  :className="`w-full h-full transition-transform duration-200 ${isWildPokemonHurt ? 'animate-damage' : ''} ${isEnemyAttacking ? 'animate-enemy-attack' : ''} ${isTryingCatch ? 'animate-catch' : ''}`" 
                />
              </div>
            </div>
            
            <!-- Type Tags -->
            <div class="flex justify-center gap-1 mb-2 flex-wrap">
              <span v-for="type in wildPokemon.types" :key="type" 
                class="px-1 py-0.5 rounded-full text-xs text-white font-medium" :class="getTypeColor(type)">
                {{ type }}
              </span>
            </div>
            
            <!-- Pokemon Info -->
            <div class="bg-gray-50 rounded-lg p-2">
              <div class="flex justify-between items-center mb-1 text-xs">
                <div class="font-medium capitalize truncate">{{ wildPokemon.name }}</div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <span class="bg-gray-200 px-1 py-0.5 rounded-full text-xs">
                    Lvl {{ wildPokemon.level }}
                  </span>
                </div>
              </div>
              <div class="text-xs text-center mb-1">{{ wildPokemon.currentHP }}/{{ wildPokemon.maxHP }}</div>
              
              <!-- HP Bar -->
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-300" :class="{
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
      <div v-else-if="currentRegion === 'Home'" class="p-3">
        <div class="text-center">
          <div class="text-xs font-bold text-green-800 mb-2">🏠 Safe Haven</div>
          <div class="relative h-20 sm:h-24 overflow-hidden rounded-lg mb-2 bg-gradient-to-b from-green-100 to-green-200 flex items-center justify-center mx-auto">
            <img src="/images/home.png" alt="House to relax" class="max-h-full max-w-full object-contain"/>
          </div>
          <div class="text-center text-xs text-green-700 space-y-1">
            <p class="flex items-center justify-center gap-1">
              <span>🌿</span>
              <span class="hidden sm:inline">A peaceful place where your Pokémon can rest.</span>
              <span class="sm:hidden">Rest here</span>
            </p>
            <p class="text-xs text-green-600 bg-green-100 p-2 rounded-lg">
              <span class="font-medium">Ready?</span> 
              <span class="hidden sm:inline">Head to <strong>Viridian Forest</strong>!</span>
              <span class="sm:hidden">Go to <strong>Viridian Forest</strong>!</span>
            </p>
          </div>
        </div>
      </div>
      
      <!-- Other Regions - No Pokemon -->
      <div v-else class="p-3 relative" :class="{
        'bg-red-50': isRegionDisabledByFear
      }">
        <!-- Fear Factor Indicator -->
        <div class="absolute left-1 top-1 bottom-1 w-2 flex flex-col items-center z-20">
          <div class="mb-1 text-xs" :class="{
            'text-red-600': fearFactorProgress > 0,
            'text-gray-400': fearFactorProgress === 0
          }">💀</div>
          <div class="flex-1 w-2 bg-gray-300 rounded-full relative overflow-hidden">
            <div 
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-red-400 rounded-full transition-all duration-500"
              :style="{ height: fearFactorProgress + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="flex items-center justify-center text-center py-6 pl-4">
          <div>
            <div class="text-xl mb-1">
              {{ isRegionDisabledByFear ? '😨' : '🔍' }}
            </div>
            <div class="text-xs text-gray-600">
              <span v-if="isRegionDisabledByFear" class="text-red-600 font-medium">
                Too frightened!<br>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CachedImage from '@/components/CachedImage.vue'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  activePokemon: Pokemon | null
  wildPokemon: Pokemon | null
  hasAnyHealthyPokemon: boolean
  isPlayerAttacking: boolean
  isWildPokemonHurt: boolean
  isEnemyAttacking: boolean
  isTryingCatch: boolean
  currentRegion: string
  fearFactorProgress: number
  isRegionDisabledByFear: boolean
  fearFactorTimeRemaining: number
  getRegionBackgroundImage: (regionId: string) => string
}

const props = defineProps<Props>()

// HP calculations
const hpPercentage = computed(() => {
  if (!props.activePokemon?.currentHP || !props.activePokemon?.maxHP) return 0
  return (props.activePokemon.currentHP / props.activePokemon.maxHP) * 100
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
</style>
