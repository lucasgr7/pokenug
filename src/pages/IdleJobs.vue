<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import type { Pokemon } from '../types/pokemon'
import PokemonGrid from '../components/PokemonGrid.vue'

const gameStore = useGameStore()

// PokemonGrid configuration
const verticalMode = ref(true)
const columnSize = ref(2)
const showParty = ref(true)

// Tooltip functionality
const showTooltip = ref(false)
const tooltipContent = ref('')
const tooltipX = ref(0)
const tooltipY = ref(0)

function showInfoTooltip(event: MouseEvent, content: string) {
  tooltipContent.value = content
  tooltipX.value = event.clientX + 10
  tooltipY.value = event.clientY + 10
  showTooltip.value = true
}

function hideTooltip() {
  showTooltip.value = false
}

// Tooltip content dictionary
const tooltips = {
  totalLevel: "The sum of all assigned Pokémon levels. Higher total levels means faster job completion and better success chance.",
  baseSuccess: "The base probability of getting a reward when the job completes.",
  multiPokemonBonus: "Bonus success chance from assigning multiple Pokémon to this job. Each additional Pokémon increases success rate.",
  levelBonus: "Bonus success chance from Pokémon levels. Each level contributes +0.2% success chance.",
  currentSuccess: "Total success probability including all bonuses.",
  multiPokemonSpeed: "Speed bonus from assigning multiple Pokémon. Each additional Pokémon reduces completion time.",
  levelSpeed: "Speed bonus from Pokémon levels. Each level contributes +0.5% speed boost.",
  remainingTime: "Estimated time remaining until job completes.",
  successRate: "Number of successful completions compared to total attempts.",
  dragPokemon: "Drag Pokémon here from your party or available Pokémon to assign them to this job."
}

// Rest of the existing code
function handleDrop(event: DragEvent, jobId: string | number) {
  if (!event.dataTransfer) return
  
  const data = JSON.parse(event.dataTransfer.getData('application/json'))
  
  // Find the actual Pokemon reference from the store based on data properties
  // Include uniqueId in the comparison to distinguish between same Pokemon types
  let pokemon
  if (data.isParty) {
    // For party Pokémon, now including uniqueId in comparison when available
    pokemon = gameStore.playerPokemon.find(p => 
      p.name === data.name && 
      p.level === data.level && 
      (data.uniqueId ? p.uniqueId === data.uniqueId : true)
    )
  } else {
    // For available Pokémon, now including uniqueId in comparison when available
    pokemon = gameStore.availablePokemon.find(p => 
      p.name === data.name && 
      p.level === data.level && 
      (data.uniqueId ? p.uniqueId === data.uniqueId : true)
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

// Format percentage for display
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Calculate level-based speed boost for a job
function getLevelSpeedBoost(jobId: string): number {
  const job = gameStore.idleJobs[jobId];
  if (!job || job.assignedPokemon.length === 0) return 0;
  
  // Calculate total level boost (0.5% per level)
  return job.assignedPokemon.reduce((sum, pokemon) => {
    return sum + ((pokemon.level || 1) * 0.005);
  }, 0);
}

// Calculate level-based success chance boost for a job
function getLevelSuccessBoost(jobId: string): number {
  const job = gameStore.idleJobs[jobId];
  if (!job || job.assignedPokemon.length === 0) return 0;
  
  // Calculate total level boost (0.2% per level)
  return job.assignedPokemon.reduce((sum, pokemon) => {
    return sum + ((pokemon.level || 1) * 0.002);
  }, 0);
}

// Get the total levels of all Pokémon assigned to a job
function getTotalLevels(jobId: string): number {
  const job = gameStore.idleJobs[jobId];
  if (!job || job.assignedPokemon.length === 0) return 0;
  
  return job.assignedPokemon.reduce((sum, pokemon) => {
    return sum + (pokemon.level || 1);
  }, 0);
}
</script>
<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">Idle Jobs</h1>
    
    <!-- Grid layout with PokemonGrid on the left and Idle Jobs on the right -->
    <div class="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
      <!-- Left Column: PokemonGrid -->
      <div class="w-full md:w-1/4">
        <div class="bg-gray-50 p-3 rounded-lg shadow mb-4">
          <h2 class="text-lg font-bold text-gray-700 mb-2">Available Pokémon</h2>
          
          <!-- PokemonGrid Configuration Controls -->
          <div class="mb-4 flex flex-wrap gap-2 text-sm">
            <label class="flex items-center">
              <input type="checkbox" v-model="showParty" class="mr-1">
              Show Party
            </label>
            <label class="flex items-center ml-auto">
              <span class="mr-2">Columns:</span>
              <select v-model="columnSize" class="border rounded px-1">
                <option v-for="n in 4" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>
          </div>
          
          <!-- The PokemonGrid component -->
          <PokemonGrid 
            :show-party="showParty"
            :vertical-mode="verticalMode"
            :column-size="columnSize"
            :filter-type="''"
          />
        </div>
      </div>

      <!-- Right Column: Idle Jobs -->
      <div class="w-full md:w-3/4">
        <div class="flex flex-col space-y-6">
          <!-- Jobs Area - Grid Layout with Type-Based Colors -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
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
                    <div class="mt-1 text-xs font-medium">
                      <!-- Improved stats display -->
                      <span 
                        class="bg-white bg-opacity-15 px-2 py-1 rounded-full cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.successRate)"
                        @mouseout="hideTooltip"
                      >
                        Success: {{ job.successfulCompletions }}/{{ job.completions }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p class="text-sm opacity-80 mb-3">{{ job.description }}</p>
                
                <!-- Total Level Display -->
                <div v-if="job.assignedPokemon.length > 0" class="text-xs font-medium mb-2">
                  <span 
                    class="bg-white bg-opacity-30 px-2 py-1 rounded-full cursor-help"
                    @mouseover="showInfoTooltip($event, tooltips.totalLevel)"
                    @mouseout="hideTooltip"
                  >
                    Total Level: {{ getTotalLevels(String(id)) }}
                  </span>
                </div>
                
                <!-- Success Chance Display -->
                <div class="flex flex-wrap gap-2 mb-2 text-xs">
                  <div 
                    class="bg-gray-300 bg-opacity-80 px-2 py-1 rounded-full cursor-help"
                    @mouseover="showInfoTooltip($event, tooltips.baseSuccess)"
                    @mouseout="hideTooltip"
                  >
                    <span class="font-medium">Base Success: {{ formatPercent(job.reward.chance) }}</span>
                  </div>
                  
                  <!-- Multi-Pokémon Bonus -->
                  <div 
                    v-if="job.assignedPokemon.length > 1" 
                    class="bg-white bg-opacity-30 px-2 py-1 rounded-full cursor-help"
                    @mouseover="showInfoTooltip($event, tooltips.multiPokemonBonus)"
                    @mouseout="hideTooltip"
                  >
                    <span class="font-medium">
                      +{{ formatPercent(job.percentualProgressWithAdditionalPokemon * (job.assignedPokemon.length - 1)) }} (Multi-Pokémon)
                    </span>
                  </div>
                  
                  <!-- Level Bonus -->
                  <div 
                    v-if="job.assignedPokemon.length > 0 && getLevelSuccessBoost(String(id)) > 0" 
                    class="bg-white bg-opacity-30 px-2 py-1 rounded-full cursor-help"
                    @mouseover="showInfoTooltip($event, tooltips.levelBonus)"
                    @mouseout="hideTooltip"
                  >
                    <span class="font-medium">
                      +{{ formatPercent(getLevelSuccessBoost(String(id))) }} (Levels)
                    </span>
                  </div>
                  
                  <!-- Current Success Rate -->
                  <div 
                    v-if="job.assignedPokemon.length > 0" 
                    class="bg-green-500 bg-opacity-80 px-2 py-1 rounded-full ml-auto cursor-help border-white border-2"
                    @mouseover="showInfoTooltip($event, tooltips.currentSuccess)"
                    @mouseout="hideTooltip"
                  >
                    <span class="font-bold ">
                      Success rate: {{ formatPercent(gameStore.getJobSuccessChance(String(id))) }}
                    </span>
                  </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="relative pt-1 mb-3">
                  <div class="overflow-hidden h-2 text-xs flex rounded bg-white bg-opacity-30">
                    <div 
                      :style="{ width: job.progress + '%' }"
                      class="shadow-none flex flex-col text-center whitespace-nowrap justify-center bg-white bg-opacity-70 transition-all duration-500"
                    >
                    </div>
                  </div>
                  
                  <!-- Speed Bonuses -->
                  <div class="flex flex-wrap gap-2 mt-2 text-xs">
                    <!-- Multi-Pokémon Speed Bonus -->
                    <div 
                      v-if="job.percentualProgressWithAdditionalPokemon && job.assignedPokemon.length > 1" 
                      class="bg-white bg-opacity-20 px-2 py-1 rounded-full cursor-help"
                      @mouseover="showInfoTooltip($event, tooltips.multiPokemonSpeed)"
                      @mouseout="hideTooltip"
                    >
                      <span class="font-medium">
                        +{{ formatPercent(job.percentualProgressWithAdditionalPokemon * (job.assignedPokemon.length - 1)) }} Speed (Multi-Pokémon)
                      </span>
                    </div>
                    
                    <!-- Level-based Speed Bonus -->
                    <div 
                      v-if="job.assignedPokemon.length > 0 && getLevelSpeedBoost(String(id)) > 0" 
                      class="bg-white bg-opacity-20 px-2 py-1 rounded-full cursor-help"
                      @mouseover="showInfoTooltip($event, tooltips.levelSpeed)"
                      @mouseout="hideTooltip"
                    >
                      <span class="font-medium">
                        +{{ formatPercent(getLevelSpeedBoost(String(id))) }} Speed (Levels)
                      </span>
                    </div>
                    
                    <!-- Remaining Time -->
                    <div 
                      class="bg-white bg-opacity-40 px-2 py-1 rounded-full ml-auto cursor-help"
                      @mouseover="showInfoTooltip($event, tooltips.remainingTime)"
                      @mouseout="hideTooltip"
                    >
                      <span class="font-bold">
                        Time: {{ Math.round((gameStore.getJobRemainingTime(String(id)) / 1000)) }}s
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Pokemon Slots -->
                <div 
                  class="grid grid-cols-5 gap-2 mt-3 bg-white bg-opacity-10 p-2 rounded-lg" 
                  @dragover.prevent
                  @drop="handleDrop($event, id)"
                  @mouseover="showInfoTooltip($event, tooltips.dragPokemon)"
                  @mouseout="hideTooltip"
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
                        <!-- Show the Pokémon's level in a badge -->
                        <span class="absolute top-0 right-0 bg-white text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {{ job.assignedPokemon[i-1].level }}
                        </span>
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
        </div>
      </div>
    </div>
    
    <!-- Tooltip component -->
    <div 
      v-if="showTooltip" 
      class="fixed bg-black bg-opacity-80 text-white text-xs p-2 rounded shadow-lg z-50 max-w-xs"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      {{ tooltipContent }}
    </div>
  </div>
</template>