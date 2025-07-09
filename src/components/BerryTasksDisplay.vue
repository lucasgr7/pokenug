<script setup lang="ts">
import { ref, computed } from 'vue'
import BerryIcon from './BerryIcon.vue'
import regions from '@/constants/regions'
import { berryService } from '@/services/berryService'

interface BerryTask {
  id: string
  berryId: string
  berryName: string
  regionId: string
  startTime: number
  endTime: number
}

const props = defineProps<{
  activeTasks: BerryTask[]
}>()

const emit = defineEmits<{
  cancelTask: [taskId: string]
}>()

const isExpanded = ref(false)

// Calculate progress percentage for a task
function getProgressPercentage(task: BerryTask) {
  const totalDuration = task.endTime - task.startTime
  const elapsed = Date.now() - task.startTime
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
}

// Get remaining time for a berry task
function getRemainingTime(taskId: string) {
  return berryService.getRemainingTime(taskId)
}

// Format remaining time to human-readable string
function formatRemainingTime(ms: number) {
  const minutes = Math.floor(ms / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  
  return `${minutes}m ${seconds}s`
}

// Get region name from region ID
function getRegionName(regionId: string) {
  return regions[regionId as keyof typeof regions]?.name || regionId
}

// Get potential Pokémon that could be caught from a region's berry pool
function getPotentialPokemon(regionId: string) {
  const region = regions[regionId as keyof typeof regions]
  if (!region) return []
  
  // Use the berry pool if available, otherwise use the regular pool
  const pool = 'berryPool' in region ? region.berryPool : region.pool
  
  // Calculate total probability for percentage calculation
  const totalProbability = pool.reduce((sum, pokemon) => sum + (pokemon.probability || 1), 0)
  
  // Return formatted list with percentages
  return pool.map(pokemon => ({
    id: pokemon.id,
    name: pokemon.name,
    probability: (pokemon.probability / totalProbability) * 100
  }))
}

// Cancel a berry task
function cancelBerryTask(taskId: string) {
  emit('cancelTask', taskId)
}

// Computed property for the most advanced task (for compact display)
const primaryTask = computed(() => {
  if (props.activeTasks.length === 0) return null
  // Return the task with highest progress
  return props.activeTasks.reduce((prev, current) => 
    getProgressPercentage(current) > getProgressPercentage(prev) ? current : prev
  )
})

// Handle mouse enter/leave
function handleMouseEnter() {
  isExpanded.value = true
}

function handleMouseLeave() {
  isExpanded.value = false
}
</script>

<template>
  <div 
    v-if="activeTasks.length > 0" 
    class="bg-green-50 rounded-lg transition-all duration-300 ease-in-out"
    :class="isExpanded ? 'p-3' : 'p-2'"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Compact View -->
    <div v-if="!isExpanded && primaryTask" class="flex items-center space-x-3">
      <div class="flex items-center space-x-2">
        <BerryIcon
          :berry="primaryTask.berryId"
          size="xs"
          :name="primaryTask.berryName"
          with-border
        />
        <span class="text-sm font-medium text-green-700">
          {{ activeTasks.length }} Berry Task{{ activeTasks.length > 1 ? 's' : '' }}
        </span>
      </div>
      
      <!-- Compact progress bar -->
      <div class="flex-1 max-w-32">
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-green-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: getProgressPercentage(primaryTask) + '%' }"
          ></div>
        </div>
      </div>
      
      <span class="text-xs text-green-600 font-medium min-w-0">
        {{ formatRemainingTime(getRemainingTime(primaryTask.id)) }}
      </span>
      
      <!-- Expand indicator -->
      <div class="text-green-500 text-xs">
        ⬇
      </div>
    </div>

    <!-- Expanded View -->
    <div v-if="isExpanded" class="space-y-3">
      <div class="flex items-center">
        <h3 class="font-semibold text-green-700 text-sm">Active Berry Tasks</h3>
        <div class="text-green-500 text-xs">
          ⬆
        </div>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div 
          v-for="task in activeTasks" 
          :key="task.id" 
          class="border border-green-100 rounded-md p-2 bg-white"
        >
          <!-- Berry header with icon and info -->
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <BerryIcon
                :berry="task.berryId"
                size="sm"
                :name="task.berryName"
                with-border
              />
              <div class="ml-2">
                <div class="font-medium text-sm">{{ task.berryName }}</div>
                <div class="text-xs text-gray-500">{{ getRegionName(task.regionId) }}</div>
              </div>
            </div>
            <button 
              @click="cancelBerryTask(task.id)" 
              class="text-red-400 hover:text-red-600 text-sm p-1 select-none"
              title="Cancel task"
            >
              &times;
            </button>
          </div>
          
          <!-- Progress bar and time -->
          <div class="space-y-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-amber-700 font-medium">{{ formatRemainingTime(getRemainingTime(task.id)) }}</span>
              <span class="text-gray-500">{{ Math.round(getProgressPercentage(task)) }}%</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-1.5">
              <div
                class="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: getProgressPercentage(task) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Potential catches - collapsible section -->
          <div class="mt-2">
            <details class="text-xs">
              <summary class="text-gray-600 cursor-pointer">Potential catches</summary>
              <div class="pt-1 flex flex-wrap gap-1">
                <span 
                  v-for="pokemon in getPotentialPokemon(task.regionId).slice(0, 5)" 
                  :key="pokemon.id"
                  class="px-1.5 py-0.5 bg-gray-100 rounded-full inline-flex items-center"
                >
                  {{ pokemon.name }}
                  <span class="ml-1 text-gray-500 text-[10px]">({{ Math.round(pokemon.probability) }}%)</span>
                </span>
                <span 
                  v-if="getPotentialPokemon(task.regionId).length > 5" 
                  class="px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-500"
                >
                  +{{ getPotentialPokemon(task.regionId).length - 5 }} more
                </span>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transition for the expand/collapse effect */
.transition-all {
  transition: all 0.3s ease-in-out;
}

/* Custom scrollbar for potential catches if needed */
details[open] summary {
  margin-bottom: 0.25rem;
}
</style>
