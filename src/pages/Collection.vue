<script lang="ts" setup>
import PokemonGrid from '@/components/PokemonGrid.vue'
import PokemonDetails from '@/components/PokemonDetails.vue'
import CachedImage from '@/components/CachedImage.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import type { Pokemon } from '@/types/pokemon'

const gameStore = useGameStore()

const showParty = ref(true)
const showWorking = ref(true)
const showAvailable = ref(true)
const selectedPokemon = ref<Pokemon | null>(null)
const searchQuery = ref('')
const selectedType = ref('all')

// Pagination
const currentPage = ref(1)
const itemsPerPage = 9 

// Modal state
const showReleaseModal = ref(false)
const pokemonToRelease = ref<Pokemon | null>(null)

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

// Pagination computed properties
const totalPages = computed(() => Math.ceil(filteredPokemon.value.length / itemsPerPage))

const paginatedPokemon = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredPokemon.value.slice(start, end)
})

// Reset to first page when filters change
function resetPagination() {
  currentPage.value = 1
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

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

function canReleasePokemon(pokemon: Pokemon): boolean {
  const location = getPokemonLocation(pokemon)
  
  // Cannot release working Pokemon
  if (location.type === 'working') return false
  
  // Must have at least one Pokemon remaining (total count check)
  const totalPokemon = gameStore.playerPokemon.length + gameStore.availablePokemon.length
  if (totalPokemon <= 1) return false
  
  // If releasing from party, ensure we'll still have at least one Pokemon in party
  if (location.type === 'party') {
    const remainingPartyCount = gameStore.playerPokemon.length - 1
    const totalAvailable = gameStore.availablePokemon.length
    
    // Must have at least one Pokemon total after release
    if (remainingPartyCount + totalAvailable < 1) return false
    
    // If party would be empty, ensure there's at least one available Pokemon to move to party
    if (remainingPartyCount === 0 && totalAvailable === 0) return false
  }
  
  return true
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
}

function releasePokemon(pokemon: Pokemon) {
  if (!canReleasePokemon(pokemon)) return
  
  // Show confirmation modal instead of browser confirm
  pokemonToRelease.value = pokemon
  showReleaseModal.value = true
}

function confirmRelease() {
  if (!pokemonToRelease.value) return
  
  const pokemon = pokemonToRelease.value
  
  // Use the new releasePokemon method from gameStore
  gameStore.releasePokemon(pokemon)
  
  // Clear selection if the released Pokemon was selected
  if (selectedPokemon.value === pokemon) {
    selectedPokemon.value = null
  }
  
  // Show notification
  gameStore.addNotification(`${pokemon.name} has been released!`, 'info')
  
  // Close modal and reset
  closeReleaseModal()
}

function closeReleaseModal() {
  showReleaseModal.value = false
  pokemonToRelease.value = null
}

// Watch for filter changes to reset pagination
watch([searchQuery, selectedType, showParty, showWorking, showAvailable], () => {
  resetPagination()
});</script>
<template>
    <div class="h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-0 m-0">
        <!-- Pokédex Header -->
        <div class="bg-red-600 rounded-t-lg shadow-2xl border-4 border-red-700 p-2 mb-0">
            <div class="flex items-center justify-between min-h-0">
                <div class="flex items-center space-x-2">
                    <!-- Pokédex Logo -->
                    <div class="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                        <div class="w-4 h-4 bg-blue-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                        <h1 class="text-lg font-bold text-white leading-tight">Pokédex</h1>
                        <p class="text-xs text-red-100 leading-tight">Digital Encyclopedia</p>
                    </div>
                </div>
                
                <!-- Status Lights -->
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                </div>
            </div>
        </div>

        <!-- Main Pokédex Body -->
        <div class="bg-red-500 border-4 border-red-600 rounded-b-lg shadow-2xl h-[calc(100vh-64px)]">
            <!-- Control Panel -->
            <div class="bg-gray-800 p-2 border-b-4 border-gray-700">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-2 items-center">
                    <!-- Search Bar -->
                    <div class="lg:col-span-2">
                        <label class="block text-xs font-medium text-gray-300 mb-1">Search Pokémon</label>
                        <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Enter Pokémon name..."
                            class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                    </div>

                    <!-- Type Filter -->
                    <div>
                        <label class="block text-xs font-medium text-gray-300 mb-1">Filter by Type</label>
                        <select 
                            v-model="selectedType"
                            class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            <option value="all">All Types</option>
                            <option v-for="type in availableTypes" :key="type" :value="type" class="capitalize">
                                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                            </option>
                        </select>
                    </div>

                    <!-- Display Options -->
                    <div>
                        <label class="block text-xs font-medium text-gray-300 mb-1">Status Filter</label>
                        <div class="flex flex-wrap gap-1">
                            <button
                                @click="showParty = !showParty"
                                :class="showParty ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                                class="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                            >
                                Party
                            </button>
                            <button
                                @click="showWorking = !showWorking"
                                :class="showWorking ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                                class="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                            >
                                Working
                            </button>
                            <button
                                @click="showAvailable = !showAvailable"
                                :class="showAvailable ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                                class="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                            >
                                Available
                            </button>
                            <button
                                @click="clearSelection"
                                class="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
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
                            <div class="text-xs mt-1 flex justify-between items-center">
                                <div class="flex space-x-4">
                                    <span>Party: {{ gameStore.playerPokemon.length }}</span>
                                    <span>Working: {{ gameStore.idleWorking.length }}</span>
                                    <span>Available: {{ gameStore.availablePokemon.length }}</span>
                                </div>
                                <div v-if="totalPages > 1" class="text-xs">
                                    Page {{ currentPage }} of {{ totalPages }}
                                </div>
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
                        <div class="flex-1 p-2">
                            <div v-if="filteredPokemon.length === 0" class="text-center py-8 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p>No Pokémon found</p>
                            </div>

                            <div 
                                v-for="pokemon in paginatedPokemon" 
                                :key="pokemon.uniqueId || `${pokemon.name}-${pokemon.level}`"
                                @click="handlePokemonSelect(pokemon)"
                                :class="selectedPokemon === pokemon ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'"
                                class="p-2 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md mb-1 relative group"
                            >
                                <div class="flex items-center space-x-2">
                                    <!-- Pokemon Image -->
                                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                                        <CachedImage
                                            :pokemonId="pokemon.id"
                                            :shiny="pokemon.isShiny"
                                            :alt="pokemon.name"
                                            :className="'w-6 h-6 object-contain'"
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
                                            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1">
                                                <!-- Release Button -->
                                                <button
                                                    v-if="canReleasePokemon(pokemon)"
                                                    @click.stop="releasePokemon(pokemon)"
                                                    class="w-4 h-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-colors"
                                                    title="Release Pokémon"
                                                >
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                                
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
                                                    v-else-if="!canAddToParty(pokemon) && !canRemoveFromParty(pokemon)"
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

                        <!-- Pagination Controls -->
                        <div v-if="totalPages > 1" class="bg-gray-200 p-2 border-t">
                            <div class="flex items-center justify-between">
                                <button
                                    @click="goToPage(currentPage - 1)"
                                    :disabled="currentPage === 1"
                                    :class="currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'"
                                    class="px-3 py-1 rounded text-sm font-medium transition-colors"
                                >
                                    Previous
                                </button>
                                
                                <div class="flex space-x-1">
                                    <button
                                        v-for="page in Math.min(totalPages, 5)"
                                        :key="page"
                                        @click="goToPage(page)"
                                        :class="page === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
                                        class="w-8 h-8 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                    >
                                        {{ page }}
                                    </button>
                                    <span v-if="totalPages > 5" class="flex items-center px-2 text-gray-500">...</span>
                                    <button
                                        v-if="totalPages > 5 && currentPage < totalPages - 2"
                                        @click="goToPage(totalPages)"
                                        :class="totalPages === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
                                        class="w-8 h-8 rounded text-sm font-medium transition-colors flex items-center justify-center"
                                    >
                                        {{ totalPages }}
                                    </button>
                                </div>
                                
                                <button
                                    @click="goToPage(currentPage + 1)"
                                    :disabled="currentPage === totalPages"
                                    :class="currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'"
                                    class="px-3 py-1 rounded text-sm font-medium transition-colors"
                                >
                                    Next
                                </button>
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
                        :can-release="selectedPokemon ? canReleasePokemon(selectedPokemon) : false"
                        @add-to-party="addToParty"
                        @remove-from-party="removeFromParty"
                        @release-pokemon="releasePokemon"
                    />
                </div>
            </div>
        </div>
    </div>

    <!-- Release Confirmation Modal -->
    <ConfirmationModal
        :is-visible="showReleaseModal"
        type="danger"
        title="Release Pokémon"
        :message="`Are you sure you want to release ${pokemonToRelease?.name}? This action cannot be undone and the Pokémon will be permanently removed from your collection.`"
        subtitle="This action is irreversible"
        confirm-text="Release"
        cancel-text="Keep"
        @confirm="confirmRelease"
        @cancel="closeReleaseModal"
    >
        <template #details v-if="pokemonToRelease">
            <div class="flex items-center space-x-3">
                <CachedImage
                    v-if="pokemonToRelease"
                    :pokemonId="pokemonToRelease.id"
                    :shiny="pokemonToRelease.isShiny"
                    :alt="pokemonToRelease.name"
                    :className="'w-12 h-12 object-contain'"
                />
                <div>
                    <div class="font-medium text-gray-900 capitalize">{{ pokemonToRelease.name }}</div>
                    <div class="text-sm text-gray-500">Level {{ pokemonToRelease.level || 1 }} • {{ getStatusText(pokemonToRelease) }}</div>
                    <div class="flex space-x-1 mt-1">
                        <span 
                            v-for="type in pokemonToRelease.types" 
                            :key="type"
                            class="px-2 py-0.5 text-xs rounded text-white"
                            :class="getTypeColorClass(type)"
                        >
                            {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                        </span>
                    </div>
                </div>
            </div>
        </template>
    </ConfirmationModal>
</template>