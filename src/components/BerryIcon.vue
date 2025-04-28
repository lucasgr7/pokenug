<template>
  <div 
    class="berry-icon"
    :class="[
      sizeClass, 
      { 'with-border': withBorder },
      { 'rounded-full': rounded }
    ]"
  >
    <img 
      :src="iconUrl" 
      :alt="name || 'Berry icon'"
      class="w-full h-full object-contain"
      @error="handleImageError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useInventory } from '@/composables/useInventory'

const props = defineProps({
  // Berry ID or item definition with icon
  berry: {
    type: [String, Object],
    required: true
  },
  // Size variants
  size: {
    type: String,
    default: 'md',
    validator: (value: string) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  // Optional berry name for alt text
  name: {
    type: String,
    default: ''
  },
  // Should the icon have a border
  withBorder: {
    type: Boolean,
    default: false
  },
  // Should the icon be rounded
  rounded: {
    type: Boolean,
    default: true
  },
  // Fallback icon to use if the primary one fails
  fallbackIcon: {
    type: String,
    default: '/images/berry.png'
  }
})

const inventory = useInventory()

// Convert size prop to CSS class
const sizeClass = computed(() => {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }
  return sizes[props.size as keyof typeof sizes] || sizes.md
})

// Get the icon URL based on berry ID or item object
const iconUrl = computed(() => {
  if (typeof props.berry === 'string') {
    // It's a berry ID, get the definition
    const berryDefinition = inventory.getItemDefinition(props.berry)
    return berryDefinition?.icon || props.fallbackIcon
  } else if (typeof props.berry === 'object' && props.berry !== null) {
    // It's an item object with an icon property
    return props.berry.icon || props.fallbackIcon
  }
  return props.fallbackIcon
})

// Handle image loading error
const handleImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement
  imgElement.src = props.fallbackIcon
}
</script>

<style scoped>
.berry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  overflow: hidden;
}

.berry-icon.with-border {
  border: 1px solid #e5e7eb;
}

.berry-icon.rounded-full {
  border-radius: 9999px;
}
</style>