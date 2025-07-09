<template>
  <div class="relative">
    <!-- Header with gradient background -->
    <div class="flex justify-between items-center mb-3 px-3 py-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl backdrop-blur-sm border border-white/10">
      <h3 class="text-sm font-bold text-white/90 flex items-center">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-2 animate-pulse"></div>
        Inventory
      </h3>
      <router-link to="/inventory" class="text-xs text-white/60 hover:text-white/90 transition-all duration-300 hover:scale-105">
        View All →
      </router-link>
    </div>

    <!-- Items Grid with enhanced styling -->
    <div class="grid grid-cols-3 gap-2 p-2 bg-black/20 rounded-xl backdrop-blur-sm border border-white/5">
      <div 
        v-for="(item, index) in commonItems" 
        :key="item.id" 
        :class="[
          'group relative flex flex-col items-center cursor-pointer transition-all duration-500 ease-out',
          'p-3 rounded-lg overflow-hidden transform hover:scale-105 hover:-translate-y-1',
          'border border-white/10 backdrop-blur-sm',
          item.usable ? 'hover:shadow-2xl hover:shadow-purple-500/20' : 'opacity-60 cursor-not-allowed',
          getItemGradientClass(item)
        ]"
        :style="{ animationDelay: `${index * 100}ms` }"
        @click="useItem(item)"
      >
        <!-- Animated background blob -->
        <div class="absolute inset-0 opacity-20">
          <div class="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg animate-float"></div>
          <div class="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-sm animate-float-delayed"></div>
        </div>

        <!-- Liquid ripple effect on hover -->
        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="absolute inset-0 bg-gradient-radial from-white/20 via-white/5 to-transparent rounded-lg animate-ripple"></div>
        </div>

        <!-- Item image with enhanced styling -->
        <div class="relative z-10 mb-2">
          <div class="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-sm border border-white/20 group-hover:border-white/40 transition-all duration-300">
            <img 
              :src="`/images/${item.id}.png`" 
              :alt="item.name" 
              class="w-8 h-8 object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300" 
              @error="handleImageError"
            >
          </div>
        </div>
        
        <!-- Item name with better typography -->
        <span class="relative z-10 text-[10px] font-medium text-white/80 text-center leading-tight truncate w-full group-hover:text-white transition-colors duration-300">
          {{ item.name }}
        </span>
        
        <!-- Quantity badge with modern styling -->
        <div class="absolute -top-1 -right-1 z-20">
          <div class="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 shadow-lg animate-bounce-subtle">
            {{ item.quantity }}
          </div>
        </div>
        
        <!-- Type indicators with enhanced styling -->
        <div class="absolute bottom-1 right-1 z-20">
          <!-- Consumable indicator -->
          <div 
            v-if="item.consumable" 
            class="w-2.5 h-2.5 bg-gradient-to-r from-red-400 to-pink-400 rounded-full border border-white/30 shadow-lg animate-pulse"
            title="Consumable"
          ></div>
          
          <!-- Pokeball indicator -->
          <div 
            v-else-if="item.type === 'pokeball'" 
            class="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full border border-white/30 shadow-lg animate-pulse"
            title="Pokeball"
          ></div>

          <!-- Material indicator -->
          <div 
            v-else-if="item.type === 'material'" 
            class="w-2.5 h-2.5 bg-gradient-to-r from-gray-400 to-slate-400 rounded-full border border-white/30 shadow-lg animate-pulse"
            title="Material"
          ></div>
        </div>

        <!-- Hover glow effect -->
        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div class="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 rounded-lg"></div>
        </div>
      </div>

      <!-- Empty state with enhanced styling -->
      <div v-if="commonItems.length === 0" class="col-span-3 text-center py-6">
        <div class="bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-lg p-4 border border-red-500/20 backdrop-blur-sm">
          <div class="w-8 h-8 bg-red-500/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <span class="text-red-400 text-sm">!</span>
          </div>
          <span class="text-xs text-red-300/80">No items yet</span>
        </div>
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
 * Handle image loading errors
 */
function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  if (target) {
    target.src = '/images/not-found.png'
  }
}

/**
 * Get background gradient class based on item type
 */
function getItemGradientClass(item: InventoryItem): string {
  switch (item.type) {
    case 'pokeball': 
      return 'bg-gradient-to-br from-blue-600/40 via-blue-500/30 to-cyan-400/20'
    case 'potion': 
      return 'bg-gradient-to-br from-green-600/40 via-emerald-500/30 to-lime-400/20'
    case 'berries': 
      return 'bg-gradient-to-br from-purple-600/40 via-violet-500/30 to-pink-400/20'
    case 'material': 
      return 'bg-gradient-to-br from-gray-600/40 via-slate-500/30 to-gray-400/20'
    case 'key': 
      return 'bg-gradient-to-br from-yellow-600/40 via-amber-500/30 to-orange-400/20'
    default: 
      return 'bg-gradient-to-br from-indigo-600/40 via-blue-500/30 to-purple-400/20'
  }
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

<style scoped>
/* Custom animations for liquid effects */
@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-10px) rotate(180deg);
    opacity: 1;
  }
}

@keyframes float-delayed {
  0%, 100% {
    transform: translateY(0px) translateX(0px) scale(1);
    opacity: 0.5;
  }
  33% {
    transform: translateY(-8px) translateX(-4px) scale(1.1);
    opacity: 0.8;
  }
  66% {
    transform: translateY(-12px) translateX(4px) scale(0.9);
    opacity: 0.6;
  }
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Animation classes */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float-delayed 8s ease-in-out infinite;
}

.animate-ripple {
  animation: ripple 0.6s ease-out;
}

.animate-bounce-subtle {
  animation: bounce-subtle 2s ease-in-out infinite;
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 4s ease infinite;
}

/* Custom gradient radial utility */
.bg-gradient-radial {
  background: radial-gradient(circle, var(--tw-gradient-stops));
}

/* Enhance backdrop blur for better glass effect */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Custom hover effects */
.group:hover .group-hover\:scale-110 {
  transform: scale(1.1);
}

/* Smooth transitions for all elements */
* {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced shadow effects */
.hover\:shadow-2xl:hover {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.hover\:shadow-purple-500\/20:hover {
  box-shadow: 0 25px 50px -12px rgba(147, 51, 234, 0.2);
}
</style>