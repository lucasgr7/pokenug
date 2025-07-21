<template>
  <div class="notification-header bg-red-600 border-red-700 px-1 py-1">
      
      <div class="flex items-center space-x-2">
        <button
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
        <!-- Berry Tasks Display Icon (sibling to button) -->
        <BerryTasksDisplay :active-tasks="activeBerryTasks" @cancel-task="cancelBerryTask" class="ml-2" />
        <!-- Notification Dropdown -->
        <Transition name="dropdown">
          <div 
            v-if="showNotifications"
            class="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
          <!-- Header -->
          <div class="px-2 py-2 border-b border-gray-200 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">Notifications</h3>
            <button
              v-if="notifications.length > 0"
              @click="clearAllNotifications"
              class="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          </div>
          <!-- Notification List -->
          <div class="max-h-96 overflow-y-auto">
            <div v-if="notifications.length === 0" class="px-2 py-4 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a2 2 0 00-2-2H6a2 2 0 00-2-2v1m16 4V5a2 2 0 00-2-2H6a2 2 0 00-2-2v1" />
              </svg>
              <p>No notifications yet</p>
            </div>
            <div 
              v-for="notification in notifications" 
              :key="notification.id"
              class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-150"
            >
              <div class="px-2 py-2 flex items-start space-x-2">
                <!-- Type Icon -->
                <div class="flex-shrink-0 mt-1">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :class="getNotificationDotColor(notification.type)"
                  ></div>
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p 
                      class="text-sm font-medium flex-1"
                      :class="getNotificationTextColor(notification.type)"
                    >
                      {{ notification.message }}
                    </p>
                    <span 
                      v-if="notification.count && notification.count > 1"
                      class="ml-2 px-2 py-1 text-xs font-bold rounded-full flex-shrink-0"
                      :class="getCountBadgeColor(notification.type)"
                    >
                      {{ notification.count }}x
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatTimestamp(notification.timestamp) }}
                    <span v-if="notification.count && notification.count > 1" class="ml-1 font-medium">
                      ({{ notification.count }} times)
                    </span>
                  </p>
                </div>
                <!-- Close button -->
                <button
                  @click.stop="removeNotification(notification.id)"
                  class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          </div>
        </Transition>
      </div>
    </div> <!-- notification-header -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BerryTasksDisplay from './BerryTasksDisplay.vue'
import { berryService } from '@/services/berryService'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const showNotifications = ref(false)

const notifications = computed(() => gameStore.notifications)
const unreadCount = computed(() => notifications.value.length)

// Berry tasks for BerryTasksDisplay (global, not region-specific)
const activeBerryTasks = computed(() => berryService.getActiveTasks())

function cancelBerryTask(taskId: string) {
  berryService.cancelTask(taskId)
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
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
  }
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
