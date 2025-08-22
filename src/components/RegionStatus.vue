<template>
  <div class="space-y-4">
    <!-- Region Selection -->
    <div class="bg-white rounded-xl shadow-lg p-4">
      <h3 class="text-lg font-bold mb-3">Current Region</h3>
      <select 
        v-model="selectedRegion" 
        @change="$emit('regionChange', selectedRegion)"
        class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
      >
        <option v-for="(region, id) in regions" :key="id" :value="id"
          :disabled="String(id) === 'ethereal-nexus' && !isTemporaryRegionActive">
          {{ region.name }} (Lvl {{ region.minLevel }}-{{ region.maxLevel }})
          <span v-if="String(id) === 'ethereal-nexus'"> - ✨ Mystical Portal</span>
        </option>
      </select>
    </div>

    <!-- Current Status -->
    <div class="bg-white rounded-xl shadow-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-bold">Zone Status</h3>
        <div class="flex items-center space-x-2 text-sm">
          <div class="w-3 h-3 rounded-full" :class="{
            'bg-green-500': currentRegion === 'Home',
            'bg-blue-500': currentRegion !== 'Home' && wildPokemon,
            'bg-yellow-500': currentRegion !== 'Home' && !wildPokemon
          }"></div>
          <span class="font-medium" :class="{
            'text-green-600': currentRegion === 'Home',
            'text-blue-600': currentRegion !== 'Home' && wildPokemon,
            'text-yellow-600': currentRegion !== 'Home' && !wildPokemon
          }">
            {{ currentRegion === 'Home' ? 'Safe' : wildPokemon ? 'Battle' : 'Searching' }}
          </span>
        </div>
      </div>

      <!-- Status Content -->
      <div v-if="currentRegion === 'Home'" class="text-center py-4">
        <div class="text-4xl mb-2">🏠</div>
        <p class="text-green-700 font-medium">Welcome home!</p>
        <p class="text-sm text-green-600 mt-1">Select a region above to start exploring</p>
      </div>

      <div v-else-if="!wildPokemon" class="text-center py-4">
        <div class="text-3xl mb-2">🔍</div>
        <p class="text-gray-700 font-medium">Searching for Pokemon...</p>
        <p class="text-sm text-gray-600 mt-1">Next spawn in: {{ Math.ceil(spawnTimer) }}s</p>
        <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div class="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
               :style="{ width: spawnProgress + '%' }"></div>
        </div>
      </div>

      <div v-else class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-700">Encounter Rate:</span>
          <span class="text-gray-600">{{ currentRegionData.encounterRate }}%</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-700">Pokéballs:</span>
          <span class="text-red-600 font-bold">{{ totalPokeballs }}</span>
        </div>
      </div>
    </div>

    <!-- Temporary Region Countdown -->
    <div v-if="isTemporaryRegionActive" class="bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 rounded-xl shadow-lg p-4 border-2 border-yellow-400">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-white">✨ Ethereal Portal</h3>
        <span class="text-yellow-300 text-sm font-medium">{{ temporaryRegionTimeFormatted }}</span>
      </div>
      <div class="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
        <div class="bg-gradient-to-r from-yellow-400 to-purple-400 h-3 rounded-full transition-all duration-1000"
             :style="{ width: temporaryRegionProgress + '%' }"></div>
      </div>
      <div class="text-xs text-gray-300 mt-2 text-center">
        Portal will close when the timer reaches zero
      </div>
    </div>

    <!-- Warning Messages -->
    <div v-if="!activePokemon && hasAnyHealthyPokemon"
         class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            Please select a Pokemon from your team to continue exploring
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  currentRegion: string
  currentRegionData: any
  regions: any
  wildPokemon: any
  activePokemon: any
  hasAnyHealthyPokemon: boolean
  spawnTimer: number
  totalPokeballs: number
  isTemporaryRegionActive: boolean
  temporaryRegionProgress: number
  temporaryRegionTimeFormatted: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  regionChange: [region: string]
}>()

const selectedRegion = ref(props.currentRegion)

// Update selectedRegion when currentRegion prop changes
watch(() => props.currentRegion, (newRegion) => {
  selectedRegion.value = newRegion
})

const spawnProgress = computed(() => {
  // Assuming max spawn timer is around 30 seconds, adjust as needed
  const maxTimer = 30
  return Math.max(0, ((maxTimer - props.spawnTimer) / maxTimer) * 100)
})
</script>
