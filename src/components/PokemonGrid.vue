<script setup lang="ts">
import { ref, computed, defineProps } from 'vue'
import { useGameStore } from '../stores/gameStore'
import PokemonSlot from './PokemonSlot.vue'
import type { Pokemon } from '../types/pokemon'

const props = defineProps({
  filterType: {
    type: String,
    default: ''
  },
  showParty: {
    type: Boolean,
    default: true
  },
  verticalMode: {
    type: Boolean,
    default: false
  },
  columnSize: {
    type: Number,
    default: 6
  },
  itemsPerPage: {
    type: Number,
    default: 12
  }
})

const gameStore = useGameStore()
const isDraggingOver = ref<number | 'available' | null>(null)
const currentPage = ref(1)

// Get party Pokemon (those in active battle team) - without any filtering
const partyPokemon = computed(() => {
  return [...gameStore.playerPokemon];
})

// Get all Pokemon from inventory that aren't in the team or working
const allAvailablePokemon = computed(() => {
  return [...gameStore.availablePokemon].filter(pokemon => {
    
    // When filtering by type for idle jobs, only show matching types
    if (props.filterType) {
      return pokemon.types.includes(props.filterType);
    }
    return true;
  });
})

// Paginated available Pokemon when in vertical mode
const availablePokemon = computed(() => {
  if (!props.verticalMode) {
    return allAvailablePokemon.value;
  }

  const startIndex = (currentPage.value - 1) * props.itemsPerPage;
  const endIndex = startIndex + props.itemsPerPage;
  return allAvailablePokemon.value.slice(startIndex, endIndex);
})

// Calculate total number of pages
const totalPages = computed(() => {
  if (!props.verticalMode) {
    return 1;
  }
  return Math.ceil(allAvailablePokemon.value.length / props.itemsPerPage);
})

// Move to next page
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

// Move to previous page
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

// Go to specific page
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function isWorkingInJob(pokemon: Pokemon): boolean {
  // Check if this Pokemon is currently assigned to any job
  return gameStore.idleWorking.some(workingPokemon => 
    workingPokemon.name === pokemon.name && 
    workingPokemon.level === pokemon.level && 
    workingPokemon.workId === pokemon.workId
  );
}

function handleDragStart(event: DragEvent, pokemon: Pokemon) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // Add workId if it exists
    const workId = pokemon.workId || null;
    
    event.dataTransfer.setData('application/json', JSON.stringify({
      ...pokemon,
      isParty: partyPokemon.value.includes(pokemon),
      workId,
      originalIndex: partyPokemon.value.indexOf(pokemon)
    }))
  }
}

function handleDragOver(event: DragEvent, slotIndex: number | 'available') {
  event.preventDefault()
  isDraggingOver.value = slotIndex
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragLeave() {
  isDraggingOver.value = null
}

function handleDrop(event: DragEvent, toParty: boolean, targetSlotIndex?: number) {
  event.preventDefault()
  isDraggingOver.value = null
  
  const jsonData = event.dataTransfer?.getData('application/json')
  if (!jsonData) return
  
  const data = JSON.parse(jsonData)
  let pokemon

  // Find the exact pokemon reference based on where it came from
  if (data.isParty) {
    pokemon = gameStore.playerPokemon.find(p => p.name === data.name && p.level === data.level)
  } else {
    pokemon = gameStore.availablePokemon.find(p => p.name === data.name && p.level === data.level)
  }
  
  if (!pokemon) return

  // Handle moving to party section with specific slot index
  if (toParty && typeof targetSlotIndex === 'number') {
    const success = gameStore.swapPokemonBetweenPartyAndAvailable(pokemon, true, targetSlotIndex)
    if (!success) {
      console.warn('Failed to swap pokemon - check party size constraints')
    }
  } else if (!toParty) {
    // Moving to available Pokemon list
    const success = gameStore.swapPokemonBetweenPartyAndAvailable(pokemon, false)
    if (!success) {
      console.warn('Failed to move pokemon to available list')
    }
  }
}
</script>
<template>
  <div class="mt-8" :class="{ 'space-y-8': !verticalMode }">
    <!-- Party Pokemon Section -->
    <div v-if="showParty" class="bg-gray-100 p-4 rounded-lg" :class="{ 'mb-4': verticalMode }">
      <h3 class="text-lg font-semibold mb-4">Party Pokemon ({{ partyPokemon.length }}/6)</h3>
      <div class="grid gap-4" :class="verticalMode ? `grid-cols-${columnSize}` : 'grid-cols-6'">
        <!-- All 6 Party Slots (filled or empty) -->
        <template v-for="slotIndex in 6" :key="'slot-' + slotIndex">
          <!-- Filled Slot -->
          <div v-if="partyPokemon[slotIndex - 1]" 
               class="relative"
               @dragover.prevent
               @drop="handleDrop($event, true, slotIndex - 1)">
            <PokemonSlot
              :pokemon="partyPokemon[slotIndex - 1]"
              :isParty="true"
              :verticalMode="verticalMode"
              draggable="true"
              @dragstart="handleDragStart($event, partyPokemon[slotIndex - 1])"
              class="border-2 border-red-500 relative group"
              :class="{ 
                'opacity-50': isWorkingInJob(partyPokemon[slotIndex - 1]),
                'min-h-[150px]': verticalMode && false,
                'h-full': true
              }"
            >
              <!-- Drag indicator -->
              <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
            </PokemonSlot>
            <div v-if="partyPokemon[slotIndex - 1] === gameStore.activePokemon" 
                 class="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 text-xs">
              Active
            </div>
          </div>
          <!-- Empty Slot -->
          <div v-else
               class="border-2 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center transition-colors duration-200"
               :class="{ 
                 'border-blue-400 bg-blue-50': isDraggingOver === slotIndex - 1,
                 'min-h-[200px]': !verticalMode,
                 'min-h-[80px]': verticalMode
               }"
               @dragover.prevent="handleDragOver($event, slotIndex - 1)"
               @dragleave="handleDragLeave"
               @drop="handleDrop($event, true, slotIndex - 1)">
            <span class="text-gray-400" :class="{'text-xs': verticalMode}">Empty Slot {{ slotIndex }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Available Pokemon Section -->
    <div class="bg-gray-100 p-4 rounded-lg">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Available Pokemon</h3>
        <!-- Pagination info for vertical mode -->
        <div v-if="verticalMode && allAvailablePokemon.length > 0" class="text-sm text-gray-500">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, allAvailablePokemon.length) }} of {{ allAvailablePokemon.length }}
        </div>
      </div>
      
      <div class="grid gap-4" 
           :class="verticalMode ? `grid-cols-${columnSize}` : 'grid-cols-6'"
           @dragover.prevent="handleDragOver($event, 'available')"
           @dragleave="handleDragLeave"
           @drop="handleDrop($event, false)">
        <!-- Display actual available Pokemon -->
        <div v-for="(pokemon, index) in availablePokemon"
             :key="'available-' + index"
             class="relative group">
          <PokemonSlot
            :pokemon="pokemon"
            :isParty="false"
            :verticalMode="verticalMode"
            draggable="true"
            @dragstart="handleDragStart($event, pokemon)"
            class="relative"
            :class="{ 
              'opacity-50': isWorkingInJob(pokemon)
            }"
          >
            <!-- Drag indicator -->
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </PokemonSlot>
        </div>
        
        <!-- Display empty placeholder slots (minimum 3 slots or more if needed) -->
        <div v-if="availablePokemon.length === 0" 
             v-for="index in Math.max(3, 6 - availablePokemon.length)" 
             :key="'empty-available-' + index"
             class="border-2 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center transition-colors duration-200"
             :class="{ 
               'border-blue-400 bg-blue-50': isDraggingOver === 'available',
               'min-h-[200px]': !verticalMode,
               'min-h-[80px]': verticalMode
             }"
             @dragover.prevent="handleDragOver($event, 'available')"
             @dragleave="handleDragLeave"
             @drop="handleDrop($event, false)">
          <span class="text-gray-400" :class="{'text-xs': verticalMode}">Available Slot</span>
        </div>
      </div>
      
      <!-- Pagination Controls (only shown in vertical mode with multiple pages) -->
      <div v-if="verticalMode && totalPages > 1" class="flex items-center justify-center space-x-2 mt-4">
        <button 
          @click="prevPage" 
          class="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="currentPage === 1"
        >
          &laquo; Prev
        </button>
        
        <!-- Page numbers - show max 5 pages with ellipsis -->
        <div class="flex space-x-1">
          <!-- Always show first page -->
          <button 
            v-if="totalPages > 4" 
            @click="goToPage(1)" 
            class="px-3 py-1 rounded-md"
            :class="currentPage === 1 ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'"
          >
            1
          </button>
          
          <!-- Ellipsis if needed -->
          <span v-if="totalPages > 4 && currentPage > 3" class="px-1">...</span>
          
          <!-- Pages around current page -->
          <button 
            v-for="page in totalPages" 
            :key="page"
            v-show="(totalPages <= 5) || 
                   (page >= Math.max(2, currentPage - 1) && 
                    page <= Math.min(totalPages - 1, currentPage + 1)) ||
                   (totalPages <= 7 && page <= 5 && currentPage <= 3) ||
                   (totalPages <= 7 && page >= totalPages - 4 && currentPage >= totalPages - 2)"
            @click="goToPage(page)" 
            class="px-3 py-1 rounded-md"
            :class="currentPage === page ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'"
          >
            {{ page }}
          </button>
          
          <!-- Ellipsis if needed -->
          <span v-if="totalPages > 4 && currentPage < totalPages - 2" class="px-1">...</span>
          
          <!-- Always show last page if there are many pages -->
          <button 
            v-if="totalPages > 4" 
            @click="goToPage(totalPages)" 
            class="px-3 py-1 rounded-md"
            :class="currentPage === totalPages ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'"
          >
            {{ totalPages }}
          </button>
        </div>
        
        <button 
          @click="nextPage" 
          class="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="currentPage === totalPages"
        >
          Next &raquo;
        </button>
      </div>
    </div>
  </div>
</template>
