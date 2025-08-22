<template>
  <div class="pokemon-details bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-blue-200 h-full overflow-y-auto">
    <div v-if="!pokemon" class="flex items-center justify-center h-full text-gray-500">
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-lg font-medium">Select a Pokémon</p>
        <p class="text-sm">Click on any Pokémon to view its details</p>
      </div>
    </div>

    <div v-else class="p-3">
      <!-- Header with Pokemon Image and Basic Info -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-3">
        <div class="flex items-center space-x-4">
          <!-- Pokemon Image -->
          <div class="flex-shrink-0">
            <div class="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border-2 border-white shadow-md relative">
              <img 
                :src="pokemon.isShiny && pokemon.shinySprite ? pokemon.shinySprite : pokemon.sprite" 
                :alt="pokemon.name"
                class="w-16 h-16 object-contain"
                @error="handleImageError"
              />
              <!-- Shiny indicator -->
              <div v-if="pokemon.isShiny" class="absolute -top-1 -right-1 text-lg">✨</div>
            </div>
          </div>

          <!-- Basic Info -->
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-xl font-bold text-gray-900 capitalize">{{ pokemon.name }}</h2>
              <span class="text-sm font-semibold text-gray-600">#{{ pokemon.id.toString().padStart(3, '0') }}</span>
            </div>
            
            <!-- Types -->
            <div class="flex space-x-1 mb-2">
              <span 
                v-for="type in pokemon.types" 
                :key="type"
                :class="getTypeColor(type)"
                class="px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
              >
                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
              </span>
            </div>

            <!-- Level and Experience -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700">Level</span>
                <span class="text-sm font-bold text-blue-600">{{ pokemon.level || 1 }}</span>
              </div>
              
              <div v-if="pokemon.experience !== undefined" class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-gray-600">EXP</span>
                  <span class="font-medium">{{ pokemon.experience || 0 }}/{{ pokemon.experienceToNextLevel || 100 }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    class="bg-gradient-to-r from-green-400 to-green-600 h-1 rounded-full transition-all duration-300"
                    :style="{ width: experiencePercentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Party Management & Stats Combined Section -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-3">
        <div class="grid grid-cols-2 gap-4">
          <!-- Party Management -->
          <div>
            <h3 class="text-sm font-bold text-gray-900 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Party
            </h3>

            <!-- Current Status -->
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
              <div class="flex items-center space-x-2">
                <div 
                  class="w-2 h-2 rounded-full"
                  :class="{
                    'bg-blue-500': getPokemonLocation(pokemon).type === 'party',
                    'bg-purple-500': getPokemonLocation(pokemon).type === 'working',
                    'bg-green-500': getPokemonLocation(pokemon).type === 'available'
                  }"
                ></div>
                <span class="text-xs font-medium text-gray-700">Status:</span>
              </div>
              <span 
                class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                :class="{
                  'bg-blue-100 text-blue-800': getPokemonLocation(pokemon).type === 'party',
                  'bg-purple-100 text-purple-800': getPokemonLocation(pokemon).type === 'working',
                  'bg-green-100 text-green-800': getPokemonLocation(pokemon).type === 'available'
                }"
              >
                {{ getPokemonLocation(pokemon).type === 'party' ? 'In Party' : 
                   getPokemonLocation(pokemon).type === 'working' ? 'Working' : 
                   'Available' }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col space-y-2">
              <button
                v-if="canAddToParty"
                @click="emit('add-to-party', pokemon!)"
                class="w-full flex items-center justify-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors duration-200"
              >
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add to Party
              </button>
              
              <button
                v-else-if="canRemoveFromParty"
                @click="emit('remove-from-party', pokemon!)"
                class="w-full flex items-center justify-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors duration-200"
              >
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                </svg>
                Remove from Party
              </button>

              <div 
                v-else
                class="w-full flex items-center justify-center px-3 py-1.5 bg-gray-400 text-white text-xs font-medium rounded cursor-not-allowed"
              >
                {{ getPokemonLocation(pokemon).type === 'working' ? 'Working' : 'Party Full' }}
              </div>

              <!-- Release Button -->
              <button
                v-if="canRelease"
                @click="emit('release-pokemon', pokemon!)"
                class="w-full flex items-center justify-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition-colors duration-200"
              >
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Release Pokémon
              </button>
            </div>

            <!-- Party Info -->
            <div class="text-xs text-gray-600 bg-blue-50 p-2 rounded mt-2">
              <div class="flex items-center justify-between">
                <span>Party size:</span>
                <span class="font-medium">{{ gameStore.playerPokemon.length }}/6</span>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div>
            <h3 class="text-sm font-bold text-gray-900 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
              Stats
            </h3>

            <div class="space-y-2">
              <!-- HP Stat -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-gray-700">HP</span>
                  <span class="text-xs font-bold text-red-600">{{ pokemon.currentHP || 0 }}/{{ pokemon.maxHP || 0 }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    class="bg-gradient-to-r from-red-400 to-red-600 h-1.5 rounded-full transition-all duration-300"
                    :style="{ width: hpPercentage + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Attack Stat -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-gray-700">Attack</span>
                  <span class="text-xs font-bold text-orange-600">{{ pokemon.attack || 0 }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    class="bg-gradient-to-r from-orange-400 to-orange-600 h-1 rounded-full"
                    :style="{ width: getStatPercentage(pokemon.attack || 0, 200) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Defense Stat -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-gray-700">Defense</span>
                  <span class="text-xs font-bold text-blue-600">{{ pokemon.defense || 0 }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    class="bg-gradient-to-r from-blue-400 to-blue-600 h-1 rounded-full"
                    :style="{ width: getStatPercentage(pokemon.defense || 0, 200) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status & Activity Section -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-3">
        <h3 class="text-sm font-bold text-gray-900 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Status & Activity
        </h3>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="text-xs text-gray-600">Condition</span>
            <div class="flex items-center mt-1">
              <div 
                :class="getStatusColor()"
                class="w-2 h-2 rounded-full mr-2"
              ></div>
              <span class="text-xs font-medium">{{ getStatusText() }}</span>
            </div>
          </div>

          <div v-if="pokemon?.faintedAt">
            <span class="text-xs text-gray-600">Recovery</span>
            <span class="text-xs font-medium text-red-600 block mt-1">{{ getRecoveryTime() }}</span>
          </div>

          <div v-if="pokemon?.workId" class="col-span-2">
            <span class="text-xs text-gray-600">Working Job</span>
            <div class="mt-1">
              <span class="text-xs font-medium text-purple-600 block">{{ getWorkingJobName() }}</span>
              
              <!-- Job Progress -->
              <div v-if="getJobProgress() !== null" class="mt-1">
                <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{{ Math.round(getJobProgress() || 0) }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    class="bg-gradient-to-r from-purple-400 to-purple-600 h-1 rounded-full transition-all duration-300"
                    :style="{ width: (getJobProgress() || 0) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span class="text-xs text-gray-600">Unique ID</span>
            <span class="font-mono text-xs text-gray-500 block mt-1 truncate">{{ pokemon?.uniqueId || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- Additional Info Section - Compact -->
      <div class="bg-white rounded-lg shadow-sm p-4">
        <h3 class="text-sm font-bold text-gray-900 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Details
        </h3>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex justify-between py-1 border-b border-gray-100">
            <span class="text-gray-600">Species</span>
            <span class="font-medium capitalize truncate">{{ pokemon?.name }}</span>
          </div>
          
          <div class="flex justify-between py-1 border-b border-gray-100">
            <span class="text-gray-600">Types</span>
            <span class="font-medium">{{ pokemon?.types.length }}</span>
          </div>

          <div v-if="pokemon?.lastAttackTime" class="col-span-2 flex justify-between py-1">
            <span class="text-gray-600">Last Battle</span>
            <span class="font-medium text-blue-600">{{ formatLastBattle() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  pokemon: Pokemon | null
  canAddToParty?: boolean
  canRemoveFromParty?: boolean
  canRelease?: boolean
}

interface Emits {
  (e: 'add-to-party', pokemon: Pokemon): void
  (e: 'remove-from-party', pokemon: Pokemon): void
  (e: 'release-pokemon', pokemon: Pokemon): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const gameStore = useGameStore()

const experiencePercentage = computed(() => {
  if (!props.pokemon?.experience || !props.pokemon?.experienceToNextLevel) return 0
  return Math.min(100, (props.pokemon.experience / props.pokemon.experienceToNextLevel) * 100)
})

const hpPercentage = computed(() => {
  if (!props.pokemon?.currentHP || !props.pokemon?.maxHP) return 0
  return Math.min(100, (props.pokemon.currentHP / props.pokemon.maxHP) * 100)
})

// Helper function to determine Pokemon location/status  
function getPokemonLocation(pokemon: Pokemon | null): { type: 'party' | 'available' | 'working', details?: string } {
  if (!pokemon) return { type: 'available' }
  
  // Check if it's working first (most specific check)
  if (pokemon.workId) {
    // Find which job this Pokemon is working on
    for (const [jobId, job] of Object.entries(gameStore.idleJobs)) {
      if (job.assignedPokemon.some(p => p.workId === pokemon.workId)) {
        return { type: 'working', details: job.name }
      }
    }
    return { type: 'working', details: 'Unknown Job' }
  }
  
  // Check if it's in the party (use uniqueId first, fallback to name/level)
  const isInParty = gameStore.playerPokemon.some(p => {
    if (pokemon.uniqueId && p.uniqueId) {
      return p.uniqueId === pokemon.uniqueId
    }
    return p.name === pokemon.name && p.level === pokemon.level && !p.workId
  })
  
  if (isInParty) {
    return { type: 'party' }
  }
  
  // Otherwise it's available
  return { type: 'available' }
}

function getStatPercentage(value: number, max: number = 100): number {
  return Math.min(100, (value / max) * 100)
}

function getTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    normal: 'bg-gray-400',
    fighting: 'bg-red-700',
    flying: 'bg-indigo-400',
    poison: 'bg-purple-500',
    ground: 'bg-yellow-600',
    rock: 'bg-yellow-800',
    bug: 'bg-green-400',
    ghost: 'bg-purple-700',
    steel: 'bg-gray-500',
    fire: 'bg-red-500',
    water: 'bg-blue-500',
    grass: 'bg-green-500',
    electric: 'bg-yellow-400',
    psychic: 'bg-pink-500',
    ice: 'bg-blue-300',
    dragon: 'bg-indigo-700',
    dark: 'bg-gray-800',
    fairy: 'bg-pink-300'
  }
  return typeColors[type.toLowerCase()] || 'bg-gray-400'
}

function getStatusColor(): string {
  if (!props.pokemon) return 'bg-gray-400'
  
  if (props.pokemon.faintedAt) return 'bg-red-500'
  if (props.pokemon.workId) return 'bg-purple-500'
  if ((props.pokemon.currentHP || 0) < (props.pokemon.maxHP || 1) * 0.3) return 'bg-yellow-500'
  
  return 'bg-green-500'
}

function getStatusText(): string {
  if (!props.pokemon) return 'Unknown'
  
  if (props.pokemon.faintedAt) return 'Fainted'
  if (props.pokemon.workId) return 'Working'
  if ((props.pokemon.currentHP || 0) < (props.pokemon.maxHP || 1) * 0.3) return 'Low HP'
  
  return 'Healthy'
}

function getRecoveryTime(): string {
  if (!props.pokemon?.recoveryEndTime) return 'N/A'
  
  const remaining = props.pokemon.recoveryEndTime - Date.now()
  if (remaining <= 0) return 'Ready'
  
  const seconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

function formatLastBattle(): string {
  if (!props.pokemon?.lastAttackTime) return 'Never'
  
  const now = Date.now()
  const diff = now - props.pokemon.lastAttackTime
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

function getWorkingJobName(): string {
  if (!props.pokemon?.workId) return 'Unknown Job'
  
  // Find which job this Pokemon is working on
  for (const [jobId, job] of Object.entries(gameStore.idleJobs)) {
    if (job.assignedPokemon.some(p => p.workId === props.pokemon?.workId)) {
      return job.name
    }
  }
  
  return 'Unknown Job'
}

function getJobProgress(): number | null {
  if (!props.pokemon?.workId) return null
  
  // Find which job this Pokemon is working on and return its progress
  for (const [jobId, job] of Object.entries(gameStore.idleJobs)) {
    if (job.assignedPokemon.some(p => p.workId === props.pokemon?.workId)) {
      return job.progress || 0
    }
  }
  
  return null
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.src = '/images/not-found.png'
}
</script>

<style scoped>
.pokemon-details {
  min-height: 500px;
}

.stat-row {
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: linear-gradient(to right, #f9fafb, #f3f4f6);
}

.status-item {
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
}

/* Smooth animations for stat bars */
.transition-all {
  transition: all 0.3s ease-in-out;
}

/* Custom scrollbar for the details panel */
.pokemon-details::-webkit-scrollbar {
  width: 4px;
}

.pokemon-details::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.pokemon-details::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.pokemon-details::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Compact spacing */
.text-xs {
  line-height: 1.2;
}
</style>
