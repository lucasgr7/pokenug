<template>
  <Transition name="dropdown">
    <Teleport to="body">
        <div
          v-if="show"
          ref="popupRef"
          :style="popupStyle as any"
          class="bg-white rounded-lg shadow-lg border border-green-200 z-50 w-80"
        >
        <div class="px-2 py-2 border-b border-green-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-green-700">Berry Tasks</h3>
          <button
            v-if="activeCount > 0"
            @click="() => clearAll()"
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
          <div v-for="task in activeTasks" :key="task.id" class="border-b border-green-100 last:border-b-0 hover:bg-green-50 transition-colors duration-150">
            <div class="px-2 py-2 flex items-start space-x-2">
              <div class="flex-shrink-0 mt-1">
                <BerryIcon :berry="task.berryId" size="xs" :name="task.berryName" with-border />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-green-700">{{ task.berryName }}</p>
                  <span class="ml-2 px-2 py-1 text-xs font-bold rounded-full flex-shrink-0 bg-green-100 text-green-800">
                    {{ formatRemainingTime(getRemainingTime(task.id)) }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ getRegionName(task.regionId) }}</p>
              </div>
              <button @click.stop="cancelTask(task.id)" class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-150" aria-label="Cancel task">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, toRefs, PropType } from 'vue'
import BerryIcon from '../BerryIcon.vue'
import regions from '@/constants/regions'
import { berryService } from '@/services/berryService'

type BerryTask = {
  id: string
  berryId: string
  berryName: string
  regionId: string
  startTime: number
  endTime: number
}

const props = defineProps({
  show: { type: Boolean as PropType<boolean>, required: true },
  anchorEl: { type: Object as PropType<HTMLElement | null>, required: false },
  activeTasks: { type: Array as PropType<BerryTask[]>, required: true },
  cancelTask: { type: Function as PropType<(id: string) => void>, required: true },
  clearAll: { type: Function as PropType<() => void>, required: true },
})

const { show, anchorEl, activeTasks: activeTasksRef } = toRefs(props as any)

const popupRef = ref<HTMLElement | null>(null)

const activeTasks = computed(() => (activeTasksRef && activeTasksRef.value) || [])
const activeCount = computed(() => activeTasks.value.length)

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

function cancelTask(taskId: string) {
  ;(props as any).cancelTask && (props as any).cancelTask(taskId)
}

function clearAll() {
  ;(props as any).clearAll && (props as any).clearAll()
}

const popupStyle = computed<any>(() => {
  const anchorAny = (anchorEl as any)
  const anchor: HTMLElement | null = anchorAny && (anchorAny.value || anchorAny) || null
  if (!anchor) return { position: 'absolute', top: '0px', left: '0px' }
  const rect = (anchor as HTMLElement).getBoundingClientRect()
  return {
    position: 'absolute',
    top: `${rect.bottom + window.scrollY + 8}px`,
    left: `${rect.left + window.scrollX}px`,
  }
})
</script>

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
