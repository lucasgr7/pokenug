import { AutoCatchEffect, ItemEffect } from "@/constants/items.js";

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
  uniqueId?: string; // Added unique ID to distinguish same Pokemon types
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

// Item effect types (duplicated from constants/items.ts for TypeScript type checking)
export type HealEffect = {
  type: 'heal';
  value: number;
}

export type CatchEffect = {
  type: 'catch';
  catchRate: number;
}

export type StatBoostEffect = {
  type: 'boost';
  stat: 'attack' | 'defense' | 'speed';
  value: number;
  duration: number;
}

export type StatusEffect = {
  type: 'status';
  effect: 'cure' | 'prevent';
  status: string;
  duration?: number;
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
  consumable: boolean; // Whether item is consumed on use
  effect?: ItemEffect;
}

export type ItemType = 'pokeball' | 'potion' | 'berries' | 'material' | 'key' | 'special';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Factory interface for creating items
export interface ItemFactory {
  createFromDefinition(itemId: string, quantity?: number): InventoryItem | null;
  createPokeball(name: string, description: string, catchRate: number): InventoryItem;
  createPotion(name: string, description: string, healAmount: number): InventoryItem;
  createBerry(name: string, description: string, effect: string): InventoryItem;
  createMaterial(name: string, description: string): InventoryItem;
  createKeyItem(name: string, description: string): InventoryItem;
}