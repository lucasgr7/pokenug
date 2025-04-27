// filepath: c:\GIT\pokengu\src\src\types\idleJobs.ts
import { Pokemon, PokemonType } from './pokemon.js';

export interface IdleJob {
  id: string;
  type: PokemonType;
  name: string;
  description: string;
  maxSlots: number;
  assignedPokemon: Pokemon[];
  progress: number;
  baseTime: number; // in milliseconds
  reward: {
    type: string;
    chance: number;
    itemDetails?: {
      name: string;
      description: string;
      params: Record<string, any>;
    }
  };
  completions: number;
  successfulCompletions: number;
  icon: string;
  backgroundColor: string; // Background color based on Pokemon type
  percentualProgressWithAdditionalPokemon?: number; // Optional property for additional progress calculation
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
  'pokeball-production': {
    id: 'pokeball-production',
    type: PokemonType.Bug,
    name: 'Produce Crappy Pokeball',
    description: 'Bug Pokemon work together to produce Pokeballs',
    maxSlots: 5,
    assignedPokemon: [],
    progress: 0,
    baseTime: 60000, // 1 minute in milliseconds
    reward: {
      type: 'pokeball',
      chance: 0.3, // 30% chance
      itemDetails: {
        name: 'Crappy Pokeball',
        description: 'A poorly made Pokeball. Has a low catch rate.',
        params: { catchRate: 0.08 }
      }
    },
    completions: 0,
    successfulCompletions: 0,
    icon: '/images/crappyball.png',
    backgroundColor: TYPE_COLORS[PokemonType.Bug],
    percentualProgressWithAdditionalPokemon: 0.10 // 5% progress per additional Pokemon
  },
  'potion-brewing': {
    id: 'potion-brewing',
    type: PokemonType.Grass,
    name: 'Brew Simple Potions',
    description: 'Grass Pokemon work together to brew healing potions',
    maxSlots: 3,
    assignedPokemon: [],
    progress: 0,
    baseTime: 1200000, // 50 seconds in milliseconds
    reward: {
      type: 'potion',
      chance: 0.05, // 25% chance
      itemDetails: {
        name: 'Simple Potion',
        description: 'A basic potion that restores a small amount of HP',
        params: { healAmount: 20 }
      }
    },
    completions: 0,
    successfulCompletions: 0,
    icon: '/public/images/potion.png', // You'll need to add this image
    backgroundColor: TYPE_COLORS[PokemonType.Grass],
    percentualProgressWithAdditionalPokemon: 0.05 // 5% progress per additional Pokemon
  },
  'berry-gathering': {
    id: 'berry-gathering',
    type: PokemonType.Flying,
    name: 'Gather Berries',
    description: 'Normal Pokemon gather berries from nearby areas',
    maxSlots: 4,
    assignedPokemon: [],
    progress: 0,
    baseTime: 120000, // 45 seconds in milliseconds
    reward: {
      type: 'berry',
      chance: 0.25, // 40% chance
      itemDetails: {
        name: 'Pecha Berry',
        description: 'A sweet berry that can heal poison',
        params: { effect: 'Cures poison status' }
      }
    },
    completions: 0,
    successfulCompletions: 0,
    icon: '/public/images/berry.png', // You'll need to add this image
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
    reward: {
      type: 'material',
      chance: 0.35, // 35% chance
      itemDetails: {
        name: 'Evolution Stone Fragment',
        description: 'A small fragment of an evolution stone.',
        params: {}
      }
    },
    completions: 0,
    successfulCompletions: 0,
    icon: '/public/images/stone.png', // You'll need to add this image
    backgroundColor: TYPE_COLORS[PokemonType.Rock],
    percentualProgressWithAdditionalPokemon: 0.05 // 5% progress per additional Pokemon
  }
};