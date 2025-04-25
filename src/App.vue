<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- Left Panel -->
    <div class="w-64 bg-red-600 text-white p-4 space-y-4">
      <div class="text-xl font-bold mb-6 text-center">PokéNGU</div>
      <nav class="space-y-2">
        <router-link 
          v-for="route in routes" 
          :key="route.path" 
          :to="route.path"
          class="block px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-red-700 hover:text-white text-center bg-red-500 shadow-md"
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
    </div>
    <!-- Main Content -->
    <div class="flex-1 p-8">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import TeamList from './components/TeamList.vue'

const routes = [
  { path: '/', name: 'Explore' },
  { path: '/idle-jobs', name: 'Idle Jobs' },
  { path: '/inventory', name: 'Inventory' },
  { path: '/pokedex', name: 'Pokédex' }
]
</script>
