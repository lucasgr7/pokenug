<template>
  <div class="bg-white rounded-xl shadow-lg p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">Quick Inventory</h3>
      <router-link 
        to="/inventory" 
        class="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        View All
      </router-link>
    </div>

    <!-- Filter Buttons -->
    <div class="flex space-x-2 mb-4 overflow-x-auto">
      <button 
        v-for="filterType in filterTypes" 
        :key="filterType.value"
        @click="selectedFilter = filterType.value"
        class="px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors"
        :class="[
          selectedFilter === filterType.value 
            ? 'bg-red-500 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        {{ filterType.label }}
      </button>
    </div>

    <!-- Items Grid -->
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
      <div 
        v-for="item in filteredItems.slice(0, maxItems)" 
        :key="item.id"
        @click="useItem(item)"
        class="relative flex flex-col items-center p-3 rounded-lg border transition-all duration-200"
        :class="[
          item.usable 
            ? 'border-gray-200 hover:border-red-300 hover:bg-red-50 cursor-pointer active:scale-95' 
            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
        ]"
      >
        <!-- Item Image -->
        <div class="w-12 h-12 mb-2 flex items-center justify-center">
          <img 
            :src="`/images/${item.id}.png`" 
            :alt="item.name" 
            class="w-full h-full object-contain"
            @error="handleImageError"
          >
        </div>

        <!-- Item Name -->
        <span class="text-xs text-center text-gray-700 font-medium leading-tight">
          {{ item.name }}
        </span>

        <!-- Quantity Badge -->
        <div class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {{ item.quantity }}
        </div>

        <!-- Usable indicator -->
        <div v-if="item.usable" class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      </div>
    </div>

    <!-- Show more indicator -->
    <div v-if="filteredItems.length > maxItems" class="text-center mt-3">
      <span class="text-sm text-gray-500">
        +{{ filteredItems.length - maxItems }} more items
      </span>
    </div>

    <!-- Empty state -->
    <div v-if="filteredItems.length === 0" class="text-center py-8 text-gray-500">
      <div class="text-3xl mb-2">📦</div>
      <p class="text-sm">No {{ selectedFilter === 'all' ? 'items' : selectedFilter }} found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventory } from '@/composables/useInventory'
import type { InventoryItem } from '@/types/pokemon'

const inventory = useInventory()
const selectedFilter = ref('all')
const maxItems = 12 // Show maximum 12 items in quick view

const filterTypes = [
  { value: 'all', label: 'All' },
  { value: 'pokeball', label: 'Pokéballs' },
  { value: 'berries', label: 'Berries' },
  { value: 'material', label: 'Materials' }
]

const filteredItems = computed(() => {
  const items = selectedFilter.value === 'all' 
    ? inventory.getAllItems() 
    : inventory.getItemsByType(selectedFilter.value)
    
  // Sort by quantity (descending) and then by name
  return items.sort((a: InventoryItem, b: InventoryItem) => {
    if (b.quantity !== a.quantity) {
      return b.quantity - a.quantity
    }
    return a.name.localeCompare(b.name)
  })
})

const useItem = (item: InventoryItem) => {
  if (!item.usable) return
  
  const definition = inventory.getItemDefinition(item.id)
  if (!definition) {
    console.warn('Item definition not found:', item.id)
    return
  }

  // Handle different item types
  switch (definition.type) {
    case 'pokeball':
      // Pokeballs are handled in the main Explore component
      console.log('Pokeball selected:', item.name)
      break
    case 'berries':
      // Berries are handled in the main Explore component
      console.log('Berry selected:', item.name)
      break
    case 'material':
      // Materials like seeker stones are handled in the main Explore component
      console.log('Material selected:', item.name)
      break
    default:
      console.log('Item used:', item.name)
  }
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/images/not-found.png'
}
</script>
