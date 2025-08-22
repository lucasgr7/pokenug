<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import type { Pokemon } from '../types/pokemon'
import PokemonGrid from '../components/PokemonGrid.vue'
import CachedImage from '../components/CachedImage.vue'

const gameStore = useGameStore()

// PokemonGrid configuration
const verticalMode = ref(true)
const columnSize = ref(2)
const showParty = ref(true)
const itemsPerPage = ref(8) // Added itemsPerPage with default value



// Utility: Get live remaining time for a job (ms) using fixed duration
function getLiveJobRemainingTime(jobId: string): number {
  const job = gameStore.idleJobs[jobId];
  if (!job || !job.startTime || !job.currentDuration) return 0;
  const now = Date.now();
  const elapsed = now - job.startTime;
  return Math.max(0, job.currentDuration - elapsed);
}

// Helper: Set job duration and start time (call when job starts or assignment changes)
function setJobStart(jobId: string) {
  const job = gameStore.idleJobs[jobId];
  if (!job) return;
  job.currentDuration = gameStore.getJobRemainingTime(jobId);
  job.startTime = Date.now();
}

let progressUpdateTimer: number | null = null;
onMounted(() => {
  // On mount, handle jobs with assignedPokemon:
  // - If missing BOTH startTime and currentDuration, initialize them
  // - If only currentDuration is missing (after refresh), recalculate it
  // - If both are present, check if job is already completed and reset if needed
  Object.keys(gameStore.idleJobs).forEach(jobId => {
    const job = gameStore.idleJobs[jobId];
    if (job.assignedPokemon.length > 0) {
      const missingStart = typeof job.startTime === 'undefined' || job.startTime === null;
      const missingDuration = typeof job.currentDuration === 'undefined' || job.currentDuration === null;
      if (missingStart && missingDuration) {
        setJobStart(jobId);
      } else if (!missingStart && missingDuration) {
        // After refresh: startTime exists but currentDuration is missing, so recalculate it
        job.currentDuration = gameStore.getJobRemainingTime(jobId);
      }
      // Now, if both are present, check if job is already completed (time elapsed >= duration)
      if (!missingStart && !missingDuration) {
        if (typeof job.startTime === 'number' && typeof job.currentDuration === 'number') {
          const now = Date.now();
          const elapsed = now - job.startTime;
          if (elapsed >= job.currentDuration) {
            gameStore.completeJob(jobId);
            setJobStart(jobId);
          }
        }
      }
    }
  });

  // Immediately recalculate and set progress for all jobs with assigned Pokémon
  const now = Date.now();
  Object.keys(gameStore.idleJobs).forEach(jobId => {
    const job = gameStore.idleJobs[jobId];
    if (job.assignedPokemon.length > 0 && typeof job.startTime === 'number' && typeof job.currentDuration === 'number') {
      const elapsed = now - job.startTime;
      let progress = Math.min(100, (elapsed / job.currentDuration) * 100);
      progress = Math.max(0, Math.min(100, progress));
      job.progress = progress;
    } else {
      job.progress = 0;
    }
  });
  progressUpdateTimer = window.setInterval(() => {
    const now = Date.now();
    Object.keys(gameStore.idleJobs).forEach(jobId => {
      const job = gameStore.idleJobs[jobId];
      if (job.assignedPokemon.length > 0 && job.startTime && job.currentDuration) {
        const elapsed = now - job.startTime;
        let progress = Math.min(100, (elapsed / job.currentDuration) * 100);
        progress = Math.max(0, Math.min(100, progress));
        job.progress = progress;
        // Check if job has completed
        if (progress >= 100) {
          gameStore.completeJob(jobId);
          setJobStart(jobId);
        }
      } else {
        job.progress = 0;
      }
    });
  }, 1000);
});

onUnmounted(() => {
  if (progressUpdateTimer !== null) {
    clearInterval(progressUpdateTimer);
    progressUpdateTimer = null;
  }
});

// Filtrar apenas os jobs com tipos de Pokémon que o jogador possui
const availableJobs = computed(() => {
  const allJobs = gameStore.idleJobs;
  const filteredJobs: Record<string, typeof allJobs[keyof typeof allJobs]> = {};
  
  Object.entries(allJobs).forEach(([id, job]) => {
    if (gameStore.hasAnyPokemonOfType(job.type)) {
      filteredJobs[id] = job;
    }
    job.progress = Math.round(job.progress || 0); // Ensure progress is rounded to 2 decimal places
  });
  
  return filteredJobs;
});

// Carousel functionality
const currentJobIndex = ref(0)
const isAnimating = ref(false)

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

// Carousel navigation functions
function nextJob() {
  if (isAnimating.value) return
  const jobKeys = Object.keys(availableJobs.value)
  if (currentJobIndex.value < jobKeys.length - 1) {
    isAnimating.value = true
    currentJobIndex.value++
    setTimeout(() => isAnimating.value = false, 500)
  }
}

function prevJob() {
  if (isAnimating.value) return
  if (currentJobIndex.value > 0) {
    isAnimating.value = true
    currentJobIndex.value--
    setTimeout(() => isAnimating.value = false, 500)
  }
}

function goToJob(index: number) {
  if (isAnimating.value) return
  isAnimating.value = true
  currentJobIndex.value = index
  setTimeout(() => isAnimating.value = false, 500)
}

// Computed property for current job
const currentJob = computed(() => {
  const jobKeys = Object.keys(availableJobs.value)
  const jobKey = jobKeys[currentJobIndex.value]
  return jobKey ? { jobId: jobKey, ...availableJobs.value[jobKey] } : null
})

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
  let pokemon
  if (data.isParty) {
    pokemon = gameStore.playerPokemon.find(p => 
      p.name === data.name && 
      p.level === data.level && 
      (data.uniqueId ? p.uniqueId === data.uniqueId : true)
    )
  } else {
    pokemon = gameStore.availablePokemon.find(p => 
      p.name === data.name && 
      p.level === data.level && 
      (data.uniqueId ? p.uniqueId === data.uniqueId : true)
    )
  }
  if (pokemon) {
    if (pokemon.faintedAt) {
      if (data.isParty) {
        gameStore.swapPokemonBetweenPartyAndAvailable(pokemon, false)
      }
      return
    }
    gameStore.assignPokemonToJob(pokemon, String(jobId))
    setJobStart(String(jobId)); // Reset duration and start time on assignment
  }
}

function removePokemon(pokemon: Pokemon, jobId: string | number) {
  gameStore.removePokemonFromJob(pokemon, String(jobId))
  setJobStart(String(jobId)); // Reset duration and start time on removal
}

// Function to get contrasting text color (white or black) based on background color
function getContrastingTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Function to get the complementary (opposite) color of a hex color
function getComplementaryColor(hexColor: string): string {
  // Remove the hash if present
  const hex = hexColor.replace('#', '');
  // Parse r, g, b values
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Get complementary
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  // Convert back to hex
  return (
    '#' +
    compR.toString(16).padStart(2, '0') +
    compG.toString(16).padStart(2, '0') +
    compB.toString(16).padStart(2, '0')
  );
}

// Function to adjust brightness of a hex color
function adjustBrightness(hexColor: string, percent: number): string {
  // Remove the hash if present
  const hex = hexColor.replace('#', '');
  
  // Parse r, g, b values
  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  // Helper function to clamp values between 0 and 255
  const clamp = (value: number) => {
    if (value < 1) return 0;
    if (value > 255) return 255;
    return value;
  };
  
  const clampedR = clamp(R);
  const clampedG = clamp(G);
  const clampedB = clamp(B);
  
  return '#' + (0x1000000 + clampedR * 0x10000 + clampedG * 0x100 + clampedB)
    .toString(16).slice(1);
}

// Format percentage for display
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Format remaining time in a human-readable format (dd hh:mm:ss)
function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  // Build the time string based on what values are non-zero
  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
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
  <div class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen p-2 lg:p-4">
    <h1 class="text-2xl lg:text-3xl font-bold text-gray-800 mb-3 lg:mb-4 text-center">Idle Jobs</h1>
    
    <!-- Split layout with PokemonGrid (35%) and Carousel (65%) side by side -->
    <div class="flex flex-col lg:flex-row gap-2 h-[calc(100vh-6rem)] max-w-full mx-auto">
      <!-- Left Side: PokemonGrid (35%) -->
      <div class="w-full lg:w-[35%] flex flex-col min-h-0">
        <div class="bg-white p-2 lg:p-3 rounded-lg shadow-md border border-gray-200 flex-1 flex flex-col min-h-0">
          <h2 class="text-sm lg:text-base font-bold text-gray-700 mb-2">Available Pokémon</h2>
          
          <!-- PokemonGrid Configuration Controls -->
          <div class="mb-2 flex flex-wrap gap-1 lg:gap-2 text-xs lg:text-sm">
            <label class="flex items-center bg-gray-100 px-2 py-1 rounded-full">
              <input type="checkbox" v-model="showParty" class="mr-1">
              Show Party
            </label>
            <label class="flex items-center bg-gray-100 px-2 py-1 rounded-full">
              <span class="mr-1">Cols:</span>
              <select v-model="columnSize" class="border rounded px-1 py-0.5 bg-white text-xs">
                <option v-for="n in 4" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>
          </div>
          
          <!-- The PokemonGrid component -->
          <div class="flex-1 min-h-0 overflow-hidden">
            <PokemonGrid 
              :show-party="showParty"
              :vertical-mode="verticalMode"
              :column-size="columnSize"
              :filter-type="''"
              :items-per-page="itemsPerPage"
            />
          </div>
        </div>
      </div>

      <!-- Right Half: Carousel -->
      <div class="w-full md:w-1/2 flex flex-col min-h-2">
        <!-- Carousel Navigation Indicators -->
        <div class="flex justify-center mb-3 md:mb-4">
          <div class="flex space-x-1.5 lg:space-x-2">
            <button
              v-for="(job, index) in Object.values(availableJobs)"
              :key="index"
              @click="goToJob(index)"
              :class="[
                'w-3 h-3 lg:w-4 lg:h-4 rounded-full transition-all duration-300 border-2 border-white shadow-lg',
                index === currentJobIndex 
                  ? 'scale-125 shadow-xl' 
                  : 'scale-100 opacity-70 hover:opacity-100 hover:scale-110'
              ]"
              :style="{ 
                backgroundColor: job.backgroundColor || '#f3f4f6'
              }"
            />
          </div>
        </div>

        <!-- Main Carousel Container -->
        <div class="relative overflow-hidden max-w-2xl mx-auto flex-1 flex flex-col">
          <!-- Navigation Arrows -->
          <button
            @click="prevJob"
            :disabled="currentJobIndex === 0"
            :class="[
              'absolute left-0 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 lg:w-12 lg:h-12 rounded-full shadow-lg transition-all duration-200',
              'flex items-center justify-center text-white text-lg lg:text-xl font-bold',
              currentJobIndex === 0 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-blue-500 hover:bg-blue-600 hover:scale-110 active:scale-95'
            ]"
          >
            ‹
          </button>
          
          <button
            @click="nextJob"
            :disabled="currentJobIndex === Object.keys(availableJobs).length - 1"
            :class="[
              'absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 lg:w-12 lg:h-12 rounded-full shadow-lg transition-all duration-200',
              'flex items-center justify-center text-white text-lg lg:text-xl font-bold',
              currentJobIndex === Object.keys(availableJobs).length - 1 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-blue-500 hover:bg-blue-600 hover:scale-110 active:scale-95'
            ]"
          >
            ›
          </button>

          <!-- Carousel Cards Container -->
          <div
            class="flex transition-transform duration-500 ease-out mx-6 sm:mx-8 lg:mx-12 xl:mx-16 flex-1"
            :style="{ transform: `translateX(-${currentJobIndex * 100}%)` }"
          >
            <!-- Job Cards -->
            <div
              v-for="(job, id) in availableJobs"
              :key="id"
              class="w-full flex-shrink-0 px-1 sm:px-2 lg:px-4 flex flex-col"
            >
              <!-- Animated Job Card -->
              <div
                class="relative rounded-xl lg:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 flex-1 flex flex-col"
                :style="{ 
                  background: `linear-gradient(135deg, ${job.backgroundColor || '#f3f4f6'}, ${job.backgroundColor ? adjustBrightness(job.backgroundColor, -20) : '#e5e7eb'})`,
                  color: getContrastingTextColor(job.backgroundColor || '#f3f4f6')
                }"
              >
                <!-- Animated Background Pattern -->
                <div class="absolute inset-0 opacity-10">
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-shimmer"></div>
                </div>

                <!-- Card Content -->
                <div class="relative p-3 lg:p-6 z-10 flex-1 flex flex-col">
                  <!-- Job Header -->
                  <div class="flex items-center mb-3 lg:mb-4">
                    <div class="relative">
                      <div class="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white mr-3 lg:mr-4 p-2 flex items-center justify-center shadow-lg">
                        <img :src="job.icon" :alt="job.name" class="max-w-full rounded-full max-h-full object-contain">
                      </div>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg lg:text-2xl font-bold mb-1 truncate">{{ job.name }}</h3>
                      <div class="text-xs lg:text-sm opacity-90 mb-1 lg:mb-2">Type: {{ job.type }}</div>
                      <div class="flex space-x-1 lg:space-x-2 text-xs">
                        <span class="bg-white bg-opacity-20 px-2 py-1 rounded-full">
                          {{ job.assignedPokemon.length }}/{{ gameStore.getJobEffectiveMaxSlots(id) }} Slots
                        </span>
                        <span 
                          class="bg-white bg-opacity-20 px-2 py-1 rounded-full cursor-help"
                          @mouseover="showInfoTooltip($event, tooltips.successRate)"
                          @mouseout="hideTooltip"
                        >
                          Success: {{ job.successfulCompletions }}/{{ job.completions }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p class="text-xs lg:text-sm opacity-80 mb-3 lg:mb-4 flex-shrink-0">{{ job.description }}</p>
                  
                  <!-- Stats Section -->
                  <div class="bg-black bg-opacity-10 rounded-lg lg:rounded-xl p-2 lg:p-3 mb-3 lg:mb-4 flex-shrink-0">
                    <!-- Total Level Display -->
                    <div v-if="job.assignedPokemon.length > 0" class="mb-2 lg:mb-3">
                      <span 
                        class="inline-block bg-white bg-opacity-30 px-2 py-1 rounded-full text-xs font-medium cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.totalLevel)"
                        @mouseout="hideTooltip"
                      >
                        Total Level: {{ getTotalLevels(String(id)) }}
                      </span>
                    </div>
                    
                    <!-- Success Chance Displays -->
                    <div class="grid grid-cols-2 gap-2 mb-2 lg:mb-3 text-xs">
                      <div 
                        class="bg-gray-300 bg-opacity-80 px-2 py-1 rounded-lg cursor-help text-center"
                        @mouseover="showInfoTooltip($event, tooltips.baseSuccess)"
                        @mouseout="hideTooltip"
                      >
                        <div class="font-medium">Base Success</div>
                        <div class="text-sm lg:text-lg font-bold">{{ formatPercent(job.chance) }}</div>
                      </div>
                      
                      <div 
                        v-if="job.assignedPokemon.length > 0" 
                        class="bg-green-500 bg-opacity-80 px-2 py-1 rounded-lg cursor-help text-center border-2 border-white"
                        @mouseover="showInfoTooltip($event, tooltips.currentSuccess)"
                        @mouseout="hideTooltip"
                      >
                        <div class="font-medium">Current Success</div>
                        <div class="text-sm lg:text-lg font-bold">{{ formatPercent(gameStore.getJobSuccessChance(String(id))) }}</div>
                      </div>
                    </div>
                    
                    <!-- Bonus Details -->
                    <div class="flex flex-wrap gap-1 text-xs">
                      <!-- Multi-Pokémon Bonus -->
                      <div 
                        v-if="job.assignedPokemon.length > 1" 
                        class="bg-white bg-opacity-30 px-2 py-1 rounded-full cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.multiPokemonBonus)"
                        @mouseout="hideTooltip"
                      >
                        +{{ formatPercent((job.percentualProgressWithAdditionalPokemon ?? 0) * (job.assignedPokemon.length - 1)) }} Multi
                      </div>
                      
                      <!-- Level Bonus -->
                      <div 
                        v-if="job.assignedPokemon.length > 0 && getLevelSuccessBoost(String(id)) > 0" 
                        class="bg-white bg-opacity-30 px-2 py-1 rounded-full cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.levelBonus)"
                        @mouseout="hideTooltip"
                      >
                        +{{ formatPercent(getLevelSuccessBoost(String(id))) }} Levels
                      </div>
                    </div>
                  </div>
                  
                  <!-- Progress Section -->
                  <div class="mb-3 lg:mb-4 flex-shrink-0">
                    <div class="flex justify-between items-center mb-2 text-xs lg:text-sm">
                      <span class="font-medium opacity-80">Progress (Time Remaining)</span>
                      <span 
                        class="font-bold bg-white bg-opacity-30 px-2 py-1 rounded-full cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.remainingTime)"
                        @mouseout="hideTooltip"
                      >
                        {{ formatTimeRemaining(getLiveJobRemainingTime(String(id))) }}
                      </span>
                    </div>
                    <!-- Animated Progress Bar with Remaining Time -->
                    <div class="relative h-3 lg:h-4 bg-black bg-opacity-20 rounded-full overflow-hidden">
                      <div 
                        :style="{ width: job.progress + '%' }"
                        class="h-full bg-gradient-to-r from-white to-white bg-opacity-80 rounded-full transition-all duration-1000 ease-out relative"
                      >
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-pulse"></div>
                      </div>
                      <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-black">
                        {{ formatTimeRemaining(getLiveJobRemainingTime(String(id))) }}
                      </div>
                    </div>
                    
                    <!-- Speed Bonuses -->
                    <div class="flex flex-wrap gap-1 mt-2 text-xs">
                      <!-- Multi-Pokémon Speed Bonus -->
                      <div 
                        v-if="job.percentualProgressWithAdditionalPokemon && job.assignedPokemon.length > 1" 
                        class="bg-white bg-opacity-20 px-2 py-1 rounded-full cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.multiPokemonSpeed)"
                        @mouseout="hideTooltip"
                      >
                        +{{ formatPercent(job.percentualProgressWithAdditionalPokemon * (job.assignedPokemon.length - 1)) }} Speed
                      </div>
                      
                      <!-- Level-based Speed Bonus -->
                      <div 
                        v-if="job.assignedPokemon.length > 0 && getLevelSpeedBoost(String(id)) > 0" 
                        class="bg-white bg-opacity-20 px-2 py-1 rounded-full cursor-help"
                        @mouseover="showInfoTooltip($event, tooltips.levelSpeed)"
                        @mouseout="hideTooltip"
                      >
                        +{{ formatPercent(getLevelSpeedBoost(String(id))) }} Speed
                      </div>
                    </div>
                  </div>
                  
                  <!-- Pokemon Slots -->
                  <div class="bg-black bg-opacity-10 rounded-lg lg:rounded-xl p-2 lg:p-3 flex-1 flex flex-col">
                    <h4 class="text-xs lg:text-sm font-bold mb-2 opacity-90">Assigned Pokémon</h4>
                    <div 
                      class="grid grid-cols-4 sm:grid-cols-5 gap-1 sm:gap-2 flex-1" 
                      @dragover.prevent
                      @drop="handleDrop($event, id)"
                      @mouseover="showInfoTooltip($event, tooltips.dragPokemon)"
                      @mouseout="hideTooltip"
                    >
                      <div 
                        v-for="i in gameStore.getJobEffectiveMaxSlots(id)" 
                        :key="i"
                        class="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-200"
                        :class="{ 
                          'border-white border-opacity-30 hover:border-opacity-50': !job.assignedPokemon[i-1],
                          'border-none': job.assignedPokemon[i-1] 
                        }"
                      >
                        <template v-if="job.assignedPokemon[i-1]">
                          <div 
                            class="relative group cursor-pointer w-full h-full flex items-center justify-center rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200" 
                            @click="removePokemon(job.assignedPokemon[i-1], id)"
                          >
                            <CachedImage 
                              :pokemon-id="job.assignedPokemon[i-1].id"
                              :alt="job.assignedPokemon[i-1].name"
                              :className="'w-6 h-6 lg:w-8 lg:h-8 object-contain'"
                            />
                            <!-- Level Badge -->
                            <span class="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center shadow-lg">
                              {{ job.assignedPokemon[i-1].level }}
                            </span>
                            <!-- Remove Overlay -->
                            <div class="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-80 flex items-center justify-center text-white text-xs font-bold rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                              ✕
                            </div>
                          </div>
                        </template>
                        <template v-else>
                          <div class="flex flex-col items-center justify-center text-xs opacity-50">
                            <div class="w-4 h-4 lg:w-6 lg:h-6 rounded-full border-2 border-dashed border-current mb-1"></div>
                            <span class="text-[10px] lg:text-xs">Empty</span>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Job Counter -->
        <div class="text-center mt-3 lg:mt-6 text-gray-600 flex-shrink-0">
          <span class="text-xs lg:text-sm">
            Job {{ currentJobIndex + 1 }} of {{ Object.keys(availableJobs).length }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Tooltip component -->
    <div 
      v-if="showTooltip" 
      class="fixed bg-black bg-opacity-90 text-white text-xs p-3 rounded-lg shadow-xl z-50 max-w-xs border border-gray-700"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      {{ tooltipContent }}
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%) skewX(-12deg);
  }
  100% {
    transform: translateX(200%) skewX(-12deg);
  }
}

.animate-shimmer {
  animation: shimmer 3s ease-in-out infinite;
}

/* Custom shadow for enhanced 3D effect */
.shadow-3xl {
  box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
}

/* Smooth transitions for all interactive elements */
.transition-all {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced hover effects */
.hover\:scale-110:hover {
  transform: scale(1.1);
}

.active\:scale-95:active {
  transform: scale(0.95);
}

/* Custom gradient animations */
@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 6s ease infinite;
}

/* Enhanced progress bar animations */
@keyframes progress-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6);
  }
}

.animate-progress-glow {
  animation: progress-glow 2s ease-in-out infinite;
}
</style>