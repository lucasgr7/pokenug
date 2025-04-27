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

export type ItemEffect = HealEffect | CatchEffect | StatBoostEffect | StatusEffect;

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
      catchRate: 0.1
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
      catchRate: 0.2
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
  'pecha-berry': {
    id: 'pecha-berry',
    name: 'Pecha Berry',
    description: 'A berry that cures poisoned status.',
    type: 'berries',
    rarity: 'uncommon',
    icon: '/images/pecha-berry.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'status',
      effect: 'cure',
      status: 'poison'
    }
  },
  'oran-berry': {
    id: 'oran-berry',
    name: 'Oran Berry',
    description: 'A berry that restores 10 HP.',
    type: 'berries',
    rarity: 'common',
    icon: '/images/berry.png',
    usable: true,
    consumable: true,
    effect: {
      type: 'heal',
      value: 10
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