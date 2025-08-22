<template>
  <div class="bg-white rounded-xl shadow-lg p-4">
    <h3 class="text-lg font-bold text-center mb-4">Battle Actions</h3>
    
    <!-- Main Action Buttons Grid -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <!-- Attack Button -->
      <button 
        @click="$emit('attack')"
        :disabled="!wildPokemon || !activePokemon"
        class="flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 h-20"
        :class="[
          wildPokemon && activePokemon 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-md active:scale-95' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        ]"
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <span class="text-sm font-medium">Attack</span>
      </button>

      <!-- Capture Button -->
      <button 
        @click="$emit('openPokeballSelector')"
        :disabled="!canCapture"
        class="flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 h-20 relative"
        :class="[
          canCapture 
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md active:scale-95' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        ]"
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
        </svg>
        <span class="text-sm font-medium">Catch</span>
        <!-- Pokeball counter badge -->
        <div class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {{ totalPokeballs }}
        </div>
      </button>

      <!-- Berry Button -->
      <button 
        @click="$emit('openBerrySelector')"
        :disabled="!canUseBerry"
        class="flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 h-20 relative"
        :class="[
          canUseBerry 
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-md active:scale-95' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        ]"
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 4v10a2 2 0 002 2h6a2 2 0 002-2V8M7 8h10M10 12v4m4-4v4"></path>
        </svg>
        <span class="text-sm font-medium">Berry</span>
        <div v-if="berryCount > 0" class="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {{ berryCount }}
        </div>
      </button>

      <!-- Seeker Stone Button -->
      <button 
        @click="$emit('openSeekerStoneSelector')"
        :disabled="!canUseSeekerStone"
        class="flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 h-20 relative"
        :class="[
          canUseSeekerStone 
            ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md active:scale-95' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        ]"
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        <span class="text-sm font-medium">Seeker</span>
        <div v-if="seekerStoneCount > 0" class="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {{ seekerStoneCount }}
        </div>
      </button>
    </div>

    <!-- Dragon Stone Button (full width when available) -->
    <button 
      v-if="canUseDragonStone"
      @click="$emit('openDragonStoneSelector')"
      class="w-full flex items-center justify-center p-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md transition-all duration-200 active:scale-95 relative"
    >
      <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
      </svg>
      <span class="font-medium">Open Ethereal Portal</span>
      <div class="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
        {{ dragonStoneCount }}
      </div>
    </button>

    <!-- Auto-attack toggle (when available) -->
    <button 
      v-if="canAutoAttack"
      @click="$emit('toggleAutoAttack')"
      class="w-full mt-3 flex items-center justify-center p-3 rounded-lg transition-all duration-200"
      :class="[
        autoAttackActive 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
          : 'bg-gray-500 hover:bg-gray-600 text-white'
      ]"
    >
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
      </svg>
      <span class="text-sm font-medium">
        {{ autoAttackActive ? 'Auto-Attack ON' : 'Auto-Attack OFF' }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  wildPokemon: any
  activePokemon: any
  canCapture: boolean
  totalPokeballs: number
  canUseBerry: boolean
  berryCount: number
  canUseSeekerStone: boolean
  seekerStoneCount: number
  canUseDragonStone: boolean
  dragonStoneCount: number
  canAutoAttack: boolean
  autoAttackActive: boolean
}

defineProps<Props>()

defineEmits<{
  attack: []
  openPokeballSelector: []
  openBerrySelector: []
  openSeekerStoneSelector: []
  openDragonStoneSelector: []
  toggleAutoAttack: []
}>()
</script>
