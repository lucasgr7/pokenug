import type { InventoryItem, ItemFactory, ItemRarity, ItemType } from '../types/pokemon';

// Utility to generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Default icons by type
const defaultIcons = {
  pokeball: '/images/crappyball.png', // Using the existing crappyball image
  potion: '/images/potion-default.png',
  berries: '/images/berry-default.png',
  material: '/images/material-default.png',
  key: '/images/key-default.png',
  special: '/images/special-default.png'
};

export class GameItemFactory implements ItemFactory {
  createPokeball(name: string, description: string, catchRate: number): InventoryItem {
    // Assign rarity based on catch rate
    let rarity: ItemRarity = 'common';
    if (catchRate > 0.5) rarity = 'legendary';
    else if (catchRate > 0.3) rarity = 'epic';
    else if (catchRate > 0.2) rarity = 'rare';
    else if (catchRate > 0.1) rarity = 'uncommon';

    return this.createItem(
      name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      'pokeball',
      1,
      defaultIcons.pokeball,
      rarity,
      true
    );
  }

  createPotion(name: string, description: string, healAmount: number): InventoryItem {
    // Assign rarity based on heal amount
    let rarity: ItemRarity = 'common';
    if (healAmount > 100) rarity = 'legendary';
    else if (healAmount > 75) rarity = 'epic';
    else if (healAmount > 50) rarity = 'rare';
    else if (healAmount > 25) rarity = 'uncommon';

    return this.createItem(
      name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      'potion',
      1,
      defaultIcons.potion,
      rarity,
      true
    );
  }

  createBerry(name: string, description: string, effect: string): InventoryItem {
    return this.createItem(
      name.toLowerCase().replace(/\s+/g, '-'),
      name,
      `${description} Effect: ${effect}`,
      'berries',
      1,
      defaultIcons.berries,
      'uncommon',
      true
    );
  }

  createMaterial(name: string, description: string): InventoryItem {
    return this.createItem(
      name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      'material',
      1,
      defaultIcons.material,
      'common',
      false
    );
  }

  createKeyItem(name: string, description: string): InventoryItem {
    return this.createItem(
      name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      'key',
      1,
      defaultIcons.key,
      'rare',
      true
    );
  }

  // Private helper method to create items with consistent structure
  private createItem(
    id: string,
    name: string,
    description: string,
    type: ItemType,
    quantity: number,
    icon: string,
    rarity: ItemRarity,
    usable: boolean
  ): InventoryItem {
    return {
      id,
      name,
      description,
      type,
      quantity,
      icon,
      rarity,
      usable
    };
  }
}

// Create a singleton instance
export const itemFactory = new GameItemFactory();