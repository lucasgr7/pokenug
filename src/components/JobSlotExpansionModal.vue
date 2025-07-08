<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" @click="closeModal">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" @click.stop>
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-gray-800">Expand Job Slots</h3>
        <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <p class="text-gray-600 mb-6">
        Choose an idle job to permanently expand by +1 slot. This will allow you to assign one additional Pokémon to that job.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="job in availableJobs" 
          :key="job.id"
          class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          :class="{ 'ring-2 ring-blue-500': selectedJobId === job.id }"
          @click="selectedJobId = job.id"
        >
          <div class="flex items-center mb-3">
            <img :src="job.icon" :alt="job.name" class="w-8 h-8 mr-3" @error="($event.target as HTMLImageElement).src = '/images/not-found.png'">
            <div>
              <h4 class="font-semibold text-gray-800">{{ job.name }}</h4>
              <p class="text-sm text-gray-600">{{ getJobTypeName(job.type) }}</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-700 mb-2">{{ job.description }}</p>
          
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">
              Current slots: {{ gameStore.getJobEffectiveMaxSlots(job.id) }}
            </span>
            <span class="text-green-600 font-medium">
              → {{ gameStore.getJobEffectiveMaxSlots(job.id) + 1 }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end gap-3 mt-6">
        <button 
          @click="closeModal" 
          class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="expandSelectedJob" 
          :disabled="!selectedJobId"
          class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Expand Job (+1 slot)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { PokemonType } from '../types/pokemon'
import type { IdleJob } from '../types/idleJobs'

interface Props {
  show: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'expand', jobId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const gameStore = useGameStore()
const selectedJobId = ref<string>('')

// Get all available jobs
const availableJobs = computed((): IdleJob[] => {
  return Object.values(gameStore.idleJobs)
})

// Get readable type name
const getJobTypeName = (type: PokemonType): string => {
  const typeNames: Record<PokemonType, string> = {
    [PokemonType.Normal]: 'Normal',
    [PokemonType.Fighting]: 'Fighting',
    [PokemonType.Flying]: 'Flying',
    [PokemonType.Poison]: 'Poison',
    [PokemonType.Ground]: 'Ground',
    [PokemonType.Rock]: 'Rock',
    [PokemonType.Bug]: 'Bug',
    [PokemonType.Ghost]: 'Ghost',
    [PokemonType.Steel]: 'Steel',
    [PokemonType.Fire]: 'Fire',
    [PokemonType.Water]: 'Water',
    [PokemonType.Grass]: 'Grass',
    [PokemonType.Electric]: 'Electric',
    [PokemonType.Psychic]: 'Psychic',
    [PokemonType.Ice]: 'Ice',
    [PokemonType.Dragon]: 'Dragon',
    [PokemonType.Dark]: 'Dark',
    [PokemonType.Fairy]: 'Fairy'
  }
  return typeNames[type] || type
}

const closeModal = () => {
  selectedJobId.value = ''
  emit('close')
}

const expandSelectedJob = () => {
  if (selectedJobId.value) {
    // Save expansion to localStorage
    const expansions = JSON.parse(localStorage.getItem('jobSlotExpansions') || '{}')
    expansions[selectedJobId.value] = (expansions[selectedJobId.value] || 0) + 1
    localStorage.setItem('jobSlotExpansions', JSON.stringify(expansions))
    
    // Emit the expansion event
    emit('expand', selectedJobId.value)
    
    // Show success notification
    gameStore.addNotification(`Successfully expanded ${availableJobs.value.find(j => j.id === selectedJobId.value)?.name} by +1 slot!`, 'success')
    
    closeModal()
  }
}
</script>

<style scoped>
/* Add any additional styling if needed */
</style>
