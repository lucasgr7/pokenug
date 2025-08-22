<template>
  <div class="relative">
    <!-- Clean flat header -->
    <div class="px-3 pt-2 pb-1 bg-slate-800/90 rounded-2xl border border-slate-700/50">
      <div class="w-full flex flex-col items-center">
        <span class="text-xs font-semibold text-slate-400 tracking-wide mb-1 uppercase">Quick Inventory</span>
        <div class="flex flex-row items-center gap-2">
          <button @click="showFilterModal = true" class="p-1.5 rounded-full bg-slate-700/60 border border-slate-600/50 text-slate-400 hover:text-blue-400 hover:bg-slate-700/80 transition-colors focus:outline-none flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M4 6h16M6 12h12M10 18h4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <router-link to="/inventory" class="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 rounded focus:outline-none border border-slate-600/50 bg-slate-700/60">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <span class="sr-only">View All</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Flat items grid -->
    <div class="grid grid-cols-3 gap-1 p-2 bg-slate-800/60 rounded-3xl border border-slate-700/30">
      <div 
        v-for="(item, index) in commonItems" 
        :key="item.id" 
        :class="[
          'group relative flex flex-col items-center cursor-pointer transition-all duration-200',
          'p-4 rounded-xl',
          item.usable ? 'hover:scale-105 hover:-translate-y-1' : 'opacity-50 cursor-not-allowed',
          getItemBackgroundClass(item)
        ]"
        @click="useItem(item)"
      >
        <!-- Circular image container -->
        <div class="relative mb-3">
          <div class="w-16 h-16 rounded-full overflow-hidden border-3 border-white/20 group-hover:border-white/40 transition-all duration-200 bg-white/10">
            <img 
              :src="`/images/${item.id}.png`" 
              :alt="item.name" 
              class="w-full object-cover object-center group-hover:scale-110 transition-transform duration-200" 
              @error="handleImageError"
            >
          </div>
          
          <!-- Quantity badge -->
          <div class="absolute -top-1 -right-1 z-10">
            <div class="bg-white text-slate-800 text-xs font-bold px-2 py-1 rounded-full shadow-lg min-w-[20px] text-center">
              {{ item.quantity }}
            </div>
          </div>
        </div>
        
        
        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>

      <!-- Empty state -->
      <div v-if="commonItems.length === 0" class="col-span-3 text-center py-8">
        <div class="bg-slate-700/50 rounded-xl p-6 border border-slate-600/50">
          <div class="w-12 h-12 bg-slate-600/50 rounded-full mx-auto mb-3 flex items-center justify-center">
            <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"></path>
            </svg>
          </div>
          <span class="text-sm text-slate-400">No items available</span>
        </div>
      </div>
    </div>
    
    <!-- Job Slot Expansion Modal -->
    <JobSlotExpansionModal 
      :show="showExpansionModal" 
      @close="showExpansionModal = false"
      @expand="handleJobExpansion"
    />

  <!-- QuickInventoryFilter Modal -->
  <QuickInventoryFilter
    :show="showFilterModal"
    :allItems="allItems"
    :selected="selectedItemIds"
    @close="showFilterModal = false"
    @apply-filter="onApplyFilter"
  />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInventory } from '../composables/useInventory'
import { useGameStore } from '../stores/gameStore'
import type { InventoryItem } from '@/types/pokemon'
import JobSlotExpansionModal from './JobSlotExpansionModal.vue'
import QuickInventoryFilter from './QuickInventoryFilter.vue'

// Define emits
const emit = defineEmits<{
  'use-seeker-stone': [item: InventoryItem]
}>()

// Use the inventory composable
const inventory = useInventory()

// Get the game store for item effects
const gameStore = useGameStore()

// Modal states
const showExpansionModal = ref(false)
const showFilterModal = ref(false)


// Filter state (sync with gameStore)
import { watch } from 'vue'
const selectedItemIds = ref<string[]>([...gameStore.quickInventoryFilter])

// Keep local ref in sync with store
watch(() => gameStore.quickInventoryFilter, (val) => {
  selectedItemIds.value = [...val]
})

// Get all items for filter modal
const allItems = computed(() => {
  const pokeballs = inventory.getItemsByType('pokeball')
  const potions = inventory.getItemsByType('potion')
  const berries = inventory.getItemsByType('berries')
  const materials = inventory.getItemsByType('material')
  return [...pokeballs, ...potions, ...berries, ...materials]
    .sort((a, b) => b.name.localeCompare(a.name))
})

// Items to display in quick inventory (filtered or default)
const commonItems = computed(() => {
  const items = allItems.value
  if (selectedItemIds.value.length > 0) {
    return items.filter(item => selectedItemIds.value.includes(item.id)).slice(0, 6)
  }
  // Default: top 6 by quantity
  return items.sort((a, b) => b.quantity - a.quantity).slice(0, 6)
})


// Handle filter apply event
function onApplyFilter(ids: string[]) {
  selectedItemIds.value = ids
  gameStore.quickInventoryFilter = ids
}

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
      handlePokeballUsage()
      break
      
    case 'potion':
    case 'berries':
      gameStore.useInventoryItem(item)
      break
      
    case 'material':
      handleMaterialUsage(item)
      break
      
    default:
      gameStore.addNotification(`${item.name} usage not implemented yet`, 'warning')
  }
}

/**
 * Handle pokeball usage
 */
function handlePokeballUsage() {
  if (!gameStore.battle.wildPokemon) {
    gameStore.addNotification('No wild Pokemon to catch!', 'error')
  } else {
    gameStore.tryCapture()
  }
}

/**
 * Handle material item usage
 */
function handleMaterialUsage(item: InventoryItem) {
  switch (item.id) {
    case 'expansion-crystal':
      showExpansionModal.value = true
      break
      
    case 'seeker-stone':
      emit('use-seeker-stone', item)
      break
      
    case 'dragon-stone':
      handleDragonStoneUsage(item)
      break
      
    case 'phantom-contract':
      handlePhantomContractUsage(item)
      break
      
    default:
      gameStore.addNotification(`${item.name} usage not implemented yet`, 'warning')
  }
}

/**
 * Handle dragon stone usage
 */
function handleDragonStoneUsage(item: InventoryItem) {
  if (gameStore.isTemporaryRegionActive) {
    gameStore.addNotification('A temporary region is already active!', 'error')
    return
  }
  
  inventory.getInventoryStore().removeItem(item.id, 1)
  gameStore.consumeDragonStone()
  gameStore.addNotification('Dragon Stone consumed! The Ethereal Nexus portal is now open!', 'success')
}

/**
 * Handle phantom contract usage
 */
function handlePhantomContractUsage(item: InventoryItem) {
  const success = gameStore.useInventoryItem(item)
  if (success) {
    gameStore.addNotification('Phantom Contract activated! Fear factor reset and guaranteed capture enabled!', 'success')
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
 * Handle image loading errors
 */
function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  if (target) {
    target.src = '/images/not-found.png'
  }
}

/**
 * Get background color class based on item type
 */
function getItemBackgroundClass(item: InventoryItem): string {
  switch (item.type) {
    case 'pokeball': 
      return 'bg-blue-500/20 hover:bg-blue-500/30'
    case 'potion': 
      return 'bg-green-500/20 hover:bg-green-500/30'
    case 'berries': 
      return 'bg-purple-500/20 hover:bg-purple-500/30'
    case 'material': 
      return 'bg-gray-500/20 hover:bg-gray-500/30'
    case 'key': 
      return 'bg-yellow-500/20 hover:bg-yellow-500/30'
    default: 
      return 'bg-slate-500/20 hover:bg-slate-500/30'
  }
}

/**
 * Get type indicator color class
 */
function getTypeIndicatorClass(item: InventoryItem): string {
  switch (item.type) {
    case 'pokeball': 
      return 'bg-blue-400'
    case 'potion': 
      return 'bg-green-400'
    case 'berries': 
      return 'bg-purple-400'
    case 'material': 
      return 'bg-gray-400'
    case 'key': 
      return 'bg-yellow-400'
    default: 
      return 'bg-slate-400'
  }
}
</script>

<style scoped>
/* Clean flat design styles - no fancy animations */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Custom border width for circular images */
.border-3 {
  border-width: 3px;
}

/* Ensure images fit perfectly in circular containers */
.object-cover {
  object-fit: cover;
}

.object-center {
  object-position: center;
}


.group:hover .group-hover\:border-white\/40 {
  border-color: rgba(255, 255, 255, 0.4);
}

/* Remove all fancy animations and effects */
.hover\:scale-105:hover {
  transform: scale(1.05);
}

.hover\:-translate-y-1:hover {
  transform: translateY(-0.25rem) scale(1.05);
}
</style>