<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventory } from '../composables/useInventory'
import { useGameStore } from '../stores/gameStore'
import type { InventoryItem, ItemType } from '../types/pokemon'
import JobSlotExpansionModal from '../components/JobSlotExpansionModal.vue'

const inventory = useInventory()
const gameStore = useGameStore()
const activeTab = ref<ItemType>('pokeball')
const showExpansionModal = ref(false)

const tabs = [
  { id: 'pokeball', label: 'Pokeballs', icon: '🔴' },
  { id: 'potion', label: 'Potions', icon: '🧪' },
  { id: 'berries', label: 'Berries', icon: '🍒' },
  { id: 'material', label: 'Materials', icon: '🧰' },
  { id: 'key', label: 'Key Items', icon: '🔑' }
]

const filteredItems = computed(() => {
  return inventory.getItemsByType(activeTab.value)
})

const rarityColors: Record<string, string> = {
  common: 'bg-gray-200 text-gray-800',
  uncommon: 'bg-green-200 text-green-800',
  rare: 'bg-blue-200 text-blue-800',
  epic: 'bg-purple-200 text-purple-800',
  legendary: 'bg-yellow-200 text-yellow-800'
}

function useItem(item: InventoryItem) {
  if (item.usable) {
    if (item.id === 'expansion-crystal') {
      showExpansionModal.value = true
      return
    }
    if (item.id === 'dragon-stone') {
      // Check if temporary region is already active
      if (gameStore.isTemporaryRegionActive) {
        gameStore.addNotification('A temporary region is already active!', 'error')
        return
      }
      // Use the dragon stone
      inventory.getInventoryStore().removeItem(item.id, 1)
      gameStore.consumeDragonStone()
      gameStore.addNotification('Dragon Stone consumed! The Ethereal Nexus portal is now open!', 'success')
      return
    }
    if (item.id === 'phantom-contract') {
      // Use the phantom contract
      const success = gameStore.useInventoryItem(item)
      if (success) {
        gameStore.addNotification('Phantom Contract activated! Fear factor reset and guaranteed capture enabled!', 'success')
      }
      return
    }
    inventory.useItem(item.id)
  }
}

function handleJobExpansion(jobId: string) {
  // Remove one expansion crystal from inventory
  inventory.useItem('expansion-crystal')
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  if (target) {
    target.src = '/images/not-found.png'
  }
}
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">Inventory</h1>
    
    <!-- Tabs -->
    <div class="flex border-b mb-4">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="px-4 py-2 mr-2 rounded-t-lg transition-all"
        :class="activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
        @click="activeTab = tab.id as ItemType"
      >
        <span class="mr-1">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>
    
    <!-- Items Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="item in filteredItems" 
        :key="item.id"
        class="border rounded-lg p-4 flex items-center group relative hover:shadow-lg transition-shadow"
      >
        <div class="w-16 h-16 flex-shrink-0 mr-4 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            :src="`/images/${item.id}.png`"
            :alt="item.name"
            class="w-full h-full object-contain"
            @error="handleImageError"
          >
        </div>
        
        <div class="flex-1">
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-gray-800">{{ item.name }}</h3>
            <span class="px-2 py-1 text-xs rounded-full" :class="rarityColors[item.rarity]">
              {{ item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) }}
            </span>
          </div>
          
          <p class="text-sm text-gray-600 mt-1">{{ item.description }}</p>
          
          <div class="flex justify-between items-center mt-2">
            <span class="text-sm font-semibold">Qty: {{ item.quantity }}</span>
            <button 
              v-if="item.usable"
              @click="useItem(item)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              {{ item.id === 'expansion-crystal' ? 'Expand Job' : 'Use' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="filteredItems.length === 0" class="col-span-full text-center py-8 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4M7 15l-3-3 3-3M17 9l3 3-3 3" />
        </svg>
        <p class="text-lg">No items of this type in your inventory.</p>
        <p class="mt-1">Try assigning Pokémon to jobs to collect new items!</p>
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