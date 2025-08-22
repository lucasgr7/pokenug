<template>
  <Transition name="dropdown">
    <Teleport to="body">
      <div
        v-if="show"
        ref="popupRef"
        :style="popupStyle as any"
        class="bg-white rounded-lg shadow-lg border border-gray-200 z-50"
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
        <div class="max-h-96 overflow-y-auto w-80">
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
                    :class="callDotColor(notification.type)"
                  ></div>
              </div>
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p 
                    class="text-sm font-medium flex-1"
                    :class="callTextColor(notification.type)"
                  >
                    {{ notification.message }}
                  </p>
                  <span 
                    v-if="notification.count && notification.count > 1"
                    class="ml-2 px-2 py-1 text-xs font-bold rounded-full flex-shrink-0"
                      :class="callCountBadgeColor(notification.type)"
                  >
                    {{ notification.count }}x
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  {{ callFormatTimestamp(notification.timestamp) }}
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
    </Teleport>
  </Transition>
</template>


<script setup lang="ts">
import { ref, computed, toRefs } from 'vue'

type NotificationType = {
  id: string
  message: string
  type?: string
  timestamp?: number
  count?: number
}

const props = defineProps<{
  show: boolean
  position: { top: number; left: number }
  notifications: NotificationType[]
  clearAllNotifications: () => void
  removeNotification: (id: string) => void
  formatTimestamp: (ts: number) => string
  getNotificationDotColor: (type: string) => string
  getNotificationTextColor: (type: string) => string
  getCountBadgeColor: (type: string) => string
}>()

const { show, position, notifications } = toRefs(props as any)

const popupRef = ref<HTMLElement | null>(null)

const popupStyle = computed(() => {
  const pos = position?.value
  if (!pos) return { position: 'absolute', top: '0px', left: '0px' }
  return {
    position: 'absolute',
    top: `${pos.top}px`,
    left: `${pos.left}px`,
  }
})

function clearAllNotifications() {
  props.clearAllNotifications()
}

function removeNotification(id: string) {
  props.removeNotification(id)
}

function callDotColor(type: string) {
  return props.getNotificationDotColor(type)
}

function callTextColor(type: string) {
  return props.getNotificationTextColor(type)
}

function callCountBadgeColor(type: string) {
  return props.getCountBadgeColor(type)
}

function callFormatTimestamp(ts: number) {
  return props.formatTimestamp(ts)
}
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
