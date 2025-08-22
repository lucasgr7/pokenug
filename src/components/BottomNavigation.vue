<template>
  <div class="fixed bottom-0 left-0 right-0 z-50">
    <!-- Team Panel (collapsible) -->
    <div 
      class="bg-red-800/95 backdrop-blur-sm border-t border-red-700 transition-transform duration-300 ease-out"
      :class="[
        isTeamExpanded ? 'translate-y-0' : 'translate-y-full',
        'absolute bottom-full left-0 right-0'
      ]"
    >
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-white font-semibold">My Team</h3>
          <button 
            @click="toggleTeam"
            class="text-white/70 hover:text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
        <TeamList />
      </div>
    </div>

    <!-- Main Navigation Bar -->
    <div class="bg-red-600 text-white border-t border-red-500 shadow-lg">
      <!-- Drag Handle for Team Panel -->
      <div 
        class="w-full py-2 cursor-pointer flex justify-center items-center"
        @click="toggleTeam"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div class="w-12 h-1 bg-white/30 rounded-full"></div>
      </div>

      <!-- Navigation Items -->
      <div class="flex items-center justify-around px-4 pb-4">
        <router-link 
          v-for="route in mainRoutes" 
          :key="route.path"
          :to="route.path"
          class="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 mx-1"
          :class="{ 
            'bg-red-700 shadow-md': $route.path === route.path,
            'hover:bg-red-700/50': $route.path !== route.path
          }"
        >
          <svg class="w-6 h-6 mb-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="route.name === 'Explore'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            <path v-else-if="route.name === 'Collection'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            <path v-else-if="route.name === 'Jobs'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-xs font-medium truncate">{{ route.name }}</span>
        </router-link>

        <!-- More button for additional routes -->
        <button 
          v-if="secondaryRoutes.length > 0"
          @click="toggleMore"
          class="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 mx-1"
          :class="{ 
            'bg-red-700 shadow-md': showMore,
            'hover:bg-red-700/50': !showMore
          }"
        >
          <svg class="w-6 h-6 mb-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <span class="text-xs font-medium">More</span>
        </button>
      </div>

      <!-- Secondary Routes (expandable) -->
      <div 
        v-if="showMore && secondaryRoutes.length > 0"
        class="border-t border-red-500 bg-red-700/50 backdrop-blur-sm"
      >
        <div class="flex flex-wrap gap-2 p-4">
          <router-link 
            v-for="route in secondaryRoutes" 
            :key="route.path"
            :to="route.path"
            class="flex items-center px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
            :class="{ 'bg-red-500 font-bold': $route.path === route.path }"
            @click="showMore = false"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="route.name === 'Inventory'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              <path v-else-if="route.name === 'Pokédex'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              <path v-else-if="route.name === 'Debug'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="text-sm">{{ route.name }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import TeamList from './TeamList.vue'

const route = useRoute()
const isTeamExpanded = ref(false)
const showMore = ref(false)

// Touch handling for swipe gestures
let touchStartY = 0
let touchCurrentY = 0

const handleTouchStart = (e: TouchEvent) => {
  touchStartY = e.touches[0].clientY
}

const handleTouchMove = (e: TouchEvent) => {
  touchCurrentY = e.touches[0].clientY
}

const handleTouchEnd = () => {
  const deltaY = touchStartY - touchCurrentY
  
  // Swipe up to open, swipe down to close
  if (Math.abs(deltaY) > 50) {
    if (deltaY > 0 && !isTeamExpanded.value) {
      isTeamExpanded.value = true
    } else if (deltaY < 0 && isTeamExpanded.value) {
      isTeamExpanded.value = false
    }
  }
}

const toggleTeam = () => {
  isTeamExpanded.value = !isTeamExpanded.value
}

const toggleMore = () => {
  showMore.value = !showMore.value
}

// Main routes that are always visible
const mainRoutes = computed(() => [
  { 
    path: '/', 
    name: 'Explore'
  },
  { 
    path: '/collection', 
    name: 'Collection'
  },
  { 
    path: '/idle-jobs', 
    name: 'Jobs'
  }
])

// Secondary routes in the "more" section
const secondaryRoutes = computed(() => {
  const routes = [
    { 
      path: '/inventory', 
      name: 'Inventory'
    },
    { 
      path: '/pokedex', 
      name: 'Pokédex'
    }
  ]
  
  // Add debug route in development
  if (process.env.NODE_ENV === 'development') {
    routes.push({
      path: '/debug',
      name: 'Debug'
    })
  }
  
  return routes
})
</script>

<style scoped>
/* Smooth transitions for mobile interactions */
.transition-transform {
  transition: transform 0.3s ease-out;
}

/* Ensure proper safe area handling for iOS */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .fixed.bottom-0 {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
