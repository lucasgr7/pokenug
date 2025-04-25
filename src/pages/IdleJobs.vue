<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">Idle Jobs</h1>
    
    <!-- Jobs Area -->
    <div class="space-y-6">
      <div v-for="(job, id) in gameStore.idleJobs" :key="id" 
           class="bg-gray-100 p-4 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold">{{ job.name }}</h3>
          <div class="text-sm text-gray-600 space-x-4">
            <span>{{ job.assignedPokemon.length }}/{{ job.maxSlots }} Slots</span>
            <span class="bg-blue-100 px-2 py-1 rounded">
              Completions: {{ job.completions }}
            </span>
            <span class="bg-green-100 px-2 py-1 rounded">
              Successes: {{ job.successfulCompletions }}
            </span>
          </div>
        </div>
        
        <p class="text-gray-600 mb-4">{{ job.description }}</p>
        
        <!-- Progress Bar -->
        <div class="relative pt-1">
          <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div :style="{ width: job.progress + '%' }"
                 class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500">
            </div>
          </div>
          <div class="text-xs text-gray-600 text-right">
            Time per cycle: {{ Math.round((gameStore.getJobRemainingTime(id) / 1000)) }}s
          </div>
        </div>
        
        <!-- Pokemon Slots -->
        <div class="grid grid-cols-5 gap-2 mt-4" 
             @dragover.prevent
             @drop="handleDrop($event, id)">
          <div v-for="i in job.maxSlots" :key="i"
               class="h-16 rounded border-2 border-dashed border-gray-300 flex items-center justify-center"
               :class="{ 'border-solid border-blue-500': job.assignedPokemon[i-1] }">
            <template v-if="job.assignedPokemon[i-1]">
              <div class="relative group cursor-pointer" @click="removePokemon(job.assignedPokemon[i-1], id)">
                <img :src="job.assignedPokemon[i-1].sprite" 
                     :alt="job.assignedPokemon[i-1].name"
                     class="w-12 h-12 object-contain">
                <div class="absolute inset-0 bg-black bg-opacity-50 group-hover:flex items-center justify-center hidden text-white text-xs">
                  Remove
                </div>
              </div>
            </template>
            <template v-else>
              <span class="text-gray-400 text-sm">Empty</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Pokemon Grid -->
    <PokemonGrid :filter-type="currentJobType" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import type { Pokemon } from '../types/pokemon'
import PokemonGrid from '../components/PokemonGrid.vue'

const gameStore = useGameStore()
const currentJobType = ref('bug') // Since we only have the bug-type job for now

function handleDrop(event: DragEvent, jobId: string) {
  if (!event.dataTransfer) return
  
  const pokemon = JSON.parse(event.dataTransfer.getData('application/json'))
  gameStore.assignPokemonToJob(pokemon, jobId)
}

function removePokemon(pokemon: Pokemon, jobId: string) {
  gameStore.removePokemonFromJob(pokemon, jobId)
}
</script>