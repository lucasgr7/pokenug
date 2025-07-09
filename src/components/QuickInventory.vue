<template>
  <div>
    <div class="flex justify-between items-center mb-2 px-2">
      <h3 class="text-sm font-semibold">Inventory</h3>
      <router-link to="/inventory" class="text-xs text-white/70 hover:text-white">View All</router-link>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div 
        v-for="item in commonItems" 
        :key="item.id" 
        :class="[
          'p-2 rounded-md relative flex flex-col items-center cursor-pointer transition-all',
          item.usable ? 'hover:opacity-80' : 'opacity-70',
          getItemColorClass(item)
        ]"
        @click="useItem(item)"
      >
        <img :src="`/images/${item.id}.png`" :alt="item.name" class="w-12 h-12 object-contain" @error="$event.target.src = '/images/not-found.png'">
        <span class="mt-1 text-[12px] truncate w-full text-center">{{ item.name }}</span>
        <span class="absolute top-0 right-0 bg-yellow-300 text-black text-xs px-1 rounded-full">{{ item.quantity }}</span>
        
        <!-- Consumable indicator -->
        <div v-if="item.consumable" class="absolute bottom-0 right-0 bg-red-500 rounded-full w-3 h-3"></div>
        
        <!-- Pokeball/Equippable indicator -->
        <div v-else-if="item.type === 'pokeball'" class="absolute bottom-0 right-0 bg-blue-500 rounded-full w-3 h-3"></div>
      </div>
      <div v-if="commonItems.length === 0" class="col-span-3 text-center text-sm py-2 bg-red-700/30 rounded-md">
        No items yet
      </div>
    </div>
    
    <!-- Job Slot Expansion Modal -->
    <JobSlotExpansionModal 
      :show="showExpansionModal" 
      @close="showExpansionModal = false"
      @expand="handleJobExpansion"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInventory } from '../composables/useInventory'
import { useGameStore } from '../stores/gameStore'
import type { InventoryItem } from '@/types/pokemon'
import JobSlotExpansionModal from './JobSlotExpansionModal.vue'

// Define emits
interface Emits {
  (e: 'use-seeker-stone', item: InventoryItem): void
}

const emit = defineEmits<Emits>()

// Use the inventory composable
const inventory = useInventory()

// Get the game store for item effects
const gameStore = useGameStore()

// Modal state
const showExpansionModal = ref(false)

// Get the most common items (pokeballs and potions)
const commonItems = computed(() => {
  const pokeballs = inventory.getItemsByType('pokeball')
  const potions = inventory.getItemsByType('potion')
  const berries = inventory.getItemsByType('berries')
  const materials = inventory.getItemsByType('material')
  
  // Combine and limit to 6 most used items
  return [...pokeballs, ...potions, ...berries, ...materials]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)
})

/**
 * Use an item from the quick inventory
 */
function useItem(item: InventoryItem) {
  if (!item.usable) {
    gameStore.addNotification(`${item.name} cannot be used here`, 'error')
    return
  }
  
  // Handle item usage based on type
  switch (item.type) {
    case 'pokeball':
      // Only usable in battle
      if (!gameStore.battle.wildPokemon) {
        gameStore.addNotification('No wild Pokemon to catch!', 'error')
      } else {
        // Initialize the catch attempt
        gameStore.tryCapture()
      }
      break
      
    case 'potion':
    case 'berries':
      // Apply the effect on the active Pokemon
      gameStore.useInventoryItem(item)
      break
      
    case 'material':
      // Check if this is an expansion crystal
      if (item.id === 'expansion-crystal') {
        showExpansionModal.value = true
        return // Don't remove the item yet, wait for job selection
      }
      // Check if this is a seeker stone
      if (item.id === 'seeker-stone') {
        // Emit an event to the parent to handle seeker stone usage
        emit('use-seeker-stone', item)
        return
      }
      gameStore.addNotification(`${item.name} usage not implemented yet`, 'warning')
      break
      
    default:
      gameStore.addNotification(`${item.name} usage not implemented yet`, 'warning')
  }
}

/**
 * Handle job slot expansion
 */
function handleJobExpansion(jobId: string) {
  // Remove one expansion crystal from inventory
  inventory.useItem('expansion-crystal')
  
  // The actual expansion is handled by the modal component via localStorage
  // The job expansion will be applied when the component reloads or the game state is updated
}

/**
 * Get background color class based on item type
 */
function getItemColorClass(item: InventoryItem): string {
  switch (item.type) {
    case 'pokeball': return 'bg-blue-700'
    case 'potion': return 'bg-green-700'
    case 'berries': return 'bg-purple-700'
    case 'material': return 'bg-gray-700'
    case 'key': return 'bg-yellow-700'
    default: return 'bg-green-700'
  }
}
</script>