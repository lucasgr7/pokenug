import { defineStore } from 'pinia'
import type { Pokemon } from '../types/pokemon.js'

interface BattleState {
  wildPokemon: Pokemon | null;
  spawnTimer: number;
  isPlayerAttacking: boolean;
  isWildPokemonHurt: boolean;
  isEnemyAttacking: boolean;
  isTryingCatch: boolean;
  battleLogs: Array<{ message: string; type: 'damage' | 'heal' | 'system' }>;

}

interface GameState {
  playerPokemon: Pokemon[];
  activePokemonIndex: number;
  pokeballs: number;
  currentRegion: string;
  battle: BattleState;
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

// Constants
const BASE_HITS_TO_DEFEAT = 10
const LEVEL_SCALING_FACTOR = 1.2
const HP_REGEN_RATE = 2.5 // 2.5% per second
const ENEMY_ATTACK_INTERVAL = 3000
const RUN_CHANCE = 0.15
const RUN_CHECK_INTERVAL = 5000


export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    playerPokemon: [],
    activePokemonIndex: 0,
    pokeballs: 50,
    currentRegion: 'viridian-forest',
    battle: {
      wildPokemon: null,
      spawnTimer: 10,
      isPlayerAttacking: false,
      isWildPokemonHurt: false,
      isEnemyAttacking: false,
      isTryingCatch: false,
      battleLogs: []
    },
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
    currentRegionData: (state) => regions[state.currentRegion as keyof typeof regions],
    activePokemon: (state) => state.playerPokemon[state.activePokemonIndex] || null
  },

  actions: {
    initializeGame() {
      const savedState = localStorage.getItem('gameState')
      if (savedState) {
        const state = JSON.parse(savedState)
        this.$patch({
          playerPokemon: state.playerPokemon ?? [],
          activePokemonIndex: state.activePokemonIndex ?? 0,
          pokeballs: state.pokeballs,
          unlocked: state.unlocked
        })
      } else {
        this.selectRandomStarter()
      }
    },

    setActivePokemon(pokemon: Pokemon) {
      const index = this.playerPokemon.indexOf(pokemon)
      if (index !== -1) {
        this.activePokemonIndex = index
        this.saveState()
      }
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

    levelUpPokemon(pokemon: Pokemon) {
      pokemon.level!++
      
      // Calculate new stats
      const baseHP = 100
      const hpPerLevel = 20
      const baseAttack = Math.floor(baseHP / 10)
      const attackPerLevel = baseAttack * 0.2
      const baseDefense = Math.floor(baseAttack * 0.8)
      const defensePerLevel = baseDefense * 0.2

      // Update stats
      pokemon.maxHP = Math.floor(baseHP + (hpPerLevel * (pokemon.level! - 1)))
      pokemon.currentHP = pokemon.maxHP // Heal to full on level up
      pokemon.attack = Math.floor(baseAttack + (attackPerLevel * (pokemon.level! - 1)))
      pokemon.defense = Math.floor(baseDefense + (defensePerLevel * (pokemon.level! - 1)))
      
      // Reset XP and calculate new requirement
      pokemon.experience = 0
      pokemon.experienceToNextLevel = Math.floor(100 * Math.pow(pokemon.level!, 1.5))
      
      this.saveState()
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
          experienceToNextLevel: Math.floor(100 * Math.pow(starterLevel, 1.5)),
          level: starterLevel,
          attack,
          defense
        }
        
        this.playerPokemon = [newPokemon]
        this.activePokemonIndex = 0
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
        index > currentIndex && 
        pokemon.currentHP! > 0 && 
        !pokemon.faintedAt // Make sure pokemon is not fainted
      )
      
      return nextPokemon || null
    },

    hasAnyHealthyPokemon() {
      return this.playerPokemon.some(pokemon => 
        pokemon.currentHP! > 0 && 
        !pokemon.faintedAt // Make sure pokemon is not fainted
      )
    },

    saveState() {
      const state = {
        playerPokemon: JSON.parse(JSON.stringify(this.playerPokemon)),
        activePokemonIndex: this.activePokemonIndex,
        pokeballs: this.pokeballs,
        unlocked: this.unlocked,
        battle: JSON.parse(JSON.stringify(this.battle)),
        currentRegion: this.currentRegion
      }
      localStorage.setItem('gameState', JSON.stringify(state))
      
      // Update the reactive state
      this.$patch(state)
    },

    updatePokemonHP(pokemon: Pokemon, newHP: number) {
      const index = this.playerPokemon.findIndex(p => p === pokemon)
      if (index !== -1) {
        // Create a new array with the updated pokemon
        const updatedPokemon = { ...pokemon, currentHP: newHP }
        const newPlayerPokemon = [...this.playerPokemon]
        newPlayerPokemon[index] = updatedPokemon

        // Update only the playerPokemon array since activePokemon is now a computed
        this.$patch((state) => {
          state.playerPokemon = newPlayerPokemon
        })
        
        this.saveState()
      }
    },

    regenHP() {
      if (!this.playerPokemon) return
      
      const now = Date.now()
      this.playerPokemon.forEach((pokemon) => {
        // Skip active pokemon - no regen while in battle
        if (pokemon === this.activePokemon) return
        
        // Check if pokemon has finished recovery time
        if (pokemon.recoveryEndTime && now >= pokemon.recoveryEndTime && pokemon.currentHP === 0) {
          // Reset fainted state but keep HP at 0
          pokemon.faintedAt = undefined
          pokemon.recoveryEndTime = undefined
          this.updatePokemonHP(pokemon, 0)
          return
        }

        // Normal HP regeneration for non-fainted pokemon not in battle
        if (pokemon.currentHP !== undefined && pokemon.maxHP && pokemon.currentHP >= 0 && pokemon.currentHP < pokemon.maxHP && !pokemon.faintedAt) {
          const regenAmount = (pokemon.maxHP * HP_REGEN_RATE) / 100
          const newHP = Math.min(pokemon.maxHP, pokemon.currentHP + regenAmount)
          this.updatePokemonHP(pokemon, newHP)
        }
      })
    },

    startHPRegen() {
      // Start the HP regeneration interval
      const regenInterval = setInterval(() => {
        this.regenHP()
      }, 1000)
      
      return regenInterval
    },

    calculateStats(level: number) {
      const baseHP = 100
      const hpPerLevel = 20
      
      const maxHP = Math.floor(baseHP + (hpPerLevel * (level - 1)))
      
      const baseAttack = Math.floor(baseHP / BASE_HITS_TO_DEFEAT)
      const attackPerLevel = baseAttack * 0.2
      const attack = Math.floor(baseAttack + (attackPerLevel * (level - 1)))
      
      const baseDefense = Math.floor(baseAttack * 0.8)
      const defensePerLevel = baseDefense * 0.2
      const defense = Math.floor(baseDefense + (defensePerLevel * (level - 1)))
      
      return { maxHP, attack, defense }
    },

    calculateDamage(attack: number, defense: number, attackerLevel: number, defenderLevel: number) {
      const levelDifference = attackerLevel - defenderLevel
      const levelScaling = Math.pow(LEVEL_SCALING_FACTOR, levelDifference)
      let baseDamage = (attack * levelScaling) * (1 - (defense / (defense + 100)))
      const variation = 0.85 + (Math.random() * 0.3)
      return Math.max(1, Math.floor(baseDamage * variation))
    },

    calculateXPGain(playerLevel: number, enemyLevel: number) {
      return Math.floor(10 * (enemyLevel / playerLevel))
    },

    addBattleLog(message: string, type: 'damage' | 'heal' | 'system') {
      this.battle.battleLogs.push({ message, type })
    },

    async spawnWildPokemon() {
      const region = this.currentRegionData
      const poolPokemon = region.pool[Math.floor(Math.random() * region.pool.length)]
      
      const response = await fetch('/pokemon-data.json')
      const pokemonList = await response.json()
      const pokemon = pokemonList.find((p: Pokemon) => p.id === poolPokemon.id)
      
      if (pokemon) {
        const level = Math.floor(Math.random() * (region.maxLevel - region.minLevel + 1)) + region.minLevel
        const stats = this.calculateStats(level)
        
        this.battle.wildPokemon = {
          ...pokemon,
          level,
          currentHP: stats.maxHP,
          maxHP: stats.maxHP,
          attack: stats.attack,
          defense: stats.defense,
          lastAttackTime: Date.now(),
          isRunning: false
        }

        this.addBattleLog(`A wild ${pokemon.name} (Lvl ${level}) appeared!`, 'system')
      }
      
      this.battle.spawnTimer = 10
    },

    startSpawnTimer() {
      this.battle.spawnTimer = 1
      const interval = setInterval(() => {
        this.battle.spawnTimer--
        if (this.battle.spawnTimer <= 0) {
          clearInterval(interval)
          this.spawnWildPokemon()
        }
      }, 1000)
    },

    async attack() {
      if (!this.battle.wildPokemon || !this.activePokemon) return
      
      this.battle.isPlayerAttacking = true
      await new Promise(resolve => setTimeout(resolve, 200))
      
      this.battle.isPlayerAttacking = false
      this.battle.isWildPokemonHurt = true
      
      const damage = this.calculateDamage(
        this.activePokemon.attack!,
        this.battle.wildPokemon.defense!,
        this.activePokemon.level!,
        this.battle.wildPokemon.level!
      )
      
      this.battle.wildPokemon.currentHP = Math.max(0, this.battle.wildPokemon.currentHP! - damage)
      
      this.addBattleLog(
        `${this.activePokemon.name} attacks ${this.battle.wildPokemon.name} for ${damage} damage!`,
        'damage'
      )
      
      await new Promise(resolve => setTimeout(resolve, 300))
      this.battle.isWildPokemonHurt = false
      
      if (this.battle.wildPokemon.currentHP === 0) {
        const defeatedPokemon = { ...this.battle.wildPokemon }
        this.handleXPGain(this.activePokemon, defeatedPokemon)
        
        this.addBattleLog(`${defeatedPokemon.name} fainted!`, 'system')
        this.battle.wildPokemon = null
        this.startSpawnTimer()
      }
      
      this.saveState()
    },

    handlePokemonFaint() {
      if (!this.activePokemon) return
      
      const now = Date.now()
      this.activePokemon.faintedAt = now
      this.activePokemon.recoveryEndTime = now + (60 * 1000)
      
      const nextPokemon = this.findNextAvailablePokemon()
      
      if (nextPokemon) {
        this.addBattleLog(`Go, ${nextPokemon.name}!`, 'system')
        this.setActivePokemon(nextPokemon)
      } else if (this.battle.wildPokemon) {
        this.addBattleLog(
          `No more Pokemon available! The wild ${this.battle.wildPokemon.name} fled.`,
          'system'
        )
        this.battle.wildPokemon = null
        this.startSpawnTimer()
      }
      
      this.saveState()
    },

    enemyAttack() {
      const wildPokemon = this.battle.wildPokemon
      const activePokemon = this.activePokemon
      
      if (!wildPokemon || !activePokemon || wildPokemon.isRunning) return
      
      const now = Date.now()
      if (!wildPokemon.lastAttackTime || (now - wildPokemon.lastAttackTime) >= ENEMY_ATTACK_INTERVAL) {
        this.battle.isEnemyAttacking = true
        setTimeout(() => {
          this.battle.isEnemyAttacking = false
          const damage = this.calculateDamage(
            wildPokemon.attack ?? 0,
            activePokemon.defense ?? 0,
            wildPokemon.level ?? 1,
            activePokemon.level ?? 1
          )
          
          const updatedHP = Math.max(0, (activePokemon.currentHP ?? 0) - damage)
          this.updatePokemonHP(activePokemon, updatedHP)
          
          if (this.battle.wildPokemon) {
            this.battle.wildPokemon.lastAttackTime = now
            
            this.addBattleLog(
              `${wildPokemon.name} attacks ${activePokemon.name} for ${damage} damage!`,
              'damage'
            )
          }

          if (updatedHP === 0) {
            this.addBattleLog(`${activePokemon.name} fainted!`, 'system')
            this.handlePokemonFaint()
          }
        }, 200)
      }
    },

    tryPokemonRun() {
      if (!this.battle.wildPokemon || this.battle.wildPokemon.isRunning) return
      
      if (Math.random() < RUN_CHANCE) {
        this.battle.wildPokemon.isRunning = true
        this.addBattleLog(`Wild ${this.battle.wildPokemon.name} is trying to run away!`, 'system')
        
        setTimeout(() => {
          if (this.battle.wildPokemon) {
            this.addBattleLog(`Wild ${this.battle.wildPokemon.name} ran away!`, 'system')
            this.battle.wildPokemon = null
            this.startSpawnTimer()
          }
        }, 2000)
      }
    },

    async tryCapture() {
      if (!this.battle.wildPokemon || !this.usePokeball()) return

      this.battle.isTryingCatch = true
      this.addBattleLog(`Threw a Pokéball at ${this.battle.wildPokemon.name}!`, 'system')

      const hpPercentage = (this.battle.wildPokemon.currentHP! / this.battle.wildPokemon.maxHP!) * 100
      let catchChance = 0

      if (hpPercentage > 50) {
        catchChance = Math.max(5 - this.battle.wildPokemon.level!, 1)
      } else if (hpPercentage < 10) {
        catchChance = Math.max(55 - this.battle.wildPokemon.level!, 10)
      } else if (hpPercentage < 25) {
        catchChance = Math.max(35 - this.battle.wildPokemon.level!, 5)
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      this.battle.isTryingCatch = false

      if (Math.random() * 100 <= catchChance) {
        this.addBattleLog(`Caught ${this.battle.wildPokemon.name}!`, 'system')
        this.addPokemonToInventory({ ...this.battle.wildPokemon })
        this.battle.wildPokemon = null
        this.startSpawnTimer()
      } else {
        this.addBattleLog(`${this.battle.wildPokemon.name} broke free!`, 'system')
      }
    },

    handleXPGain(playerPokemon: Pokemon, defeatedPokemon: Pokemon) {
      const xpGain = this.calculateXPGain(playerPokemon.level ?? 1, defeatedPokemon.level ?? 1)
      const currentXP = playerPokemon.experience ?? 0
      const nextLevelXP = playerPokemon.experienceToNextLevel ?? Math.floor(100 * Math.pow(playerPokemon.level ?? 1, 1.5))
      
      playerPokemon.experience = currentXP + xpGain
      this.addBattleLog(`${playerPokemon.name} gained ${xpGain} XP!`, 'system')
      
      if (playerPokemon.experience >= nextLevelXP) {
        this.levelUpPokemon(playerPokemon)
      }

      this.saveState()
    },

    resetBattleState() {
      this.battle = {
        wildPokemon: null,
        spawnTimer: 10,
        isPlayerAttacking: false,
        isWildPokemonHurt: false,
        isEnemyAttacking: false,
        isTryingCatch: false,
        battleLogs: []
      }
    }
  }
});