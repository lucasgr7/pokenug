<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useStorage } from '@vueuse/core'


const props = defineProps<{
  pokemonId?: number
  src?: string
  alt: string
  className?: string
  shiny?: boolean
}>()

// IndexedDB helper for image caching
function openImageDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('PokenugImageCache', 1)
    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getImageCacheKey(url: string): string {
  // If pokemonId is available, use it as the key, else fallback to url
  if (props.pokemonId) {
    return `pokemon-${props.pokemonId}${props.shiny ? '-shiny' : ''}`
  }
  return url
}

async function getCachedImage(url: string): Promise<string | undefined> {
  const db = await openImageDB()
  const key = getImageCacheKey(url)
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly')
    const store = tx.objectStore('images')
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}

async function setCachedImage(url: string, data: string) {
  const db = await openImageDB()
  const key = getImageCacheKey(url)
  console.log('[CachedImage] Caching image with key:', key)
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite')
    const store = tx.objectStore('images')
    const req = store.put(data, key)
    req.onsuccess = () => resolve(undefined)
    req.onerror = () => reject(req.error)
  })
}

const cachedSrc = ref<string>('')
const hasError = ref(false)
const loading = ref(true)

// Load pokemon-data.json once and cache in memory
let pokemonData: any[] | null = null
async function getPokemonData() {
  if (pokemonData) return pokemonData
  const res = await fetch('/pokemon-data.json')
  pokemonData = await res.json()
  return pokemonData
}

async function getSpriteUrl(): Promise<string | undefined> {
  if (props.pokemonId) {
    const data = (await getPokemonData()) ?? []
    const poke = data.find((p: any) => p.id === props.pokemonId)
    if (!poke) return undefined
    if (props.shiny && poke.shinySprite) return poke.shinySprite
    return poke.sprite
  }
  return props.src
}

async function loadImage() {
  loading.value = true
  hasError.value = false
  const url = await getSpriteUrl()
  if (!url) {
    cachedSrc.value = '/images/not-found.png'
    hasError.value = true
    loading.value = false
    return
  }
  // Try IndexedDB cache
  let cached = await getCachedImage(url)
  if (cached) {
    cachedSrc.value = cached
    loading.value = false
    return
  }
  // Fetch and cache
  try {
    console.log('[CachedImage] Fetching image from network:', url)
    const res = await fetch(url)
    if (!res.ok) throw new Error('Image fetch failed')
    const blob = await res.blob()
    const reader = new FileReader()
    reader.onloadend = async () => {
      const dataUrl = reader.result as string
      await setCachedImage(url, dataUrl)
      cachedSrc.value = dataUrl
      loading.value = false
    }
    reader.readAsDataURL(blob)
  } catch (e) {
    cachedSrc.value = url
    hasError.value = true
    loading.value = false
  }
}

onMounted(() => {
  loadImage()
})

// Watch for prop changes
watch(() => [props.pokemonId, props.src, props.shiny], () => {
  loadImage()
})

function handleError() {
  if (!hasError.value) {
    cachedSrc.value = '/images/not-found.png'
    hasError.value = true
    loading.value = false
  }
}
</script>

<template>
  <img
    v-if="!loading"
    :src="cachedSrc"
    :alt="alt"
    :class="className"
    @error="handleError"
  />
  <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 rounded">
    <span class="inline-block w-6 h-6 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
    <span class="sr-only">Loading...</span>
  </div>
</template>