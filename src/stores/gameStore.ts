import { defineStore } from 'pinia'
import type { Pokemon } from '../types/pokemon.js'

interface GameState {
  playerPokemon: Pokemon[];
  activePokemon: Pokemon | null;
  pokeballs: number;
  currentRegion: string;
  inventory: {
    pokemon: {
      [key: string]: {
        count: number;
        data: Pokemon;
      }
    }
  };
  unlocked: {
    pokedex: boolean;
    inventory: boolean;
    idleJobs: boolean;
  };
}

// Region definitions
export const regions = {
  'viridian-forest': {
    name: 'Viridian Forest',
    minLevel: 3,
    maxLevel: 7,
    encounterRate: 30,
    pool: [
      { id: 10, name: 'Caterpie' },
      { id: 11, name: 'Metapod' },
      { id: 12, name: 'Butterfree' },
      { id: 13, name: 'Weedle' },
      { id: 14, name: 'Kakuna' },
      { id: 15, name: 'Beedrill' },
      { id: 25, name: 'Pikachu' },
      { id: 16, name: 'Pidgey' }
    ]
  }
} as const;

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    playerPokemon: [],
    activePokemon: null,
    pokeballs: 50,
    currentRegion: 'viridian-forest',
    inventory: {
      pokemon: {}
    },
    unlocked: {
      pokedex: false,
      inventory: false,
      idleJobs: false
    }
  }),

  getters: {
    hasStarterPokemon: (state) => state.playerPokemon.length > 0,
    currentRegionData: (state) => regions[state.currentRegion as keyof typeof regions]
  },

  actions: {
    initializeGame() {
      const savedState = localStorage.getItem('gameState')
      if (savedState) {
        const state = JSON.parse(savedState)
        this.$patch({
          playerPokemon: state.playerPokemon ?? [],
          activePokemon: state.activePokemon ?? null,
          pokeballs: state.pokeballs,
          unlocked: state.unlocked
        })
      } else {
        this.selectRandomStarter()
      }
    },

    setActivePokemon(pokemon: Pokemon) {
      this.activePokemon = pokemon
      this.saveState()
    },

    async selectRandomStarter() {
      const starters = [
        'pikachu',
        'squirtle',
        'charmander',
        'bulbasaur'
      ]
      const randomStarter = starters[Math.floor(Math.random() * starters.length)]
      await this.setStarterPokemon(randomStarter)
    },

    async setStarterPokemon(pokemonName: string) {
      const response = await fetch('/pokemon-data.json')
      const pokemonList = await response.json()
      const starter = pokemonList.find((p: Pokemon) => p.name === pokemonName)
      if (starter) {
        const starterLevel = 5
        const baseHP = 100
        const hpPerLevel = 20
        const baseAttack = Math.floor(baseHP / 10)
        const attackPerLevel = baseAttack * 0.2
        const baseDefense = Math.floor(baseAttack * 0.8)
        const defensePerLevel = baseDefense * 0.2

        const maxHP = Math.floor(baseHP + (hpPerLevel * (starterLevel - 1)))
        const attack = Math.floor(baseAttack + (attackPerLevel * (starterLevel - 1)))
        const defense = Math.floor(baseDefense + (defensePerLevel * (starterLevel - 1)))
        
        const newPokemon = {
          ...starter,
          currentHP: maxHP,
          maxHP,
          experience: 0,
          level: starterLevel,
          attack,
          defense
        }
        
        this.playerPokemon = [newPokemon]
        this.activePokemon = newPokemon
        this.saveState()
      }
    },

    addPokemonToInventory(pokemon: Pokemon) {
      const key = pokemon.name
      if (this.inventory.pokemon[key]) {
        this.inventory.pokemon[key].count++
      } else {
        this.inventory.pokemon[key] = {
          count: 1,
          data: pokemon
        }
      }

      // Add to team if there's space
      if (this.playerPokemon.length < 6) {
        this.playerPokemon.push(pokemon)
      }
      
      this.saveState()
    },

    usePokeball() {
      if (this.pokeballs > 0) {
        this.pokeballs--
        this.saveState()
        return true
      }
      return false
    },

    findNextAvailablePokemon() {
      if (!this.activePokemon) return null
      
      const currentIndex = this.playerPokemon.indexOf(this.activePokemon)
      const nextPokemon = this.playerPokemon.find((pokemon, index) => 
        index > currentIndex && pokemon.currentHP! > 0
      )
      
      return nextPokemon || null
    },

    hasAnyHealthyPokemon() {
      return this.playerPokemon.some(pokemon => pokemon.currentHP! > 0)
    },

    saveState() {
      localStorage.setItem('gameState', JSON.stringify({
        playerPokemon: this.playerPokemon,
        activePokemon: this.activePokemon,
        pokeballs: this.pokeballs,
        unlocked: this.unlocked
      }))
    }
  }
})