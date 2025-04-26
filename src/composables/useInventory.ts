import { useInventoryStore } from '../stores/inventoryStore'
import { itemFactory } from '../services/itemFactory'
import type { InventoryItem, ItemType } from '../types/pokemon'

export function useInventory() {
  const inventoryStore = useInventoryStore()

  /**
   * Gets all inventory items
   */
  const getAllItems = () => {
    return inventoryStore.getAllItems
  }

  /**
   * Gets items by a specific type
   */
  const getItemsByType = (type: ItemType) => {
    return inventoryStore.getItemsByType(type)
  }

  /**
   * Counts all items of a specific type
   */
  const countItemsByType = (type: ItemType) => {
    return inventoryStore.getItemsByType(type).reduce((total, item) => total + item.quantity, 0)
  }

  /**
   * Gets a count of all pokeballs
   */
  const getPokeballCount = () => {
    return inventoryStore.getTotalPokeballCount
  }

  /**
   * Adds an item to inventory
   */
  const addItem = (item: InventoryItem) => {
    inventoryStore.addItem(item)
  }

  /**
   * Uses an item if it's usable
   */
  const useItem = (itemId: string): boolean => {
    return inventoryStore.useItem(itemId)
  }

  /**
   * Creates and adds a new pokeball to inventory
   */
  const addPokeball = (name: string, description: string, catchRate: number, quantity: number = 1) => {
    const pokeball = itemFactory.createPokeball(name, description, catchRate)
    pokeball.quantity = quantity
    inventoryStore.addItem(pokeball)
    return pokeball
  }

  /**
   * Creates and adds a new potion to inventory
   */
  const addPotion = (name: string, description: string, healAmount: number, quantity: number = 1) => {
    const potion = itemFactory.createPotion(name, description, healAmount)
    potion.quantity = quantity
    inventoryStore.addItem(potion)
    return potion
  }

  /**
   * Creates and adds a new berry to inventory
   */
  const addBerry = (name: string, description: string, effect: string, quantity: number = 1) => {
    const berry = itemFactory.createBerry(name, description, effect)
    berry.quantity = quantity
    inventoryStore.addItem(berry)
    return berry
  }

  /**
   * Creates and adds a new material to inventory
   */
  const addMaterial = (name: string, description: string, quantity: number = 1) => {
    const material = itemFactory.createMaterial(name, description)
    material.quantity = quantity
    inventoryStore.addItem(material)
    return material
  }

  /**
   * Returns the inventory store directly for advanced usage
   */
  const getInventoryStore = () => {
    return inventoryStore
  }

  return {
    getAllItems,
    getItemsByType,
    countItemsByType,
    getPokeballCount,
    addItem,
    useItem,
    addPokeball,
    addPotion,
    addBerry,
    addMaterial,
    getInventoryStore,
    // Export the factory for direct access
    itemFactory
  }
}