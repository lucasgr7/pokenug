<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- Left Panel -->
    <div class="w-64 flex-shrink-0 bg-red-600 text-white p-4 space-y-4">
      <div class="text-xl font-bold mb-6 text-center">PokéNGU</div>
      <NotificationHeader />
      <nav class="space-y-1">
        <router-link 
          v-for="route in routes" 
          :key="route.path" 
          :to="route.path"
          class="block px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
          :class="{ 'bg-red-700 font-bold': $route.path === route.path }"
        >
          {{ route.name }}
        </router-link>
      </nav>
      
      <!-- Team List -->
      <div class="mt-6">
        <h3 class="text-sm font-semibold mb-2 px-2">My Team</h3>
        <TeamList />
      </div>

      <!-- Quick Inventory Access -->
      <div class="mt-6">
        <QuickInventory />
      </div>
    </div>
    <!-- Main Content -->
    <div class="flex-1 p-8">
      <router-view></router-view>
    </div>
    
  </div>
</template>

<script setup lang="ts">
/// <reference types="vite/client" />
import { onMounted } from 'vue'
import TeamList from './components/TeamList.vue'
import QuickInventory from './components/QuickInventory.vue'
import { useInventory } from './composables/useInventory'
import { useBuffStore } from './stores/buffStore'
import NotificationHeader from './components/NotificationHeader.vue'


const routes = [
  { path: '/', name: 'Explore' },
  { path: '/collection', name: 'Collection' },
  { path: '/idle-jobs', name: 'Idle Jobs' },
  { path: '/inventory', name: 'Inventory' },
  { path: '/pokedex', name: 'Pokédex' },
]

if(import.meta.env.MODE === 'development') {
  routes.push({ path: '/debug', name: 'debug' })
} else {
  console.log('Production mode')
}
// Use the inventory composable
const inventory = useInventory()
// Use the buff store
const buffStore = useBuffStore()

onMounted(() => {
})
</script>
