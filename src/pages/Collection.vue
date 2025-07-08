<script lang="ts" setup>
import PokemonGrid from '@/components/PokemonGrid.vue'
import PokemonDetails from '@/components/PokemonDetails.vue'
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import type { Pokemon } from '@/types/pokemon'

const gameStore = useGameStore()

const showParty = ref(true)
const showWorking = ref(true)
const showAvailable = ref(true)
const verticalMode = ref(false)
const columnSize = ref(6)
const itemsPerPage = ref(12)
const selectedPokemon = ref<Pokemon | null>(null)
const searchQuery = ref('')
const selectedType = ref('all')

// Get all unique types from all Pokemon including working ones
const availableTypes = computed(() => {
  const types = new Set<string>()
  const allPokemon = [...gameStore.playerPokemon, ...gameStore.availablePokemon, ...gameStore.idleWorking]
  allPokemon.forEach(pokemon => {
    pokemon.types.forEach(type => types.add(type))
  })
  return Array.from(types).sort()
})

// Filter Pokemon based on search and type, including working Pokemon
const filteredPokemon = computed(() => {
  const allPokemon = [...gameStore.playerPokemon, ...gameStore.availablePokemon, ...gameStore.idleWorking]
  return allPokemon.filter(pokemon => {
    const matchesSearch = pokemon.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesType = selectedType.value === 'all' || pokemon.types.includes(selectedType.value)
    
    // Check status filters
    const location = getPokemonLocation(pokemon)
    const matchesStatus = 
      (location.type === 'party' && showParty.value) ||
      (location.type === 'working' && showWorking.value) ||
      (location.type === 'available' && showAvailable.value)
    
    return matchesSearch && matchesType && matchesStatus
  })
})

// Helper function to determine Pokemon location/status
function getPokemonLocation(pokemon: Pokemon): { type: 'party' | 'available' | 'working', details?: string } {
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

function handlePokemonSelect(pokemon: Pokemon) {
  selectedPokemon.value = pokemon
}

function clearSelection() {
  selectedPokemon.value = null
}

function getTypeColorClass(type: string): string {
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

function getHPPercentage(pokemon: Pokemon): number {
  if (!pokemon.currentHP || !pokemon.maxHP) return 0
  return Math.min(100, (pokemon.currentHP / pokemon.maxHP) * 100)
}

function getHPBarColor(pokemon: Pokemon): string {
  const percentage = getHPPercentage(pokemon)
  if (percentage > 60) return 'bg-green-500'
  if (percentage > 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getStatusBadgeClass(pokemon: Pokemon): string {
  const location = getPokemonLocation(pokemon)
  
  switch (location.type) {
    case 'party':
      return 'bg-blue-100 text-blue-800'
    case 'working':
      return 'bg-purple-100 text-purple-800'
    case 'available':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getStatusText(pokemon: Pokemon): string {
  const location = getPokemonLocation(pokemon)
  
  switch (location.type) {
    case 'party':
      return 'In Party'
    case 'working':
      return location.details ? `Working: ${location.details}` : 'Working'
    case 'available':
      return 'Available'
    default:
      return 'Unknown'
  }
}

// Party management functions
function canAddToParty(pokemon: Pokemon): boolean {
  const location = getPokemonLocation(pokemon)
  return location.type === 'available' && gameStore.playerPokemon.length < 6
}

function canRemoveFromParty(pokemon: Pokemon): boolean {
  const location = getPokemonLocation(pokemon)
  return location.type === 'party' && gameStore.playerPokemon.length > 1
}

function addToParty(pokemon: Pokemon) {
  if (!canAddToParty(pokemon)) return
  
  gameStore.addPokemonToParty(pokemon)
  // Force reactivity update
  selectedPokemon.value = { ...pokemon }
}

function removeFromParty(pokemon: Pokemon) {
  if (!canRemoveFromParty(pokemon)) return
  
  gameStore.removePokemonFromParty(pokemon)
  // Force reactivity update
  selectedPokemon.value = { ...pokemon }
}</script>
<template>
    <div class="h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4">
        <!-- Pokédex Header -->
        <div class="bg-red-600 rounded-t-lg shadow-2xl border-4 border-red-700 p-6 mb-0">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <!-- Pokédex Logo -->
                    <div class="w-16 h-16 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                        <div class="w-8 h-8 bg-blue-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                        <h1 class="text-3xl font-bold text-white">Pokédex</h1>
                        <p class="text-red-100">Digital Encyclopedia</p>
                    </div>
                </div>
                
                <!-- Status Lights -->
                <div class="flex space-x-2">
                    <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div class="w-3 h-3 bg-red-400 rounded-full"></div>
                </div>
            </div>
        </div>

        <!-- Main Pokédex Body -->
        <div class="bg-red-500 border-4 border-red-600 rounded-b-lg shadow-2xl h-[calc(100vh-120px)]">
            <!-- Control Panel -->
            <div class="bg-gray-800 p-4 border-b-4 border-gray-700">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <!-- Search Bar -->
                    <div class="lg:col-span-2">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Search Pokémon</label>
                        <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Enter Pokémon name..."
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                    </div>

                    <!-- Type Filter -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Filter by Type</label>
                        <select 
                            v-model="selectedType"
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option v-for="type in availableTypes" :key="type" :value="type" class="capitalize">
                                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                            </option>
                        </select>
                    </div>

                    <!-- Display Options -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Status Filter</label>
                        <div class="flex flex-wrap gap-2">
                            <button
                                @click="showParty = !showParty"
                                :class="showParty ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                                class="px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                                Party
                            </button>
                            <button
                                @click="showWorking = !showWorking"
                                :class="showWorking ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                                class="px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                                Working
                            </button>
                            <button
                                @click="showAvailable = !showAvailable"
                                :class="showAvailable ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                                class="px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                                Available
                            </button>
                            <button
                                @click="clearSelection"
                                class="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex h-[calc(100%-80px)]">
                <!-- Left Panel - Pokemon List -->
                <div class="w-1/2 bg-gray-100 border-r-4 border-gray-300 overflow-hidden">
                    <div class="h-full flex flex-col">
                        <!-- List Header -->
                        <div class="bg-blue-600 text-white p-3 border-b-2 border-blue-700">
                            <h2 class="font-bold text-lg">
                                Pokémon Collection ({{ filteredPokemon.length }})
                            </h2>
                            <div class="text-xs mt-1 flex space-x-4">
                                <span>Party: {{ gameStore.playerPokemon.length }}</span>
                                <span>Working: {{ gameStore.idleWorking.length }}</span>
                                <span>Available: {{ gameStore.availablePokemon.length }}</span>
                            </div>
                        </div>

                        <!-- Column Headers for Compact View -->
                        <div class="bg-gray-200 px-2 py-1 border-b text-xs text-gray-600 font-medium">
                            <div class="flex items-center space-x-2">
                                <div class="w-8 h-8 flex-shrink-0"></div> <!-- Image space -->
                                <div class="flex-1 grid grid-cols-12 gap-1">
                                    <div class="col-span-3">Name / ID</div>
                                    <div class="col-span-1 text-center">Lv</div>
                                    <div class="col-span-3">Type</div>
                                    <div class="col-span-2">Health</div>
                                    <div class="col-span-2">Status</div>
                                    <div class="col-span-1 text-right">Action</div>
                                </div>
                            </div>
                        </div>

                        <!-- Pokemon List -->
                        <div class="flex-1 overflow-y-auto p-2">
                            <div v-if="filteredPokemon.length === 0" class="text-center py-8 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p>No Pokémon found</p>
                            </div>

                            <div 
                                v-for="pokemon in filteredPokemon" 
                                :key="pokemon.uniqueId || `${pokemon.name}-${pokemon.level}`"
                                @click="handlePokemonSelect(pokemon)"
                                :class="selectedPokemon === pokemon ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'"
                                class="p-2 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md mb-1 relative group"
                            >
                                <div class="flex items-center space-x-2">
                                    <!-- Pokemon Image -->
                                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                                        <img 
                                            :src="pokemon.sprite" 
                                            :alt="pokemon.name"
                                            class="w-6 h-6 object-contain"
                                            @error="(e) => (e.target as HTMLImageElement).src = '/images/not-found.png'"
                                        />
                                    </div>

                                    <!-- Pokemon Info - Compact Horizontal Layout -->
                                    <div class="flex-1 min-w-0 grid grid-cols-12 gap-1 items-center text-xs">
                                        <!-- Name & ID -->
                                        <div class="col-span-3">
                                            <div class="font-medium text-gray-900 capitalize truncate">{{ pokemon.name }}</div>
                                            <div class="text-gray-500">#{{ pokemon.id.toString().padStart(3, '0') }}</div>
                                        </div>
                                        
                                        <!-- Level -->
                                        <div class="col-span-1 text-center">
                                            <div class="text-blue-600 font-medium">{{ pokemon.level || 1 }}</div>
                                        </div>

                                        <!-- Types -->
                                        <div class="col-span-3 flex space-x-1">
                                            <span 
                                                v-for="type in pokemon.types.slice(0, 2)" 
                                                :key="type"
                                                class="px-1 py-0.5 text-xs rounded text-white flex-shrink-0"
                                                :class="getTypeColorClass(type)"
                                                :title="type"
                                            >
                                                {{ type.charAt(0).toUpperCase() + type.slice(1, 3) }}
                                            </span>
                                        </div>

                                        <!-- HP Bar -->
                                        <div class="col-span-2">
                                            <div class="w-full bg-gray-200 rounded-full h-1">
                                                <div 
                                                    class="h-1 rounded-full transition-all duration-300"
                                                    :class="getHPBarColor(pokemon)"
                                                    :style="{ width: getHPPercentage(pokemon) + '%' }"
                                                    :title="`${pokemon.currentHP || 0}/${pokemon.maxHP || 0} HP`"
                                                ></div>
                                            </div>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-span-2">
                                            <span 
                                                class="inline-flex items-center px-1 py-0.5 text-xs font-medium rounded-full truncate"
                                                :class="getStatusBadgeClass(pokemon)"
                                                :title="getStatusText(pokemon)"
                                            >
                                                <svg 
                                                    class="w-1.5 h-1.5 mr-1 flex-shrink-0" 
                                                    fill="currentColor" 
                                                    viewBox="0 0 8 8"
                                                >
                                                    <circle cx="4" cy="4" r="3"/>
                                                </svg>
                                                {{ getStatusText(pokemon).split(':')[0] }}
                                            </span>
                                        </div>

                                        <!-- Actions -->
                                        <div class="col-span-1 flex justify-end">
                                            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <!-- Add to Party Button -->
                                                <button
                                                    v-if="canAddToParty(pokemon)"
                                                    @click.stop="addToParty(pokemon)"
                                                    class="w-5 h-5 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                                                    title="Add to Party"
                                                >
                                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                    </svg>
                                                </button>
                                                <!-- Remove from Party Button -->
                                                <button
                                                    v-else-if="canRemoveFromParty(pokemon)"
                                                    @click.stop="removeFromParty(pokemon)"
                                                    class="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                                                    title="Remove from Party"
                                                >
                                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                                                    </svg>
                                                </button>
                                                <!-- Working/Unavailable indicator -->
                                                <div
                                                    v-else
                                                    class="w-5 h-5 bg-gray-400 text-white rounded-full flex items-center justify-center"
                                                    title="Cannot modify while working or party full"
                                                >
                                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Panel - Pokemon Details -->
                <div class="w-1/2 bg-gray-50">
                    <PokemonDetails 
                        :pokemon="selectedPokemon" 
                        :can-add-to-party="selectedPokemon ? canAddToParty(selectedPokemon) : false"
                        :can-remove-from-party="selectedPokemon ? canRemoveFromParty(selectedPokemon) : false"
                        @add-to-party="addToParty"
                        @remove-from-party="removeFromParty"
                    />
                </div>
            </div>
        </div>
    </div>
</template>