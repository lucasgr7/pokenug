<template>
  <div class="flex flex-col min-h-screen bg-gray-100">
    <!-- Header with notifications - only visible on desktop -->
    <div class="hidden lg:block bg-red-600 text-white p-0">
      <div class="flex justify-between items-center">
        <div class="text-l font-bold">PokéNGU</div>
        <NotificationHeader />
      </div>
    </div>

    <!-- Desktop Sidebar - only visible on lg screens and up -->
    <div class="hidden lg:flex min-h-screen">
      <!-- Left Panel - Desktop only -->
      <div class="w-64 flex-shrink-0 bg-red-700 text-white p-4 space-y-4">
        <div class="text-xl font-bold mb-6 text-center lg:hidden">PokéNGU</div>
        <nav class="space-y-1">
          <router-link 
            to="/"
            class="block px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
            :class="{ 'bg-red-700 font-bold': $route.path === '/' }"
          >
            Explore
          </router-link>
          <router-link 
            to="/collection"
            class="block px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
            :class="{ 'bg-red-700 font-bold': $route.path === '/collection' }"
          >
            Collection
          </router-link>
          <router-link 
            to="/idle-jobs"
            class="block px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
            :class="{ 'bg-red-700 font-bold': $route.path === '/idle-jobs' }"
          >
            Idle Jobs
          </router-link>
          <router-link 
            to="/inventory"
            class="block px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
            :class="{ 'bg-red-700 font-bold': $route.path === '/inventory' }"
          >
            Inventory
          </router-link>
          <router-link 
            to="/pokedex"
            class="block px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
            :class="{ 'bg-red-700 font-bold': $route.path === '/pokedex' }"
          >
            Pokédex
          </router-link>
        </nav>
        
        <!-- Team List -->
        <div class="mt-6">
          <h3 class="text-sm font-semibold mb-2 px-2">My Team</h3>
          <TeamList />
        </div>
      </div>

      <!-- Main Content - Desktop -->
      <div class="flex-1 p-8">
        <router-view></router-view>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div class="lg:hidden flex flex-col min-h-screen">
      <!-- Mobile Header -->
      <div class="bg-red-800 text-white p-2 flex justify-between items-center">
        <div class="text-l font-bold">PokéNGU</div>
        <NotificationHeader />
      </div>

      <!-- Main Content - Mobile (with bottom padding for navigation) -->
      <div class="flex-1 p-4 pb-32 overflow-y-auto">
        <router-view></router-view>
      </div>

      <!-- Bottom Navigation - Mobile only -->
      <BottomNavigation />
    </div>
  </div>
</template>

<script setup lang="ts">
/// <reference types="vite/client" />
import { onMounted } from 'vue'
import TeamList from './components/TeamList.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import { useInventory } from './composables/useInventory'
import { useBuffStore } from './stores/buffStore'
import NotificationHeader from './components/NotificationHeader.vue'

// Use the inventory composable
const inventory = useInventory()
// Use the buff store
const buffStore = useBuffStore()

onMounted(() => {
})
</script>
