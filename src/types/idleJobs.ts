import { Pokemon, PokemonType } from './pokemon.js';

// Define the possible reward types
export type RewardType = 'pokeball' | 'potion' | 'berry' | 'material' | 'buff';

// Define a new interface for reward options
export interface RewardOption {
  type: RewardType;
  chance: number;
  weight: number;
  itemDetails?: {
    name: string;
    description: string;
    params: Record<string, any>;
  }
}

// Add a new interface for buff effects
export interface BuffEffect {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string; // Type of buff (e.g., 'attack', 'defense', 'xp')
  value: number; // Current value/level of the buff
  maxValue?: number; // Maximum level (if applicable)
  effect: (value: number) => any; // Function that returns the buff effect based on level
}

export interface IdleJob {
  id: string;
  type: PokemonType;
  name: string;
  description: string;
  maxSlots: number;
  assignedPokemon: Pokemon[];
  progress: number;
  baseTime: number; // in milliseconds
  rewards: RewardOption[]; // Array of possible rewards
  completions: number;
  successfulCompletions: number;
  icon: string;
  backgroundColor: string; // Background color based on Pokemon type
  percentualProgressWithAdditionalPokemon?: number; // Optional property for additional progress calculation
  chance: number; // Optional property for success chance
}

// Type color mapping for job backgrounds
export const TYPE_COLORS = {
  [PokemonType.Normal]: '#A8A878',
  [PokemonType.Fighting]: '#C03028',
  [PokemonType.Flying]: '#A890F0',
  [PokemonType.Poison]: '#A040A0',
  [PokemonType.Ground]: '#E0C068',
  [PokemonType.Rock]: '#B8A038',
  [PokemonType.Bug]: '#A8B820',
  [PokemonType.Ghost]: '#705898',
  [PokemonType.Steel]: '#B8B8D0',
  [PokemonType.Fire]: '#F08030',
  [PokemonType.Water]: '#6890F0',
  [PokemonType.Grass]: '#78C850',
  [PokemonType.Electric]: '#F8D030',
  [PokemonType.Psychic]: '#F85888',
  [PokemonType.Ice]: '#98D8D8',
  [PokemonType.Dragon]: '#7038F8',
  [PokemonType.Dark]: '#705848',
  [PokemonType.Fairy]: '#EE99AC'
};

// Default idle jobs configuration
export const DEFAULT_IDLE_JOBS: Record<string, IdleJob> = {
  'fire-emblem': {
    id: 'fire-emblem',
    type: PokemonType.Fire,
    name: 'Fire Emblem Training',
    description: 'Train your Fire Pokemon to increase attack speed. Consecutive attacks build up fire rate multiplier for XP gain.',
    maxSlots: 4,
    assignedPokemon: [],
    progress: 0,
    baseTime: 1800000, // 30 minutes in milliseconds
    chance: 0.8, // 80% chance of success
    rewards: [
      {
        type: 'buff',
        chance: 0.5,
        weight: 100,
        itemDetails: {
          name: 'Fire Emblem',
          description: 'Increases XP gain with consecutive attacks. Build up fire rate to multiply XP gain up to 3 tiers.',
          params: {
            buffId: 'fire-emblem',
            buffType: 'fire-rate',
            imageUrl: '/images/fire-emblem.png'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/fire-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Fire],
    // 15% progress per additional Pokemon
  },

  'toxic-emblem': {
    id: 'toxic-emblem',
    type: PokemonType.Poison,
    name: 'Toxic Emblem Training',
    description: 'Train your Poison Pokemon to enhance your battle skills. Increases XP gained per attack.',
    maxSlots: 4,
    assignedPokemon: [],
    progress: 0,
    baseTime: 1800000, // 30 minutes in milliseconds
    chance: 0.75, // 100% chance of success - this is a guaranteed buff
    rewards: [
      {
        type: 'buff',
        chance: 0.5,
        weight: 100,
        itemDetails: {
          name: 'Toxic Emblem',
          description: 'Increases XP gained per attack by 1',
          params: {
            buffId: 'toxic-emblem',
            buffType: 'xp-boost',
            imageUrl: '/images/toxic-emblem.png'  // You'll need to add this image
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/toxic-emblem.png', // You'll need to add this image
    backgroundColor: TYPE_COLORS[PokemonType.Poison],
    percentualProgressWithAdditionalPokemon: 0.15 // 15% progress per additional Pokemon
  },

  'pokeball-production': {
    id: 'pokeball-production',
    type: PokemonType.Bug,
    name: 'Produce Crappy Pokeball',
    description: 'Bug Pokemon work together to produce Pokeballs',
    maxSlots: 5,
    assignedPokemon: [],
    progress: 0,
    baseTime: 60000, // 1 minute in milliseconds
    chance: 0.25, // 25% chance of success
    rewards: [
      {
        chance: 0.3, // 30% chance
        weight: 100, // Only option, so 100% weight
        type: 'pokeball',
        itemDetails: {
          name: 'Crappy Pokeball',
          description: 'A poorly made Pokeball. Has a low catch rate.',
          params: { catchRate: 0.08 }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/crappyball.png',
    backgroundColor: TYPE_COLORS[PokemonType.Bug],
    // 5% progress per additional Pokemon
  },
  'potion-brewing': {
    id: 'potion-brewing',
    type: PokemonType.Grass,
    name: 'Brew Simple Potions',
    description: 'Grass Pokemon work together to brew healing potions',
    maxSlots: 3,
    assignedPokemon: [],
    progress: 0,
    baseTime: 300000, // 5 minutes in milliseconds
    chance: 0.25, // 25% chance of success
    rewards: [
      {
        type: 'potion',
        chance: 0.05, // 25% chance
        weight: 100, // Only option, so 100% weight
        itemDetails: {
          name: 'Simple Potion',
          description: 'A basic potion that restores a small amount of HP',
          params: { healAmount: 20 }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/potion.png', // You'll need to add this image
    backgroundColor: TYPE_COLORS[PokemonType.Grass],
    // 5% progress per additional Pokemon
  },
  'berry-gathering': {
    id: 'berry-gathering',
    type: PokemonType.Normal,
    name: 'Gather Berries',
    description: 'Normal Pokemon gather berries from nearby areas',
    maxSlots: 4,
    assignedPokemon: [],
    progress: 0,
    baseTime: 900000, // 15 minutes in milliseconds
    chance: 0.15, // 14% chance of success
    rewards: [
      {
        type: 'berry',
        chance: 0.25, // 40% chance
        weight: 70, // 70% chance of getting this if successful
        itemDetails: {
          name: 'Great Lure Berry',
          description: 'A special berry that attracts Pokémon over time',
          params: { effect: 'Auto-catch' }
        }
      },
      {
        type: 'berry',
        chance: 0.25, // Same base chance
        weight: 30, // 30% chance of getting this if successful
        itemDetails: {
          name: 'Lure Berry',
          description: 'A special berry that attracts Pokémon over time',
          params: { effect: 'Auto-catch' }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/berry.png', // You'll need to add this image
    backgroundColor: TYPE_COLORS[PokemonType.Flying],
    percentualProgressWithAdditionalPokemon: 0.05 // 5% progress per additional Pokemon

  },
  'material-mining': {
    id: 'material-mining',
    type: PokemonType.Rock,
    name: 'Mine for Materials',
    description: 'Rock Pokemon mine for valuable crafting materials',
    maxSlots: 3,
    assignedPokemon: [],
    progress: 0,
    baseTime: 360000, // 70 seconds in milliseconds
    chance: 0.15, // 25% chance of success
    rewards: [
      {
        type: 'material',
        chance: 0.35, // 35% chance
        weight: 80, // 80% weight for regular stone fragments
        itemDetails: {
          name: 'Evolution Stone Fragment',
          description: 'A small fragment of an evolution stone.',
          params: {}
        }
      },
      {
        type: 'material',
        chance: 0.35, // Same base chance
        weight: 20, // 20% weight for rare stone fragments
        itemDetails: {
          name: 'Rare Stone Fragment',
          description: 'A rare evolution stone fragment with special properties.',
          params: { rarity: 'rare' }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/stone.png', // You'll need to add this image
    backgroundColor: TYPE_COLORS[PokemonType.Rock],
    percentualProgressWithAdditionalPokemon: 0.05 // 5% progress per additional Pokemon
  }
};