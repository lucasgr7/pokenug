<template>
  <div class="grid grid-cols-4 gap-3 sm:flex sm:flex-row sm:space-x-4 sm:space-y-0">
    <!-- Capture Button -->
    <div class="relative group">
      <button @click="$emit('capture')" :disabled="!canCapture"
        class="relative w-14 h-14 sm:w-16 sm:h-16 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden select-none flex items-center justify-center border-4 border-blue-400 hover:scale-110 shadow-lg touch-manipulation"
        :class="{
          'hover:shadow-blue-500/50': canCapture,
          'opacity-50 cursor-not-allowed': !canCapture
        }">
        <!-- Pokeball Icon -->
        <svg class="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
            stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
          <circle cx="24" cy="24" r="6" fill="currentColor" stroke="currentColor" stroke-width="4"
            stroke-linejoin="round" />
          <path d="M30 24H44" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 24H18" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="24" cy="24" r="2" fill="white" />
        </svg>

        <!-- Hover glow effect -->
        <div
          class="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
        </div>
      </button>

      <!-- Count Badge -->
      <div v-if="pokeballCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
        {{ pokeballCount > 99 ? '99+' : pokeballCount }}
      </div>

      <!-- Tooltip on hover (desktop) -->
      <div
        class="hidden sm:block absolute left-1/2 -translate-x-1/2 -top-12 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        Capture ({{ pokeballCount }})
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>

    <!-- Berry Button -->
    <div class="relative group" v-if="canUseBerry">
      <button @click="$emit('berry')"
        class="relative w-14 h-14 sm:w-16 sm:h-16 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden select-none flex items-center justify-center border-4 border-green-400 hover:scale-110 shadow-lg touch-manipulation"
        :class="{
          'hover:shadow-green-500/50': canUseBerry,
          'opacity-50 cursor-not-allowed': !canUseBerry
        }">
        <!-- Berry Icon -->
        <svg class="w-5 h-5 sm:w-7 sm:h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5">
          <path d="M12 2L8 7l4 5 4-5-4-5z" />
          <path d="M8 7v10c0 2.21 1.79 4 4 4s4-1.79 4-4V7" />
        </svg>

        <!-- Hover glow effect -->
        <div
          class="absolute inset-0 rounded-full bg-green-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
        </div>
      </button>

      <!-- Count Badge -->
      <div v-if="berryCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
        {{ berryCount > 99 ? '99+' : berryCount }}
      </div>

      <!-- Tooltip on hover (desktop) -->
      <div
        class="hidden sm:block absolute left-1/2 -translate-x-1/2 -top-12 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        Use Berry ({{ berryCount }})
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>

    <!-- Seeker Stone Button -->
    <div class="relative group" v-if="canUseSeekerStone">
      <button @click="$emit('seeker-stone')"
        class="relative w-14 h-14 sm:w-16 sm:h-16 bg-yellow-600 text-white rounded-full hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden select-none flex items-center justify-center border-4 border-yellow-500 hover:scale-110 shadow-lg touch-manipulation"
        :class="{
          'hover:shadow-yellow-600/50': canUseSeekerStone,
          'opacity-50 cursor-not-allowed': !canUseSeekerStone
        }">
        <!-- Diamond/Stone Icon -->
        <svg viewBox="0 0 24 24" width="24" class="sm:w-7 sm:h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 18.4731C11.7501 18.4731 11.5002 18.5344 11.2706 18.657L5.36689 21.809C3.97914 22.5499 2.49789 20.9984 3.16496 19.5025L10.5275 2.99281C10.8226 2.33094 11.4113 2 12 2"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
          <path opacity="0.5"
            d="M12 18.4731C12.2499 18.4731 12.4998 18.5344 12.7294 18.657L18.6331 21.809C20.0209 22.5499 21.5021 20.9984 20.835 19.5025L13.4725 2.99281C13.1774 2.33094 12.5887 2 12 2"
            stroke="currentColor" stroke-width="1.5"></path>
        </svg>

        <!-- Mystical sparkle effect for seeker stone -->
        <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300">
          <div
            class="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 rounded-full animate-pulse">
          </div>
        </div>

        <!-- Hover glow effect -->
        <div
          class="absolute inset-0 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
        </div>
      </button>

      <!-- Count Badge -->
      <div v-if="seekerStoneCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
        {{ seekerStoneCount > 99 ? '99+' : seekerStoneCount }}
      </div>

      <!-- Tooltip on hover (desktop) -->
      <div
        class="hidden sm:block absolute left-1/2 -translate-x-1/2 -top-12 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        Seeker Stone ({{ seekerStoneCount }})
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>

    <!-- Dragon Stone Button -->
    <div class="relative group" v-if="canUseDragonStone">
      <button @click="$emit('dragon-stone')"
        class="relative w-14 h-14 sm:w-16 sm:h-16 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden select-none flex items-center justify-center border-4 border-purple-500 hover:scale-110 shadow-lg touch-manipulation"
        :class="{
          'hover:shadow-purple-600/50': canUseDragonStone,
          'opacity-50 cursor-not-allowed': !canUseDragonStone
        }">
        <!-- Dragon Stone Icon -->
        <svg class="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L16 8L12 14L8 8L12 2Z" fill="currentColor"/>
          <path d="M8 8L4 12L8 16L12 14L8 8Z" fill="currentColor" opacity="0.7"/>
          <path d="M16 8L20 12L16 16L12 14L16 8Z" fill="currentColor" opacity="0.7"/>
          <path d="M8 16L12 22L16 16L12 14L8 16Z" fill="currentColor" opacity="0.9"/>
        </svg>

        <!-- Mystical dragon energy effect -->
        <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-300">
          <div class="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 rounded-full animate-pulse"></div>
        </div>

        <!-- Hover glow effect -->
        <div class="absolute inset-0 rounded-full bg-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      </button>

      <!-- Count Badge -->
      <div v-if="dragonStoneCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
        {{ dragonStoneCount > 99 ? '99+' : dragonStoneCount }}
      </div>

      <!-- Tooltip on hover (desktop) -->
      <div class="hidden sm:block absolute left-1/2 -translate-x-1/2 -top-12 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        Dragon Stone ({{ dragonStoneCount }})
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  canCapture: boolean
  canUseBerry: boolean
  canUseSeekerStone: boolean
  canUseDragonStone: boolean
  pokeballCount: number
  berryCount: number
  seekerStoneCount: number
  dragonStoneCount: number
}

interface Emits {
  (e: 'capture'): void
  (e: 'berry'): void
  (e: 'seeker-stone'): void
  (e: 'dragon-stone'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
/* Enhanced glow effects for mobile touch */
button:hover {
  filter: brightness(1.1);
}

button:active {
  transform: scale(0.95);
}

button:disabled:hover {
  transform: none;
  filter: none;
}

/* Additional sparkle animation for seeker stone */
@keyframes sparkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.group:hover .animate-sparkle {
  animation: sparkle 1.5s ease-in-out infinite;
}

/* Mobile touch optimization */
.touch-manipulation {
  touch-action: manipulation;
}

/* Better tap highlight for mobile */
@media (hover: none) {
  button:active {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
