<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import type { Pokemon } from '../types/pokemon'
import { PokemonType } from '../types/pokemon'
import PokemonGrid from '../components/PokemonGrid.vue'

const gameStore = useGameStore()

function handleDrop(event: DragEvent, jobId: string | number) {
  if (!event.dataTransfer) return
  
  const data = JSON.parse(event.dataTransfer.getData('application/json'))
  
  // Find the actual Pokemon reference from the store based on data properties
  let pokemon
  if (data.isParty) {
    // For party Pokémon, don't compare workId as it might not exist yet
    pokemon = gameStore.playerPokemon.find(p => 
      p.name === data.name && 
      p.level === data.level
    )
  } else {
    // For available Pokémon, don't compare workId as it might not exist yet
    pokemon = gameStore.availablePokemon.find(p => 
      p.name === data.name && 
      p.level === data.level
    )
  }
  
  if (pokemon) {
    // Don't assign fainted Pokémon to jobs
    if (pokemon.faintedAt) {
      // Instead of attempting to assign to a job, move to available if from party
      if (data.isParty) {
        gameStore.swapPokemonBetweenPartyAndAvailable(pokemon, false)
      }
      return
    }
    gameStore.assignPokemonToJob(pokemon, String(jobId))
  }
}

function removePokemon(pokemon: Pokemon, jobId: string | number) {
  gameStore.removePokemonFromJob(pokemon, String(jobId))
}

// Function to get contrasting text color (white or black) based on background color
function getContrastingTextColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
</script>
<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">Idle Jobs</h1>
    
    <div class="flex flex-col space-y-6">
      <!-- Jobs Area - Grid Layout with Type-Based Colors -->
      <div class="grid grid-cols-2 gap-4 w-full">
        <div 
          v-for="(job, id) in gameStore.idleJobs" 
          :key="id" 
          class="rounded-lg shadow-md overflow-hidden transition-transform hover:scale-102"
          :style="{ 
            backgroundColor: job.backgroundColor || '#f3f4f6',
            color: getContrastingTextColor(job.backgroundColor || '#f3f4f6') 
          }"
        >
          <div class="p-4">
            <!-- Job Header with Icon -->
            <div class="flex items-center mb-2">
              <div class="w-12 h-12 rounded-full bg-white mr-3 p-1 flex items-center justify-center">
                <img :src="job.icon" :alt="job.name" class="max-w-full rounded-full max-h-full object-contain">
              </div>
              <div>
                <h3 class="text-lg font-bold">{{ job.name }}</h3>
                <div class="text-sm opacity-90">
                  Type: {{ job.type }}
                </div>
              </div>
              <div class="ml-auto text-right">
                <div class="px-2 py-1 rounded bg-white bg-opacity-20 text-sm">
                  {{ job.assignedPokemon.length }}/{{ job.maxSlots }} Slots
                </div>
                <div class="mt-1 text-xs">
                  Completions: {{ job.completions }} (Success: {{ job.successfulCompletions }})
                </div>
              </div>
            </div>
            
            <p class="text-sm opacity-80 mb-3">{{ job.description }}</p>
            
            <!-- Progress Bar -->
            <div class="relative pt-1 mb-3">
              <div class="overflow-hidden h-2 text-xs flex rounded bg-white bg-opacity-30">
                <div 
                  :style="{ width: job.progress + '%' }"
                  class="shadow-none flex flex-col text-center whitespace-nowrap justify-center bg-white bg-opacity-70 transition-all duration-500"
                >
                </div>
              </div>
              <div class="text-xs text-right mt-1">
                Time per cycle: {{ Math.round((gameStore.getJobRemainingTime(String(id)) / 1000)) }}s
              </div>
            </div>
            
            <!-- Pokemon Slots -->
            <div 
              class="grid grid-cols-5 gap-2 mt-3 bg-white bg-opacity-10 p-2 rounded-lg" 
              @dragover.prevent
              @drop="handleDrop($event, id)"
            >
              <div 
                v-for="i in job.maxSlots" 
                :key="i"
                class="h-14 rounded-md border-2 border-dashed flex items-center justify-center"
                :class="{ 
                  'border-white border-opacity-30': !job.assignedPokemon[i-1],
                  'border-none': job.assignedPokemon[i-1] 
                }"
              >
                <template v-if="job.assignedPokemon[i-1]">
                  <div 
                    class="relative group cursor-pointer w-full h-full flex items-center justify-center rounded-md bg-white bg-opacity-20" 
                    @click="removePokemon(job.assignedPokemon[i-1], id)"
                  >
                    <img 
                      :src="job.assignedPokemon[i-1].sprite" 
                      :alt="job.assignedPokemon[i-1].name"
                      class="w-10 h-10 object-contain"
                    >
                    <div class="absolute inset-0 bg-black bg-opacity-50 group-hover:flex items-center justify-center hidden text-white text-xs rounded-md">
                      Remove
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="text-xs opacity-70">Empty</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Available Pokemon Grid -->
      <PokemonGrid :show-party="true" />
    </div>
  </div>
</template>