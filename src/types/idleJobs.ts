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
  type: string; // Type of buff (e.g., 'attack', 'defense', 'xp', 'stun-resistance')
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
  startTime?: number; // Timestamp when the job was started
  currentDuration?: number; // Fixed duration for this job run (ms)
}

// Type color mapping for job backgrounds
export const TYPE_COLORS = {
  [PokemonType.Normal]: '#A8A878',
  [PokemonType.Fighting]: '#C03028',
  [PokemonType.Flying]: '#deDEDE',
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
  [PokemonType.Dragon]: '#1A237E',
  [PokemonType.Dark]: '#705848',
  [PokemonType.Fairy]: '#EE99AC'
};

// Default idle jobs configuration
export const DEFAULT_IDLE_JOBS: Record<string, IdleJob> = {
  'steel-storage-expansion': {
    id: 'steel-storage-expansion',
    type: PokemonType.Steel,
    name: 'Steel Storage Expansion',
    description: 'Steel Pokémon work tirelessly to expand your inventory storage. Each completion increases your maximum item capacity by 1.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 28800000, // 8 hours in milliseconds (8 * 60 * 60 * 1000)
    chance: 1.0, // 100% chance of success
    rewards: [
      {
        type: 'buff',
        chance: 1.0, // Always grants the reward
        weight: 100,
        itemDetails: {
          name: 'Steel Storage Emblem',
          description: 'Increases your maximum item capacity by 1 for all items.',
          params: {
            buffId: 'steel-storage-emblem',
            buffType: 'item-capacity',
            imageUrl: '/images/steel-emblem.png' // You may need to add this image
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/steel-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Steel],
    percentualProgressWithAdditionalPokemon: 0.15 // 15% progress per additional Pokemon
  },
  'electric-emblem': {
    id: 'electric-emblem',
    type: PokemonType.Electric,
    name: 'Electric Emblem Training',
    description: 'Train your Electric Pokemon to enable auto-attack capability. Higher levels reduce the auto-attack interval.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 21600000, // 6 hours in milliseconds (6 * 60 * 60 * 1000)
    chance: 0.8, // 80% chance of success
    rewards: [
      {
        type: 'buff',
        chance: 0.5,
        weight: 100,
        itemDetails: {
          name: 'Electric Emblem',
          description: 'Enables auto-attack capability. Higher levels reduce the auto-attack interval.',
          params: {
            buffId: 'electric-emblem',
            buffType: 'auto-attack',
            imageUrl: '/images/eletric-emblem.png'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/eletric-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Electric],
    percentualProgressWithAdditionalPokemon: 0.15 // 15% progress per additional Pokemon
  },
  'fire-emblem': {
    id: 'fire-emblem',
    type: PokemonType.Fire,
    name: 'Fire Emblem Training',
    description: 'Train your Fire Pokemon to increase attack speed. Consecutive attacks build up fire rate multiplier for XP gain.',
    maxSlots: 1,
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
    maxSlots: 2,
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

  'water-emblem': {
    id: 'water-emblem',
    type: PokemonType.Water,
    name: 'Water Emblem Training',
    description: 'Train your Water Pokemon to enhance team experience sharing. Each level increases XP sharing across all party members.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 14400000, // 4 hours in milliseconds (4 * 60 * 60 * 1000)
    chance: 1.0, // 100% chance of success
    rewards: [
      {
        type: 'buff',
        chance: 1.0, // 100% chance
        weight: 100,
        itemDetails: {
          name: 'Water Emblem',
          description: 'Shares experience gained in battle across all party members. Each level increases sharing efficiency.',
          params: {
            buffId: 'water-emblem',
            buffType: 'xp-share',
            imageUrl: '/images/water-emblem.png'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/water-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Water],
    percentualProgressWithAdditionalPokemon: 0.15 // 15% progress per additional Pokemon

  },
  'flying-emblem': {
    id: 'flying-emblem',
    type: PokemonType.Flying,
    name: 'Flying Emblem Training',
    description: 'Train your Flying Pokemon to enhance exploration speed. Each completion reduces spawn timers across all regions by 1%.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 25200000, // 7 hours in milliseconds (7 * 60 * 60 * 1000)
    chance: 0.85, // 85% chance of success
    rewards: [
      {
        type: 'buff',
        chance: 1.0, // 100% chance
        weight: 100,
        itemDetails: {
          name: 'Flying Emblem',
          description: 'Reduces spawn timers across all regions. Each level provides increasing time reduction benefits with exponential scaling.',
          params: {
            buffId: 'flying-emblem',
            buffType: 'spawn-timer-reduction',
            imageUrl: '/images/flying-emblem.png'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/flying-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Flying],
    percentualProgressWithAdditionalPokemon: 0.12 // 12% progress per additional Pokemon

  },
  'pokeball-production': {
    id: 'pokeball-production',
    type: PokemonType.Bug,
    name: 'Produce Crappy Pokeball',
    description: 'Bug Pokemon work together to produce Pokeballs',
    maxSlots: 4,
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
    maxSlots: 2,
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
    maxSlots: 2,
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
  'psychic-creation': {
    id: 'psychic-creation',
    type: PokemonType.Psychic,
    name: 'Psychic Slot Expansion',
    description: 'Psychic Pokemon use their mental powers to create Expansion Crystals that can permanently increase idle job capacity.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 14400000, // 4 hours in milliseconds (4 * 60 * 60 * 1000)
    chance: 0.6, // 60% chance of success
    rewards: [
      {
        type: 'material',
        chance: 0.6, // 60% chance
        weight: 100,
        itemDetails: {
          name: 'Expansion Crystal',
          description: 'A mystical crystal that can permanently expand the capacity of any idle job by +1 slot.',
          params: { 
            effect: 'expand-job-slot',
            isConsumable: true,
            rarity: 'epic'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/psychic-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Psychic],
    percentualProgressWithAdditionalPokemon: 0.2 // 20% progress per additional Pokemon
  },
  'material-mining': {
    id: 'material-mining',
    type: PokemonType.Rock,
    name: 'Mine for Materials',
    description: 'Rock Pokemon mine for valuable crafting materials. Each completion increases chance to prevent Pokemon fainting.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 360000, // 6 minutes in milliseconds
    chance: 0.25, // 25% chance of success
    rewards: [
      {
        type: 'buff',
        chance: 0.5,
        weight: 100,
        itemDetails: {
          name: 'Rock Emblem',
          description: 'Prevents Pokemon from fainting, leaving it at 10% HP. Higher levels increase success chance. When potions are available, automatically uses them to prevent fainting.',
          params: {
            buffId: 'rock-emblem',
            buffType: 'stun-resistance',
            imageUrl: '/images/rock-emblem.png'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/rock-emblem.png',
    backgroundColor: TYPE_COLORS[PokemonType.Rock],
    percentualProgressWithAdditionalPokemon: 0.1 // 10% progress per additional Pokemon
  },
  'seeker-stone-mining': {
    id: 'seeker-stone-mining',
    type: PokemonType.Ground,
    name: 'Seeker Stone Mining',
    description: 'Ground Pokemon mine deep underground to find mystical seeker stones that can reveal hidden Pokemon.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 21600000, // 6 hours in milliseconds (6 * 60 * 60 * 1000)
    chance: 0.7, // 70% chance of success
    rewards: [
      {
        type: 'material',
        chance: 0.7, // 70% chance
        weight: 100,
        itemDetails: {
          name: 'Seeker Stone',
          description: 'A mystical stone that reveals hidden Pokemon. Use it to choose the next Pokemon that will appear in your current region.',
          params: { 
            effect: 'choose-next-spawn',
            isConsumable: true,
            rarity: 'rare'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/seeker-stone.png',
    backgroundColor: TYPE_COLORS[PokemonType.Ground],
    percentualProgressWithAdditionalPokemon: 0.15 // 15% progress per additional Pokemon
  },
  'dragon-ascension': {
    id: 'dragon-ascension',
    type: PokemonType.Dragon,
    name: 'Dragon Ascension Ritual',
    description: 'Dragon Pokemon perform an ancient ritual to create mystical Dragon Stones that temporarily unlock the legendary Ethereal Nexus region.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 604800000, // 1 week in milliseconds (7 * 24 * 60 * 60 * 1000)
    chance: 0.4, // 40% chance of success
    rewards: [
      {
        type: 'material',
        chance: 0.4, // 40% chance
        weight: 100,
        itemDetails: {
          name: 'Dragon Stone',
          description: 'A powerful mystical stone infused with draconic energy. Consuming it temporarily unlocks access to the legendary Ethereal Nexus, a realm where the most powerful Pokemon dwell.',
          params: { 
            effect: 'unlock-temporary-region',
            isConsumable: true,
            rarity: 'legendary',
            temporaryRegion: 'ethereal-nexus',
            duration: 600000 // 10 minutes in milliseconds
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/dragon-stone.png',
    backgroundColor: TYPE_COLORS[PokemonType.Dragon],
    percentualProgressWithAdditionalPokemon: 0.25 // 25% progress per additional Pokemon
  },
  'phantom-contracting': {
    id: 'phantom-contracting',
    type: PokemonType.Ghost,
    name: 'Phantom Contracting',
    description: 'Ghost Pokemon channel spectral energies to forge mystical contracts that can calm the fears of wild Pokemon.',
    maxSlots: 1,
    assignedPokemon: [],
    progress: 0,
    baseTime: 36000000, // 10 hours in milliseconds (10 * 60 * 60 * 1000)
    chance: 0.5, // 50% chance of success
    rewards: [
      {
        type: 'material',
        chance: 0.5, // 50% chance
        weight: 100,
        itemDetails: {
          name: 'Phantom Contract',
          description: 'A mystical contract forged from spectral energies. When used, it resets the fear factor in your current region and grants you one guaranteed capture.',
          params: { 
            effect: 'phantom-contract',
            isConsumable: true,
            rarity: 'epic'
          }
        }
      }
    ],
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/phantom-contract.png',
    backgroundColor: TYPE_COLORS[PokemonType.Ghost],
    percentualProgressWithAdditionalPokemon: 0.20 // 20% progress per additional Pokemon
  }
};