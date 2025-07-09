<template>
  <div class="p-6">
    <!-- Starter Reset Controls -->
    <div class="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <h3 class="text-lg font-semibold mb-2">Debug Controls</h3>
      <div class="flex gap-4">
        <button
          v-for="starter in starters"
          :key="starter"
          @click="setStarter(starter)"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          :class="{ 'bg-green-500 hover:bg-green-600': gameStore.playerPokemon.some(p => p.name === starter) }"
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

    <!-- Add Pokemon to Roster -->
    <div class="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
      <h3 class="text-lg font-semibold mb-4">Add Pokemon to Roster</h3>
      
      <!-- Search and Filter Controls -->
      <div class="mb-4 flex items-center gap-4">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search by name..."
          class="px-4 py-2 border rounded-lg flex-1"
        />
        <select v-model="selectedType" class="px-4 py-2 border rounded-lg">
          <option value="">All Types</option>
          <option v-for="type in allTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
        <input
          v-model.number="pokemonLevel"
          type="number"
          min="1"
          max="100"
          placeholder="Level"
          class="px-4 py-2 border rounded-lg w-20"
        />
      </div>

      <!-- Pokemon Selection Table -->
      <div class="max-h-96 overflow-auto border rounded-lg">
        <table class="w-full">
          <thead class="bg-gray-100 sticky top-0">
            <tr>
              <th class="p-2 text-left">ID</th>
              <th class="p-2 text-left">Sprite</th>
              <th class="p-2 text-left">Name</th>
              <th class="p-2 text-left">Types</th>
              <th class="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pokemon in filteredPokemon" :key="pokemon.id" class="border-b hover:bg-gray-50">
              <td class="p-2">#{{ pokemon.id.toString().padStart(3, '0') }}</td>
              <td class="p-2">
                <img 
                  :src="pokemon.sprite" 
                  :alt="pokemon.name" 
                  class="w-12 h-12 object-contain"
                  @error="(e) => (e.target as HTMLImageElement).src = '/images/not-found.png'"
                />
              </td>
              <td class="p-2 capitalize font-medium">{{ pokemon.name }}</td>
              <td class="p-2">
                <span
                  v-for="type in pokemon.types"
                  :key="type"
                  class="inline-block px-2 py-1 rounded-full text-white text-xs mr-1"
                  :class="getTypeColor(type)"
                >
                  {{ type }}
                </span>
              </td>
              <td class="p-2">
                <button
                  @click="addPokemonToRoster(pokemon)"
                  class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                >
                  Add to Roster
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Quick Add Section -->
      <div class="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 class="font-medium mb-2">Quick Add by Name:</h4>
        <div class="flex gap-2">
          <input
            v-model="quickAddName"
            type="text"
            placeholder="Enter Pokemon name (e.g., pikachu)"
            class="px-3 py-2 border rounded-lg flex-1"
            @keyup.enter="quickAddPokemon"
          />
          <button
            @click="quickAddPokemon"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Quick Add
          </button>
        </div>
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
import { ref, computed } from 'vue';
import { usePokemon } from '../composables/usePokemon';
import { useGameStore } from '../stores/gameStore';
import { generateRandomId } from '@/services/util';
import type { Pokemon } from '@/types/pokemon';

const gameStore = useGameStore();
const { pokemonList, allTypes } = usePokemon();

// Starter Pokemon options
const starters = ['pikachu', 'squirtle', 'charmander', 'bulbasaur'];

// Pokemon roster addition state
const searchTerm = ref('');
const selectedType = ref('');
const pokemonLevel = ref(5);
const quickAddName = ref('');

// Function to set starter Pokemon
const setStarter = (pokemonName: string) => {
  gameStore.setStarterPokemon(pokemonName);
};

// Filtered Pokemon list for the table
const filteredPokemon = computed(() => {
  return pokemonList.value.filter(pokemon => {
    const matchesSearch = pokemon.name.toLowerCase().includes(searchTerm.value.toLowerCase());
    const matchesType = !selectedType.value || pokemon.types.includes(selectedType.value);
    return matchesSearch && matchesType;
  }).slice(0, 50); // Limit to 50 results for performance
});

// Function to get type colors
const getTypeColor = (type: string) => {
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
};

// Function to add Pokemon to roster
const addPokemonToRoster = (pokedexPokemon: any) => {
  const level = pokemonLevel.value || 5;
  
  // Create a proper Pokemon object for the game
  const pokemon: Pokemon = {
    id: pokedexPokemon.id,
    name: pokedexPokemon.name,
    sprite: pokedexPokemon.sprite,
    types: pokedexPokemon.types,
    level: level,
    experience: 0,
    experienceToNextLevel: Math.floor(100 * Math.pow(level, 1.5)),
    uniqueId: generateRandomId(),
    // Stats will be generated automatically by addPokemonToInventory
    maxHP: undefined,
    currentHP: undefined,
    attack: undefined,
    defense: undefined
  };

  // Add to game inventory
  gameStore.addPokemonToInventory(pokemon);
  gameStore.addNotification(`Added ${pokemon.name} (Level ${level}) to your roster!`, 'success');
};

// Quick add function
const quickAddPokemon = () => {
  if (!quickAddName.value.trim()) {
    gameStore.addNotification('Please enter a Pokemon name', 'error');
    return;
  }

  const pokemon = pokemonList.value.find(p => 
    p.name.toLowerCase() === quickAddName.value.toLowerCase().trim()
  );

  if (!pokemon) {
    gameStore.addNotification(`Pokemon "${quickAddName.value}" not found`, 'error');
    return;
  }

  addPokemonToRoster(pokemon);
  quickAddName.value = '';
};
</script>