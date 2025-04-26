<template>
  <div>
    <div class="flex justify-between items-center mb-2 px-2">
      <h3 class="text-sm font-semibold">Inventory</h3>
      <router-link to="/inventory" class="text-xs text-white/70 hover:text-white">View All</router-link>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <div v-for="item in commonItems" :key="item.id" class="bg-red-700/50 p-2 rounded-md relative flex flex-col items-center">
        <img :src="item.icon" :alt="item.name" class="w-8 h-8 object-contain" @error="$event.target.src = '/images/crappyball.png'">
        <span class="text-xs mt-1 truncate w-full text-center">{{ item.name.split(' ')[0] }}</span>
        <span class="absolute top-0 right-0 bg-red-700 text-xs px-1 rounded-full">{{ item.quantity }}</span>
      </div>
      <div v-if="commonItems.length === 0" class="col-span-3 text-center text-sm py-2 bg-red-700/30 rounded-md">
        No items yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useInventory } from '../composables/useInventory'

// Use the inventory composable
const inventory = useInventory()

// Get the most common items (pokeballs and potions)
const commonItems = computed(() => {
  const pokeballs = inventory.getItemsByType('pokeball')
  const potions = inventory.getItemsByType('potion')
  
  // Combine and limit to 6 most used items
  return [...pokeballs, ...potions]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)
})
</script>