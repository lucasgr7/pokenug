<template>
  <div class="mt-8">
    <h3 class="text-lg font-semibold mb-4">Available Pokemon</h3>
    <div class="grid grid-cols-20 gap-2 max-h-[160px] overflow-y-auto p-2 bg-gray-50 rounded-lg">
      <div v-for="pokemon in availablePokemon" :key="pokemon.id"
           class="relative group cursor-pointer"
           draggable="true"
           @dragstart="handleDragStart($event, pokemon)">
        <img :src="pokemon.sprite" 
             :alt="pokemon.name"
             class="w-12 h-12 object-contain"
             :class="{ 'opacity-50': !canAssign(pokemon) }">
        <div class="absolute inset-0 bg-black bg-opacity-50 group-hover:flex hidden items-center justify-center text-white text-xs text-center p-1">
          {{ pokemon.name }}
          <br>
          Lv.{{ pokemon.level }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import type { Pokemon } from '../types/pokemon'

const props = defineProps<{
  filterType?: string
}>()

const gameStore = useGameStore()

// Get all Pokemon from inventory that aren't in the team or already working
const availablePokemon = computed(() => {
  // Convert inventory object to array of Pokemon
  const allPokemon = Object.values(gameStore.inventory.pokemon)
    .reduce<Pokemon[]>((acc, entry) => {
      // Add Pokemon to array based on count
      for (let i = 0; i < entry.count; i++) {
        acc.push({...entry.data})
      }
      return acc
    }, [])

  return allPokemon.filter(pokemon => 
    !gameStore.playerPokemon.includes(pokemon) &&
    !gameStore.idleWorking.includes(pokemon) &&
    (!props.filterType || pokemon.types.includes(props.filterType))
  )
})

function canAssign(pokemon: Pokemon) {
  if (props.filterType) {
    return pokemon.types.includes(props.filterType)
  }
  return true
}

function handleDragStart(event: DragEvent, pokemon: Pokemon) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify(pokemon))
  }
}
</script>

<style scoped>
.grid-cols-20 {
  grid-template-columns: repeat(20, minmax(0, 1fr));
}
</style>