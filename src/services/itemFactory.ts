import type { InventoryItem, ItemFactory, ItemRarity, ItemType } from '@/types/pokemon';
import items, { ItemDefinition } from '@/constants/items';

// Utility to generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class GameItemFactory implements ItemFactory {
  /**
   * Creates an inventory item from the predefined item definitions
   */
  createFromDefinition(itemId: string, quantity: number = 1): InventoryItem | null {
    const definition = items[itemId];
    
    if (!definition) {
      console.warn(`Item definition not found for ID: ${itemId}`);
      return null;
    }
    
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      type: definition.type,
      quantity: quantity,
      icon: definition.icon,
      rarity: definition.rarity,
      usable: definition.usable,
      consumable: definition.consumable,
      effect: definition.effect
    };
  }

  // Legacy methods for backward compatibility
  createPokeball(name: string, description: string, catchRate: number): InventoryItem {
    // Try to find a matching pokeball in definitions
    const matchingPokeball = Object.values(items).find(
      item => item.type === 'pokeball' && 
      (item.name.toLowerCase() === name.toLowerCase() ||
       item.effect?.type === 'catch' && Math.abs((item.effect as any).catchRate - catchRate) < 0.05)
    );
    
    if (matchingPokeball) {
      return this.createFromDefinition(matchingPokeball.id) as InventoryItem;
    }
    
    // Assign rarity based on catch rate
    let rarity: ItemRarity = 'common';
    if (catchRate > 0.5) rarity = 'legendary';
    else if (catchRate > 0.3) rarity = 'epic';
    else if (catchRate > 0.2) rarity = 'rare';
    else if (catchRate > 0.1) rarity = 'uncommon';

    // Create a custom pokeball if no match found
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      type: 'pokeball',
      quantity: 1,
      icon: '/images/crappyball.png',
      rarity,
      usable: true,
      consumable: true,
      effect: {
        type: 'catch',
        catchRate
      }
    };
  }

  createPotion(name: string, description: string, healAmount: number): InventoryItem {
    // Try to find a matching potion in definitions
    const matchingPotion = Object.values(items).find(
      item => item.type === 'potion' && 
      (item.name.toLowerCase() === name.toLowerCase() ||
       item.effect?.type === 'heal' && (item.effect as any).value === healAmount)
    );
    
    if (matchingPotion) {
      return this.createFromDefinition(matchingPotion.id) as InventoryItem;
    }
    
    // Assign rarity based on heal amount
    let rarity: ItemRarity = 'common';
    if (healAmount > 100) rarity = 'legendary';
    else if (healAmount > 75) rarity = 'epic';
    else if (healAmount > 50) rarity = 'rare';
    else if (healAmount > 25) rarity = 'uncommon';

    // Create a custom potion if no match found
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      type: 'potion',
      quantity: 1,
      icon: '/images/potion.png',
      rarity,
      usable: true,
      consumable: true,
      effect: {
        type: 'heal',
        value: healAmount
      }
    };
  }

  createBerry(name: string, description: string, effect: string): InventoryItem {
    // Try to find a matching berry in definitions
    const matchingBerry = Object.values(items).find(
      item => item.type === 'berries' && item.name.toLowerCase() === name.toLowerCase()
    );
    
    if (matchingBerry) {
      return this.createFromDefinition(matchingBerry.id) as InventoryItem;
    }
    
    // Create a custom berry if no match found
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: `${description} Effect: ${effect}`,
      type: 'berries',
      quantity: 1,
      icon: '/images/berry.png',
      rarity: 'uncommon',
      usable: true,
      consumable: true
    };
  }

  createMaterial(name: string, description: string): InventoryItem {
    // Try to find a matching material in definitions
    const matchingMaterial = Object.values(items).find(
      item => item.type === 'material' && item.name.toLowerCase() === name.toLowerCase()
    );
    
    if (matchingMaterial) {
      return this.createFromDefinition(matchingMaterial.id) as InventoryItem;
    }
    
    // Create a custom material if no match found
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      type: 'material',
      quantity: 1,
      icon: '/images/material.png',
      rarity: 'common',
      usable: false,
      consumable: false
    };
  }

  createKeyItem(name: string, description: string): InventoryItem {
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      type: 'key',
      quantity: 1,
      icon: '/images/key.png',
      rarity: 'rare',
      usable: true,
      consumable: false
    };
  }
}

// Create a singleton instance
export const itemFactory = new GameItemFactory();