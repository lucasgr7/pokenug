// Game items definitions with standardized properties
import type { ItemType, ItemRarity } from '@/types/pokemon';

// Item effect types
export type HealEffect = {
  type: 'heal';
  value: number; // Amount to heal
}

export type CatchEffect = {
  type: 'catch';
  catchRate: number; // Base catch rate modifier
}

export type StatBoostEffect = {
  type: 'boost';
  stat: 'attack' | 'defense' | 'speed';
  value: number;
  duration: number; // Duration in seconds
}

export type StatusEffect = {
  type: 'status';
  effect: 'cure' | 'prevent';
  status: string;
  duration?: number; // Duration in seconds if prevention
}

export type AutoCatchEffect = {
  type: 'auto-catch';
  duration: number; // Duration in milliseconds (1 hour = 3600000)
  catchRate: number; // Base catch rate modifier
}

export type ItemEffect = HealEffect | CatchEffect | StatBoostEffect | StatusEffect | AutoCatchEffect;

// Item definition structure
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  usable: boolean;
  consumable: boolean; // Whether item is consumed on use
  effect?: ItemEffect;
}

// Items organized by type
const items: Record<string, ItemDefinition> = {
  // Pokeballs
  'crappy-pokeball': {
    id: 'crappy-pokeball',
    name: 'Crappy Pokeball',
    description: 'A poorly made Pokeball. Has a very low catch rate.',
    type: 'pokeball',
    rarity: 'common',
    icon: '/images/crappyball.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'catch',
      catchRate: 0.1  // 10% base catch rate
    }
  },
  'pokeball': {
    id: 'pokeball',
    name: 'Pokeball',
    description: 'A standard Pokeball with average catch rate.',
    type: 'pokeball',
    rarity: 'uncommon',
    icon: '/images/crappy-pokeball.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'catch',
      catchRate: 0.25  // 25% base catch rate
    }
  },
  'great-ball': {
    id: 'great-ball',
    name: 'Great Ball',
    description: 'A high-performance Pokeball with a higher catch rate than a standard Pokeball.',
    type: 'pokeball',
    rarity: 'rare',
    icon: '/images/crappy-pokeball.png',  // Should be updated with proper icon
    usable: true,
    consumable: true,
    effect: {
      type: 'catch',
      catchRate: 0.45  // 45% base catch rate
    }
  },
  'master-ball': {
    id: 'master-ball',
    name: 'Master Ball',
    description: 'The best Pokeball with the highest catch rate. Never fails.',
    type: 'pokeball',
    rarity: 'legendary',
    icon: '/images/crappy-pokeball.png',  // Should be updated with proper icon
    usable: true,
    consumable: true,
    effect: {
      type: 'catch',
      catchRate: 0.99  // 99% base catch rate
    }
  },

  // Potions
  'simple-potion': {
    id: 'simple-potion',
    name: 'Simple Potion',
    description: 'A basic potion that restores 30 HP.',
    type: 'potion',
    rarity: 'common',
    icon: '/images/simple-potion.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'heal',
      value: 30
    }
  },
  'potion': {
    id: 'potion',
    name: 'Potion',
    description: 'A standard potion that restores 50 HP.',
    type: 'potion',
    rarity: 'uncommon',
    icon: '/images/potion.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'heal',
      value: 50
    }
  },

  // Berries
  'lure-berry': {
    id: 'lure-berry',
    name: 'Lure Berry',
    description: 'A special berry that automatically catches Pokémon over time. Takes 1 hour to work.',
    type: 'berries',
    rarity: 'rare',
    icon: '/images/berry.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'auto-catch',
      duration: 3600000, // 1 hour in milliseconds
      catchRate: 0.2 // 20% base catch rate
    }
  },
  'great-lure-berry': {
    id: 'great-lure-berry',
    name: 'Great Lure Berry',
    description: 'An improved berry that automatically catches Pokémon over time. Takes 30 minutes to work.',
    type: 'berries',
    rarity: 'epic',
    icon: '/images/berry.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'auto-catch',
      duration: 1800000, // 30 minutes in milliseconds
      catchRate: 0.35 // 35% base catch rate
    }
  },

  // Materials
  'evolution-stone-fragment': {
    id: 'evolution-stone-fragment',
    name: 'Evolution Stone Fragment',
    description: 'A fragment of an evolution stone. Might be useful for crafting.',
    type: 'material',
    rarity: 'rare',
    icon: '/images/evolution-stone-fragment.png',
    usable: false,
    consumable: false
  },
  'stone': {
    id: 'stone',
    name: 'Stone',
    description: 'A common stone. Could be useful for crafting.',
    type: 'material',
    rarity: 'common',
    icon: '/images/stone.png',
    usable: false,
    consumable: false
  }
};

export default items;