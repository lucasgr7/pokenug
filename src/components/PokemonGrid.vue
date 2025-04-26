<template>
  <div class="mt-8 space-y-8">
    <!-- Party Pokemon Section -->
    <div v-if="showParty" class="bg-gray-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-4">Party Pokemon ({{ partyPokemon.length }}/6)</h3>
      <div class="grid grid-cols-6 gap-4">
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
              draggable="true"
              @dragstart="handleDragStart($event, partyPokemon[slotIndex - 1])"
              class="border-2 border-red-500 relative group"
              :class="{ 'opacity-50': isWorkingInJob(partyPokemon[slotIndex - 1]) }"
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
            <div v-if="isWorkingInJob(partyPokemon[slotIndex - 1])" 
                 class="absolute -top-2 left-0 bg-yellow-500 text-white rounded-full p-1 text-xs">
              Working
            </div>
          </div>
          <!-- Empty Slot -->
          <div v-else
               class="border-2 border-dashed border-gray-300 rounded-lg h-full min-h-[200px] flex items-center justify-center transition-colors duration-200"
               :class="{ 'border-blue-400 bg-blue-50': isDraggingOver === slotIndex - 1 }"
               @dragover.prevent="handleDragOver($event, slotIndex - 1)"
               @dragleave="handleDragLeave"
               @drop="handleDrop($event, true, slotIndex - 1)">
            <span class="text-gray-400">Empty Slot {{ slotIndex }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Available Pokemon Section -->
    <div class="bg-gray-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-4">Available Pokemon</h3>
      <div class="grid grid-cols-6 gap-4"
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
            draggable="true"
            @dragstart="handleDragStart($event, pokemon)"
            class="relative"
            :class="{ 'opacity-50': isWorkingInJob(pokemon) }"
          >
            <!-- Drag indicator -->
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </PokemonSlot>
          <div v-if="isWorkingInJob(pokemon)" 
               class="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-1 text-xs">
            Working
          </div>
        </div>
        
        <!-- Display empty placeholder slots (minimum 3 slots or more if needed) -->
        <div v-for="index in Math.max(3, 6 - availablePokemon.length)" 
             :key="'empty-available-' + index"
             class="border-2 border-dashed border-gray-300 rounded-lg h-full min-h-[200px] flex items-center justify-center transition-colors duration-200"
             :class="{ 'border-blue-400 bg-blue-50': isDraggingOver === 'available' }"
             @dragover.prevent="handleDragOver($event, 'available')"
             @dragleave="handleDragLeave"
             @drop="handleDrop($event, false)">
          <span class="text-gray-400">Available Slot</span>
        </div>
      </div>
    </div>
  </div>
</template>

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
  }
})

const gameStore = useGameStore()
const isDraggingOver = ref<number | 'available' | null>(null)

// Get party Pokemon (those in active battle team) - without any filtering
const partyPokemon = computed(() => {
  return [...gameStore.playerPokemon];
})

// Get all Pokemon from inventory that aren't in the team or working
const availablePokemon = computed(() => {
  return [...gameStore.availablePokemon].filter(pokemon => {
    // Make sure this Pokemon is not currently working in any job
    if (isWorkingInJob(pokemon)) return false;
    
    // When filtering by type for idle jobs, only show matching types
    if (props.filterType) {
      return pokemon.types.includes(props.filterType);
    }
    return true;
  });
})

function isWorkingInJob(pokemon: Pokemon): boolean {
  // Check if this Pokemon is currently assigned to any job
  return gameStore.idleWorking.some(workingPokemon => 
    workingPokemon.name === pokemon.name && 
    workingPokemon.level === pokemon.level
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