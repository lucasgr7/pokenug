import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useInventory } from '@/composables/useInventory.js'
import type { InventoryItem } from '@/types/pokemon.js'

interface PokemonChoice {
  id: number
  name: string
  sprite?: string
  types: string[]
  probability: number
  source: 'pool' | 'berryPool'
}

export function useSeekerStone() {
  const gameStore = useGameStore()
  const inventory = useInventory()
  
  const isModalVisible = ref(false)
  const pokemonChoices = ref<PokemonChoice[]>([])
  const currentRegion = ref('')
  const minLevel = ref(0)
  const maxLevel = ref(0)

  const openSeekerStoneModal = async (seekerStone: InventoryItem) => {
    // Check if we're in a valid region
    if (gameStore.currentRegion === 'Home') {
      gameStore.addNotification('Cannot use seeker stone in the Home region!', 'error')
      return
    }

    // Get all available Pokemon from current region
    const allPokemon = gameStore.getCurrentRegionPokemonPool()
    
    if (allPokemon.length === 0) {
      gameStore.addNotification('No Pokemon available in this region!', 'error')
      return
    }

    // Randomly select 3 Pokemon
    const shuffled = [...allPokemon].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 3)

    // Fetch Pokemon data to get sprites and types
    try {
      const response = await fetch('/pokemon-data.json')
      const pokemonList = await response.json()
      
      const choices: PokemonChoice[] = selected.map(pokemon => {
        const data = pokemonList.find((p: any) => p.id === pokemon.id)
        return {
          id: pokemon.id,
          name: pokemon.name,
          sprite: data?.sprite,
          types: data?.types || [],
          probability: pokemon.probability,
          source: pokemon.source
        }
      })

      pokemonChoices.value = choices
      currentRegion.value = gameStore.currentRegionData.name
      minLevel.value = gameStore.currentRegionData.minLevel
      maxLevel.value = gameStore.currentRegionData.maxLevel
      isModalVisible.value = true

    } catch (error) {
      console.error('Failed to load Pokemon data:', error)
      gameStore.addNotification('Failed to load Pokemon data!', 'error')
    }
  }

  const selectPokemon = (pokemon: PokemonChoice) => {
    // Queue the selected Pokemon for spawning
    gameStore.queuePokemonForSpawn(pokemon.id, pokemon.name)
    
    // Add notification
    gameStore.addNotification(
      `The seeker stone's power ensures ${pokemon.name} will appear next!`, 
      'success'
    )

    // Close modal
    isModalVisible.value = false
    pokemonChoices.value = []
  }

  const cancelSelection = () => {
    isModalVisible.value = false
    pokemonChoices.value = []
  }

  const useSeekerStone = (seekerStone: InventoryItem) => {
    // Check if the item effect allows usage
    const canUse = gameStore.applyItemEffect(seekerStone)
    
    if (canUse) {
      // Remove the item from inventory since applyItemEffect returned true
      const inventoryStore = inventory.getInventoryStore()
      inventoryStore.removeItem(seekerStone.id, 1)
      
      // Open the selection modal
      openSeekerStoneModal(seekerStone)
    }
  }

  return {
    isModalVisible,
    pokemonChoices,
    currentRegion,
    minLevel,
    maxLevel,
    useSeekerStone,
    selectPokemon,
    cancelSelection
  }
}
