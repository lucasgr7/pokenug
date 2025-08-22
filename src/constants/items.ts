// Game items definitions with standardized properties
import type { ItemType, ItemRarity } from '../types/pokemon.js';

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

export type SpecialEffect = {
  type: 'special';
  effect: string;
}

export type ItemEffect = HealEffect | CatchEffect | StatBoostEffect | StatusEffect | AutoCatchEffect | SpecialEffect;

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
      duration: 1200000, // 1 hour in milliseconds
      catchRate: 1.0 // 20% base catch rate
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
  },
  'seeker-stone': {
    id: 'seeker-stone',
    name: 'Seeker Stone',
    description: 'A mystical stone that reveals hidden Pokemon. Use it to choose the next Pokemon that will appear in your current region.',
    type: 'material',
    rarity: 'rare',
    icon: '/images/seeker-stone.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'special',
      effect: 'choose-next-spawn'
    }
  },
  'expansion-crystal': {
    id: 'expansion-crystal',
    name: 'Expansion Crystal',
    description: 'A mystical crystal created by Psychic Pokemon. Can permanently expand any idle job by +1 slot.',
    type: 'material',
    rarity: 'epic',
    icon: '/images/psychic-emblem.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'special',
      effect: 'expand-job-slot'
    }
  },
  'dragon-stone': {
    id: 'dragon-stone',
    name: 'Dragon Stone',
    description: 'A powerful mystical stone infused with draconic energy. Consuming it temporarily unlocks access to the legendary Ethereal Nexus, a realm where the most powerful Pokemon dwell.',
    type: 'material',
    rarity: 'legendary',
    icon: '/images/stone.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'special',
      effect: 'unlock-temporary-region'
    }
  },
  'phantom-contract': {
    id: 'phantom-contract',
    name: 'Phantom Contract',
    description: 'A mysterious contract that allows you to reset the fear factor of a captured Pokemon and guarantees its capture on the next attempt.',
    type: 'material',
    rarity: 'legendary',
    icon: '/images/phantom-contract.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'special',
      effect: 'reset-fear-factor'
    }
  }
};

export default items;