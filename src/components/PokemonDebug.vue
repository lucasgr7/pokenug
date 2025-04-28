<template>
  <div  class="p-6">
    <!-- Starter Reset Controls -->
    <div class="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <h3 class="text-lg font-semibold mb-2">Debug Controls</h3>
      <div class="flex gap-4">
        <button
          v-for="starter in starters"
          :key="starter"
          @click="setStarter(starter)"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          :class="{ 'bg-green-500 hover:bg-green-600': gameStore.playerPokemon?.name === starter }"
        >
          Set {{ starter }}
        </button>
        <button
          @click="gameStore.selectRandomStarter()"
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Random Starter
        </button>
      </div>
    </div>
    <!-- State Display -->
    <div class="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 class="text-lg font-semibold mb-2">Game State</h3>
      <pre class="bg-gray-800 text-white p-4 rounded overflow-auto max-h-96">
        {{ JSON.stringify(gameStore.$state, null, 2) }}
      </pre>
    </div>

    
  </div>
</template>

<script setup lang="ts">
import { usePokemon } from '../composables/usePokemon';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const { pokemonList } = usePokemon();

// Starter Pokemon options
const starters = ['pikachu', 'squirtle', 'charmander', 'bulbasaur'];

// Function to set starter Pokemon
const setStarter = (pokemonName: string) => {
  gameStore.setStarterPokemon(pokemonName);
};
</script>