<template>
  <div 
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click.self="onCancel"
  >
    <div 
      class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out"
      :class="isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <!-- Icon based on type -->
          <div 
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="iconConfig.bgClass"
          >
            <svg class="w-6 h-6" :class="iconConfig.textClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconConfig.path"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
            <p v-if="subtitle" class="text-sm text-gray-500">{{ subtitle }}</p>
          </div>
        </div>
        
        <!-- Close button -->
        <button 
          @click="onCancel"
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-gray-700 leading-relaxed">{{ message }}</p>
        
        <!-- Additional details slot -->
        <div v-if="$slots.details" class="mt-4 p-4 bg-gray-50 rounded-lg">
          <slot name="details"></slot>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
        <button
          @click="onCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {{ cancelText }}
        </button>
        <button
          @click="onConfirm"
          class="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
          :class="confirmButtonClass"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'

interface Props {
  isVisible: boolean
  title: string
  message: string
  subtitle?: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
}

interface Emits {
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  confirmText: 'Confirm',
  cancelText: 'Cancel'
})

const emit = defineEmits<Emits>()

// Configuration for different modal types
const iconConfig = computed(() => {
  switch (props.type) {
    case 'danger':
      return {
        bgClass: 'bg-red-100',
        textClass: 'text-red-600',
        path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z'
      }
    case 'info':
      return {
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-600',
        path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      }
    case 'success':
      return {
        bgClass: 'bg-green-100',
        textClass: 'text-green-600',
        path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      }
    default: // warning
      return {
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-600',
        path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z'
      }
  }
})

const confirmButtonClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    case 'info':
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    case 'success':
      return 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    default: // warning
      return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
  }
})

const onConfirm = () => {
  emit('confirm')
}

const onCancel = () => {
  emit('cancel')
}

// Handle Escape key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isVisible) {
    onCancel()
  }
}

// Add/remove event listeners when modal visibility changes
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      document.addEventListener('keydown', handleKeydown)
    })
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
/* Smooth backdrop fade */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Animation for modal entrance */
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.transform {
  animation: modalEnter 0.3s ease-out;
}
</style>
