<template>
  <div class="relative flex-shrink-0">
    <!-- Progress ring (optional) -->
    <svg 
      v-if="showProgressRing" 
      class="absolute inset-0 w-20 h-20 -rotate-90 pointer-events-none" 
      style="z-index: 10;"
      viewBox="0 0 80 80"
    >
      <!-- Background circle -->
      <circle 
        cx="40" 
        cy="40" 
        r="36" 
        :stroke="backgroundRingColor" 
        stroke-width="5" 
        fill="none"
        opacity="0.3" 
      />
      <!-- Progress circle -->
      <circle 
        cx="40" 
        cy="40" 
        r="36" 
        :stroke="progressRingColor" 
        stroke-width="5" 
        fill="none"
        stroke-linecap="round" 
        :stroke-dasharray="226.19"
        :stroke-dashoffset="226.19 - (226.19 * progressValue / 100)" 
        class="transition-all duration-300" 
      />
    </svg>

    <!-- Circular Button -->
    <button 
      @click="$emit('click')"
      @keyup.enter="$emit('click')" 
      @keyup.space="$emit('click')" 
      :disabled="disabled"
      class="relative w-20 h-20 text-white rounded-full transition-all duration-200 overflow-hidden select-none flex items-center justify-center group border-4"
      style="z-index: 5;" 
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105',
        buttonClasses,
        animationClasses
      ]"
    >
      <!-- Icon/Content Slot -->
      <slot name="icon">
        <span class="text-2xl">{{ defaultIcon }}</span>
      </slot>

      <!-- Effect Overlay (for special states) -->
      <div 
        v-if="showEffectOverlay" 
        class="absolute inset-0 rounded-full opacity-30" 
        :class="effectOverlayClasses"
      ></div>
    </button>

    <!-- Badge (counter, level, etc.) -->
    <div 
      v-if="badge" 
      class="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg z-20" 
      :class="badgeClasses"
    >
      {{ badge }}
    </div>

    <!-- Bottom indicator (multiplier, status, etc.) -->
    <div 
      v-if="bottomIndicator"
      class="absolute -bottom-14 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-full text-xs font-bold"
      :class="bottomIndicatorClasses"
    >
      {{ bottomIndicator }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  // Button state
  disabled?: boolean
  
  // Visual style
  variant?: 'attack' | 'capture' | 'special' | 'ghost' | 'electric' | 'fire' | 'water' | 'grass'
  size?: 'sm' | 'md' | 'lg'
  
  // Progress ring
  showProgressRing?: boolean
  progressValue?: number
  progressRingColor?: string
  backgroundRingColor?: string
  
  // Badge
  badge?: string | number
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'active'
  
  // Bottom indicator
  bottomIndicator?: string
  bottomIndicatorVariant?: 'yellow' | 'orange' | 'purple' | 'blue'
  
  // Effect overlay
  showEffectOverlay?: boolean
  effectVariant?: 'fire' | 'electric' | 'water' | 'ghost'
  
  // Animation
  animate?: 'pulse' | 'glow' | 'bounce'
  
  // Icon
  defaultIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  variant: 'attack',
  size: 'md',
  showProgressRing: false,
  progressValue: 0,
  progressRingColor: 'rgb(239, 68, 68)',
  backgroundRingColor: 'rgb(185, 28, 28)',
  badgeVariant: 'default',
  bottomIndicatorVariant: 'yellow',
  showEffectOverlay: false,
  effectVariant: 'fire',
  animate: undefined,
  defaultIcon: '⚔️'
})

defineEmits<{
  click: []
}>()

// Button base classes based on variant
const buttonClasses = computed(() => {
  const variants = {
    attack: 'bg-red-500 hover:bg-red-600 border-red-400',
    capture: 'bg-blue-500 hover:bg-blue-600 border-blue-400',
    special: 'bg-purple-500 hover:bg-purple-600 border-purple-400',
    ghost: 'bg-purple-600 hover:bg-purple-700 border-purple-400',
    electric: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-400',
    fire: 'bg-orange-500 hover:bg-orange-600 border-orange-400',
    water: 'bg-blue-500 hover:bg-blue-600 border-blue-400',
    grass: 'bg-green-500 hover:bg-green-600 border-green-400'
  }
  
  return variants[props.variant]
})

// Animation classes
const animationClasses = computed(() => {
  const animations = {
    pulse: 'animate-pulse',
    glow: 'shadow-lg',
    bounce: 'animate-bounce'
  }
  
  return props.animate ? animations[props.animate] : ''
})

// Badge classes based on variant
const badgeClasses = computed(() => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    active: 'bg-purple-100 text-purple-800 animate-pulse'
  }
  
  return variants[props.badgeVariant]
})

// Bottom indicator classes
const bottomIndicatorClasses = computed(() => {
  const variants = {
    yellow: 'bg-yellow-200 text-yellow-800',
    orange: 'bg-orange-200 text-orange-800',
    purple: 'bg-purple-200 text-purple-800',
    blue: 'bg-blue-200 text-blue-800'
  }
  
  return variants[props.bottomIndicatorVariant]
})

// Effect overlay classes
const effectOverlayClasses = computed(() => {
  const effects = {
    fire: 'bg-gradient-to-r from-yellow-400 to-red-400 animate-pulse',
    electric: 'bg-gradient-to-r from-yellow-300 to-yellow-500 animate-pulse',
    water: 'bg-gradient-to-r from-blue-300 to-cyan-400 animate-pulse',
    ghost: 'bg-gradient-to-r from-purple-400 to-indigo-500 animate-pulse'
  }
  
  return effects[props.effectVariant]
})
</script>
