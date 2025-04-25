import { ref, computed } from 'vue';
import type { Ref } from 'vue';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  description: string;
}

export function usePokemon() {
  const pokemonList: Ref<Pokemon[]> = ref([]);
  const isLoading = ref(true);
  const error = ref<string | null>(null);

  // Load Pokemon data from the local JSON
  async function loadPokemonData() {
    try {
      const response = await fetch('/pokemon-data.json');
      if (!response.ok) throw new Error('Failed to load Pokemon data');
      pokemonList.value = await response.json();
      isLoading.value = false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load Pokemon data';
      isLoading.value = false;
    }
  }

  // Initialize data loading
  loadPokemonData();

  // Search methods
  const findById = (id: number) => pokemonList.value.find(p => p.id === id);
  const findByName = (name: string) => {
    const searchName = name.toLowerCase();
    return pokemonList.value.find(p => p.name.toLowerCase() === searchName);
  };
  
  const findByType = (type: string) => {
    const searchType = type.toLowerCase();
    return pokemonList.value.filter(p => 
      p.types.some(t => t.toLowerCase() === searchType)
    );
  };

  // Get all available types
  const allTypes = computed(() => {
    const types = new Set<string>();
    pokemonList.value.forEach(pokemon => {
      pokemon.types.forEach(type => types.add(type));
    });
    return Array.from(types).sort();
  });

  return {
    pokemonList,
    isLoading,
    error,
    findById,
    findByName,
    findByType,
    allTypes,
  };
}