import { defineStore } from 'pinia'
import type { InventoryItem, ItemType } from '@/types/pokemon'
import { itemFactory } from '@/services/itemFactory'

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
      return Object.values(state.items)
        .filter(item => item.type === type)
        .map(item => ({
          ...item,
          icon: item.icon?.replace('-default', '') ? '' : item.icon
        }))
    },
    
    getItemById: (state) => (itemId: string) => {
      return state.items[itemId] || null
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

      // For consumable items, remove one from quantity
      if (this.items[itemId].consumable) {
        return this.removeItem(itemId, 1)
      }
      
      // For non-consumable items, just return true to indicate successful use
      return true
    },

    initializeInventory() {
      const savedState = localStorage.getItem('inventoryState')
      
      if (savedState) {
        const state = JSON.parse(savedState)
        this.$patch({
          items: state.items || {}
        })
      } else {
        // Add default starter items using the new item definitions
        const starterPokeball = itemFactory.createFromDefinition('crappy-pokeball', 25);
        const starterPotion = itemFactory.createFromDefinition('simple-potion', 2);
        const starterLure = itemFactory.createFromDefinition('lure-berry', 5);
        
        if (starterPokeball) {
          this.addItem(starterPokeball);
        } else {
          // Fallback to direct creation if definition doesn't exist
          this.addItem({
            id: 'crappy-pokeball',
            name: 'Crappy Pokeball',
            description: 'A poorly made Pokeball. Has a low catch rate.',
            type: 'pokeball',
            quantity: 5,
            icon: '/images/crappyball.png',
            rarity: 'common',
            usable: true,
            consumable: true,
            effect: {
              type: 'catch',
              catchRate: 0.1
            }
          })
        }
        
        if (starterPotion) {
          this.addItem(starterPotion);
        }
        if(starterLure) {
          this.addItem(starterLure);
        }
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