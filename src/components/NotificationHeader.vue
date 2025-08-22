<template>
  <div class="notification-header bg-red-600 border-red-700 px-1 py-1">
      
      <div class="flex items-center space-x-2">
        <button
          ref="bellButtonRef"
          @click="toggleNotifications"
          class="relative p-2 rounded-full hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 shadow-[2px_2px_4px_0_rgba(0,0,0,0.15)]"
          :class="{ 'bg-red-700': showNotifications }"
        >
          <!-- Bell Icon -->
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            class="h-6 w-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          <!-- Notification Count Badge -->
          <div 
            v-if="unreadCount > 0"
            class="absolute -top-1 -right-1 bg-yellow-400 text-red-900 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </div>
        </button>
        <!-- Berry Tasks button (sibling to bell) -->
        <button
          ref="berryButtonRef"
          @click="toggleBerryTasks"
          class="ml-2 relative p-2 rounded-full bg-green-100 hover:bg-green-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-md"
          aria-label="Show berry tasks"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-700" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="#34d399" />
            <ellipse cx="12" cy="10" rx="5" ry="7" fill="#bbf7d0" />
            <circle cx="12" cy="12" r="3" fill="#059669" />
          </svg>
          <div v-if="activeBerryCount > 0" class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {{ activeBerryCount > 99 ? '99+' : activeBerryCount }}
          </div>
        </button>

        <!-- Berry Tasks modal -->
        <BerryTasksDisplay
          class="ml-2"
          :show="showBerryTasks"
          :anchor-el="berryButtonRef"
          :active-tasks="activeBerryTasks"
          :cancel-task="cancelBerryTask"
          :clear-all="cancelAllBerryTasks"
        />

        <!-- Notification Dropdown (teleported modal) -->
        <NotificationDropdown
          :show="showNotifications"
          :position="dropdownPosition"
          :notifications="notifications"
          :clear-all-notifications="clearAllNotifications"
          :remove-notification="removeNotification"
          :format-timestamp="formatTimestamp"
          :get-notification-dot-color="getNotificationDotColor"
          :get-notification-text-color="getNotificationTextColor"
          :get-count-badge-color="getCountBadgeColor"
        />
      </div>
    </div> <!-- notification-header -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import BerryTasksDisplay from './modals/BerryTasksDisplay.vue'
import NotificationDropdown from './modals/NotificationDropdown.vue'
import { berryService } from '@/services/berryService'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const showNotifications = ref(false)
const showBerryTasks = ref(false)

// anchor refs for positioning
const bellButtonRef = ref<HTMLElement | null>(null)
const berryButtonRef = ref<HTMLElement | null>(null)

const dropdownPosition = ref({ top: 0, left: 0 })

const notifications = computed(() => gameStore.notifications)
const unreadCount = computed(() => notifications.value.length)

// Berry tasks for BerryTasksDisplay (global, not region-specific)
const activeBerryTasks = computed(() => berryService.getActiveTasks())
const activeBerryCount = computed(() => (activeBerryTasks.value || []).length)

function cancelBerryTask(taskId: string) {
  berryService.cancelTask(taskId)
}

function cancelAllBerryTasks() {
  // if empty string passed in original API to cancel all
  berryService.cancelTask('')
  showBerryTasks.value = false
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    updateDropdownPosition(bellButtonRef.value)
  }
}

function toggleBerryTasks() {
  showBerryTasks.value = !showBerryTasks.value
  if (showBerryTasks.value) {
    updateDropdownPosition(berryButtonRef.value)
  }
}

function removeNotification(id: string) {
  gameStore.removeNotification(id)
}

function clearAllNotifications() {
  // Clear all notifications
  notifications.value.forEach(notification => {
    gameStore.removeNotification(notification.id)
  })
  showNotifications.value = false
}

function getNotificationDotColor(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'info':
    default:
      return 'bg-blue-500'
  }
}

function getNotificationTextColor(type: string) {
  switch (type) {
    case 'success':
      return 'text-green-800'
    case 'error':
      return 'text-red-800'
    case 'warning':
      return 'text-yellow-800'
    case 'info':
    default:
      return 'text-blue-800'
  }
}

function getCountBadgeColor(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800'
    case 'info':
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

function formatTimestamp(timestamp: number) {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  const dropdown = document.querySelector('.notification-header')
  
  if (dropdown && !dropdown.contains(target)) {
    showNotifications.value = false
    showBerryTasks.value = false
  }
}

function updateDropdownPosition(anchor: HTMLElement | null) {
  if (!anchor) return
  nextTick(() => {
    const rect = anchor.getBoundingClientRect()
    dropdownPosition.value.top = rect.bottom + window.scrollY + 8
    dropdownPosition.value.left = rect.left + window.scrollX
  })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Dropdown Animation */
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
