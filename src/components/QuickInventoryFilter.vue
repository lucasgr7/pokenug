<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700/70 relative">
      <button @click="$emit('close')" class="absolute top-2 right-2 text-slate-400 hover:text-white">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <h2 class="text-lg font-bold text-white mb-4">Filter Quick Inventory</h2>
      <div class="max-h-72 overflow-y-auto">
        <div v-for="item in allItems" :key="item.id" class="flex items-center mb-2">
          <input type="checkbox" :id="item.id" v-model="selectedIds" :value="item.id" class="mr-2">
          <label :for="item.id" class="flex items-center gap-2 cursor-pointer">
            <img :src="`/images/${item.id}.png`" :alt="item.name" class="w-6 h-6 rounded-full bg-white/10 border border-slate-600">
            <span class="text-slate-200 text-sm">{{ item.name }} <span class="text-xs text-slate-400">(x{{ item.quantity }})</span></span>
          </label>
        </div>
      </div>
      <div class="flex justify-end mt-4 gap-2">
        <button @click="$emit('close')" class="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Cancel</button>
        <button @click="applyFilter" class="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Apply</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import type { InventoryItem } from '@/types/pokemon'

const props = defineProps<{
  show: boolean,
  allItems: InventoryItem[],
  selected: string[]
}>()
const emit = defineEmits(['close', 'apply-filter'])

const selectedIds = ref<string[]>([...props.selected])

watch(() => props.selected, (val) => {
  selectedIds.value = [...val]
})

function applyFilter() {
  emit('apply-filter', selectedIds.value)
  emit('close')
}
</script>

<style scoped>
/* Modal styles */
</style>
