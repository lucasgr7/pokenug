import { defineStore } from 'pinia'
import type { InventoryItem, ItemType } from '../types/pokemon'

interface InventoryState {
  items: Record<string, InventoryItem>;
}

export const useInventoryStore = defineStore('inventory', {
  state: (): InventoryState => ({
    items: {}
  }),

  getters: {
    getAllItems: (state) => Object.values(state.items),
    
    getItemsByType: (state) => (type: ItemType) => {
      return Object.values(state.items).filter(item => item.type === type)
    },
    
    getPokeballs: (state) => {
      return Object.values(state.items).filter(item => item.type === 'pokeball')
    },
    
    getItemQuantity: (state) => (itemId: string) => {
      return state.items[itemId]?.quantity || 0
    },
    
    getTotalPokeballCount: (state) => {
      return Object.values(state.items)
        .filter(item => item.type === 'pokeball')
        .reduce((total, item) => total + item.quantity, 0)
    }
  },

  actions: {
    addItem(item: InventoryItem) {
      if (this.items[item.id]) {
        // Item exists, increase quantity
        this.items[item.id].quantity += item.quantity
      } else {
        // New item
        this.items[item.id] = { ...item }
      }
      this.saveState()
    },

    removeItem(itemId: string, quantity: number = 1) {
      if (!this.items[itemId] || this.items[itemId].quantity < quantity) {
        return false
      }

      this.items[itemId].quantity -= quantity
      
      // Remove item completely if quantity is 0
      if (this.items[itemId].quantity <= 0) {
        delete this.items[itemId]
      }

      this.saveState()
      return true
    },

    useItem(itemId: string) {
      if (!this.items[itemId] || !this.items[itemId].usable) {
        return false
      }

      // Remove one from quantity
      return this.removeItem(itemId, 1)
    },

    initializeInventory() {
      const savedState = localStorage.getItem('inventoryState')
      
      if (savedState) {
        const state = JSON.parse(savedState)
        this.$patch({
          items: state.items || {}
        })
      } else {
        // Add default starter items
        this.addItem({
          id: 'crappy-pokeball',
          name: 'Crappy Pokeball',
          description: 'A poorly made Pokeball. Has a low catch rate.',
          type: 'pokeball',
          quantity: 5,
          icon: '/images/crappyball.png',
          rarity: 'common',
          usable: true
        })
      }
    },

    saveState() {
      const state = {
        items: JSON.parse(JSON.stringify(this.items))
      }
      
      localStorage.setItem('inventoryState', JSON.stringify(state))
    }
  }
})