// src/composables/usePokemonCapture.ts
import { ref } from 'vue'
import type { Pokemon } from '../types/pokemon'
import { useGameStore } from '../stores/gameStore'
import { useInventory } from './useInventory'
import type { ItemDefinition } from '../constants/items'

export function usePokemonCapture() {
  const gameStore = useGameStore()
  const inventory = useInventory()
  const isTryingCatch = ref(false)

  /**
   * Gets the catch rate from a pokeball item
   * @param ball The pokeball item to get the catch rate from
   * @returns The catch rate as a number between 0-1
   */
  const getPokeBallCatchRate = (ball: ItemDefinition): number => {
    // Check if ball has an effect and it's a catch effect
    if (ball?.effect && ball.effect.type === 'catch') {
      return ball.effect.catchRate
    }
    
    // Default catch rate if the structure is not as expected
    return 0.1
  }

  /**
   * Calculates the base catch chance based on pokemon's HP percentage and level
   * @param pokemon The wild pokemon being caught
   * @returns A number representing the base catch chance percentage (0-100)
   */
  const calculateBaseCatchChance = (pokemon: Pokemon): number => {
    // Calculate HP percentage
    const hpPercentage = (pokemon.currentHP! / pokemon.maxHP!) * 100
    
    // Determine base catch chance based on HP percentage
    if (hpPercentage < 10) {
      return Math.max(25 - pokemon.level!, 10) // Higher chance when HP is very low
    } else if (hpPercentage < 25) {
      return Math.max(15 - pokemon.level!, 5)  // Medium chance when HP is low
    } else {
      return Math.max(5 - pokemon.level!, 1)   // Low chance when HP is high
    }
  }

  /**
   * Attempts to capture a wild Pokémon with the selected Pokéball
   * @param pokemon The wild Pokémon to catch
   * @param ball The Pokéball item to use
   * @returns Promise<{success: boolean, message: string}> Result of the capture attempt
   */
  const attemptCapture = async (pokemon: Pokemon, ball: ItemDefinition): Promise<{success: boolean, message: string}> => {
    if (!pokemon) {
      return { success: false, message: 'No Pokémon to catch' }
    }
    
    isTryingCatch.value = true
    
    // Use the item from inventory
    if (!inventory.useItem(ball.id)) {
      isTryingCatch.value = false
      return { 
        success: false, 
        message: `No ${ball.name}s left!`
      }
    }
    
    // Get the catch rate from the pokeball
    const catchRate = getPokeBallCatchRate(ball)
    
    // Calculate base catch chance
    const baseCatchChance = calculateBaseCatchChance(pokemon)
    
    // Apply the pokeball's catch rate modifier
    const finalCatchChance = baseCatchChance * (1 + catchRate * 10)
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 1000))
    isTryingCatch.value = false
    
    // Check if catch successful
    if (Math.random() * 100 <= finalCatchChance) {
      // Add pokemon to inventory on successful catch
      gameStore.addPokemonToInventory({ ...pokemon })
      return { 
        success: true, 
        message: `Caught ${pokemon.name}!` 
      }
    } else {
      return { 
        success: false, 
        message: `${pokemon.name} broke free!` 
      }
    }
  }

  return {
    attemptCapture,
    isTryingCatch,
    getPokeBallCatchRate,
    calculateBaseCatchChance
  }
}