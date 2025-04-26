// Check if file already contains types, if not create them
export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  level?: number;
  currentHP?: number;
  maxHP?: number;
  attack?: number;
  defense?: number;
  experience?: number;
  experienceToNextLevel?: number;
  faintedAt?: number;
  recoveryEndTime?: number;
  lastAttackTime?: number;
  isRunning?: boolean;
  workId?: string;
}

export enum PokemonType {
  Normal = 'normal',
  Fighting = 'fighting',
  Flying = 'flying',
  Poison = 'poison',
  Ground = 'ground',
  Rock = 'rock',
  Bug = 'bug',
  Ghost = 'ghost',
  Steel = 'steel',
  Fire = 'fire',
  Water = 'water',
  Grass = 'grass',
  Electric = 'electric',
  Psychic = 'psychic',
  Ice = 'ice',
  Dragon = 'dragon',
  Dark = 'dark',
  Fairy = 'fairy'
}

// Inventory type definitions
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  icon: string;
  rarity: ItemRarity;
  usable: boolean;
}

export type ItemType = 'pokeball' | 'potion' | 'berries' | 'material' | 'key' | 'special';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Factory interface for creating items
export interface ItemFactory {
  createPokeball(name: string, description: string, catchRate: number): InventoryItem;
  createPotion(name: string, description: string, healAmount: number): InventoryItem;
  createBerry(name: string, description: string, effect: string): InventoryItem;
  createMaterial(name: string, description: string): InventoryItem;
  createKeyItem(name: string, description: string): InventoryItem;
}