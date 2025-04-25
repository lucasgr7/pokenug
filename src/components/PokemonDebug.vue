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

    <!-- Existing Pokemon List -->
    <div class="mb-4 flex items-center gap-4">
      <input
        v-model="search"
        type="text"
        placeholder="Search by name..."
        class="px-4 py-2 border rounded-lg"
      />
      <select v-model="selectedType" class="px-4 py-2 border rounded-lg">
        <option value="">All Types</option>
        <option v-for="type in allTypes" :key="type" :value="type">
          {{ type }}
        </option>
      </select>
    </div>

    <div v-if="isLoading">Loading Pokémon data...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <!-- Pokemon Table -->
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-100">
            <th class="p-2 text-left">ID</th>
            <th class="p-2 text-left">Sprite</th>
            <th class="p-2 text-left">Name</th>
            <th class="p-2 text-left">Types</th>
            <th class="p-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pokemon in displayedPokemon" :key="pokemon.id" class="border-b">
            <td class="p-2">#{{ pokemon.id.toString().padStart(3, '0') }}</td>
            <td class="p-2">
              <img :src="pokemon.sprite" :alt="pokemon.name" class="w-16 h-16 object-contain" />
            </td>
            <td class="p-2 capitalize">{{ pokemon.name }}</td>
            <td class="p-2">
              <span
                v-for="type in pokemon.types"
                :key="type"
                class="inline-block px-2 py-1 rounded-full text-white text-sm mr-1"
                :class="getTypeColor(type)"
              >
                {{ type }}
              </span>
            </td>
            <td class="p-2 max-w-md">{{ pokemon.description }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="mt-4 flex justify-between items-center">
        <div>
          Showing {{ startIndex + 1 }}-{{ endIndex }} of {{ filteredPokemon.length }}
        </div>
        <div class="flex gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            @click="currentPage++"
            :disabled="endIndex >= filteredPokemon.length"
            class="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePokemon } from '../composables/usePokemon';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const { pokemonList, isLoading, error, allTypes } = usePokemon();

// Starter Pokemon options
const starters = ['pikachu', 'squirtle', 'charmander', 'bulbasaur'];

// Function to set starter Pokemon
const setStarter = (pokemonName: string) => {
  gameStore.setStarterPokemon(pokemonName);
};

const search = ref('');
const selectedType = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;

const filteredPokemon = computed(() => {
  return pokemonList.value.filter(pokemon => {
    const matchesSearch = pokemon.name.toLowerCase().includes(search.value.toLowerCase());
    const matchesType = !selectedType.value || pokemon.types.includes(selectedType.value);
    return matchesSearch && matchesType;
  });
});

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage, filteredPokemon.value.length));

const displayedPokemon = computed(() => {
  return filteredPokemon.value.slice(startIndex.value, endIndex.value);
});

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    normal: 'bg-gray-400',
    fire: 'bg-red-500',
    water: 'bg-blue-500',
    electric: 'bg-yellow-500',
    grass: 'bg-green-500',
    ice: 'bg-blue-300',
    fighting: 'bg-red-700',
    poison: 'bg-purple-500',
    ground: 'bg-yellow-700',
    flying: 'bg-indigo-400',
    psychic: 'bg-pink-500',
    bug: 'bg-green-600',
    rock: 'bg-yellow-600',
    ghost: 'bg-purple-700',
    dragon: 'bg-indigo-700',
    dark: 'bg-gray-700',
    steel: 'bg-gray-500',
    fairy: 'bg-pink-400'
  };
  return colors[type.toLowerCase()] || 'bg-gray-400';
}
</script>