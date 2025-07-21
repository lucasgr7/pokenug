<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import BerryIcon from './BerryIcon.vue'
import regions from '@/constants/regions'
import { berryService } from '@/services/berryService'
import { useGameStore } from '@/stores/gameStore'

interface BerryTask {
  id: string
  berryId: string
  berryName: string
  regionId: string
  startTime: number
  endTime: number
  caughtPokemonName?: string // for notification
}

const props = defineProps<{ activeTasks: BerryTask[] }>()
const emit = defineEmits<{ cancelTask: [taskId: string] }>()
const showPopup = ref(false)
const berryIconRef = ref<HTMLElement | null>(null)
const gameStore = useGameStore()

// Badge count
const activeCount = computed(() => props.activeTasks.length)


// Track finished berry jobs and notify
watch(() => props.activeTasks, (newTasks, oldTasks) => {
  if (!oldTasks) return
  const oldIds = oldTasks.map(t => t.id)
  const newIds = newTasks.map(t => t.id)
  const finishedIds = oldIds.filter(id => !newIds.includes(id))
  finishedIds.forEach(id => {
    const finishedTask = oldTasks.find(t => t.id === id)
    if (finishedTask && finishedTask.caughtPokemonName) {
      gameStore.addNotification(
        `Caught ${finishedTask.caughtPokemonName} with a berry!`,
        'success'
      )
    }
  })
}, { deep: true })

function togglePopup() {
  showPopup.value = !showPopup.value
}

function handleClickOutside(event: MouseEvent) {
  if (berryIconRef.value && !berryIconRef.value.contains(event.target as Node)) {
    showPopup.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function cancelBerryTask(taskId: string) {
  emit('cancelTask', taskId)
}

function getProgressPercentage(task: BerryTask) {
  const totalDuration = task.endTime - task.startTime
  const elapsed = performance.now() - task.startTime
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
}

function getRemainingTime(taskId: string) {
  return berryService.getRemainingTime(taskId)
}

function formatRemainingTime(ms: number) {
  const minutes = Math.floor(ms / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  return `${minutes}m ${seconds}s`
}

function getRegionName(regionId: string) {
  return regions[regionId as keyof typeof regions]?.name || regionId
}

function getPotentialPokemon(regionId: string) {
  const region = regions[regionId as keyof typeof regions]
  if (!region) return []
  const pool = 'berryPool' in region ? region.berryPool : region.pool
  const totalProbability = pool.reduce((sum, pokemon) => sum + (pokemon.probability || 1), 0)
  return pool.map(pokemon => ({
    id: pokemon.id,
    name: pokemon.name,
    probability: (pokemon.probability / totalProbability) * 100
  }))
}
</script>

<template>
  <div class="relative" ref="berryIconRef">
    <!-- Berry Icon Button -->
    <button
      @click="togglePopup"
      class="relative p-2 rounded-full bg-green-100 hover:bg-green-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-md"
      aria-label="Show berry tasks"
    >
      <!-- SVG Berry Icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-700" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#34d399" />
        <ellipse cx="12" cy="10" rx="5" ry="7" fill="#bbf7d0" />
        <circle cx="12" cy="12" r="3" fill="#059669" />
      </svg>
      <!-- Badge -->
      <span v-if="activeCount > 0" class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
        {{ activeCount > 99 ? '99+' : activeCount }}
      </span>
    </button>
    <!-- Popup Dropdown -->
    <Transition name="dropdown">
      <dialog
        v-if="showPopup"
        class="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-green-200 z-50"
        open
      >
        <div class="px-2 py-2 border-b border-green-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-green-700">Berry Tasks</h3>
          <button
            v-if="activeCount > 0"
            @click="() => emit('cancelTask', '')"
            class="text-sm text-red-600 hover:text-red-800 font-medium"
            aria-label="Cancel all tasks"
          >
            Cancel All
          </button>
        </div>
        <div class="max-h-96 overflow-y-auto">
          <div v-if="activeCount === 0" class="px-2 py-4 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-green-200" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#bbf7d0" />
            </svg>
            <p>No active berry tasks</p>
          </div>
          <div v-for="task in props.activeTasks" :key="task.id" class="border-b border-green-100 last:border-b-0 hover:bg-green-50 transition-colors duration-150">
            <div class="px-2 py-2 flex items-start space-x-2">
              <!-- Berry Icon -->
              <div class="flex-shrink-0 mt-1">
                <BerryIcon :berry="task.berryId" size="xs" :name="task.berryName" with-border />
              </div>
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-green-700">{{ task.berryName }}</p>
                  <span class="ml-2 px-2 py-1 text-xs font-bold rounded-full flex-shrink-0 bg-green-100 text-green-800">
                    {{ formatRemainingTime(getRemainingTime(task.id)) }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ getRegionName(task.regionId) }}</p>
              </div>
              <!-- Cancel button -->
              <button @click.stop="cancelBerryTask(task.id)" class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-150" aria-label="Cancel task">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease-out;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
