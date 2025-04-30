<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { imageCache } from '../services/imageCache'

const props = defineProps<{
  src: string
  alt: string
  class?: string
}>()

const cachedSrc = ref<string>(props.src)
const hasError = ref(false)

async function loadImage(url: string) {
  try {
    const cached = await imageCache.getImage(url)
    
    // Check if the cached image is valid
    if (cached.startsWith('data:application/octet-stream;base64,')) {
      // Invalid cache, clear it and try to fetch again
      console.warn('[CachedImage] Invalid cached image detected, refetching:', url)
      imageCache.clearImageCache(url)
      const refetched = await imageCache.getImage(url)
      cachedSrc.value = refetched
    } else {
      cachedSrc.value = cached
    }
    hasError.value = false
  } catch (error) {
    console.error('[CachedImage] Failed to load image:', error)
    cachedSrc.value = url // Fallback to original URL
    hasError.value = true
  }
}

// Load image when component mounts
onMounted(() => {
  loadImage(props.src)
})

// Watch for src changes
watch(() => props.src, (newSrc) => {
  if (newSrc !== cachedSrc.value) {
    loadImage(newSrc)
  }
})

// Handle image load error
function handleError() {
  if (!hasError.value) {
    console.warn('[CachedImage] Image failed to load, trying original URL:', props.src)
    cachedSrc.value = props.src
    hasError.value = true
  }
}
</script>

<template>
  <img 
    :src="cachedSrc" 
    :alt="alt" 
    :class="class"
    @error="handleError"
  />
</template>