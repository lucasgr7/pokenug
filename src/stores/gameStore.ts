import { defineStore } from 'pinia'
import type { Pokemon } from '../types/pokemon.js'

interface IdleJob {
  type: string;
  name: string;
  description: string;
  maxSlots: number;
  assignedPokemon: Pokemon[];
  progress: number;
  baseTime: number; // in milliseconds
  reward: {
    type: string;
    chance: number;
  };
  completions: number;
  successfulCompletions: number;
}

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
  playerPokemon: Pokemon[]; // This will now be specifically the active party
  availablePokemon: Pokemon[]; // Pokemon not in party or working
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
  idleJobs: {
    [key: string]: IdleJob;
  };
  idleWorking: Pokemon[];
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
    availablePokemon: [],
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
    },
    idleJobs: {
      'pokeball-production': {
        type: 'bug',
        name: 'Produce Crappy Pokeball',
        description: 'Bug Pokemon work together to produce Pokeballs',
        maxSlots: 5,
        assignedPokemon: [],
        progress: 0,
        baseTime: 60000, // 1 minute in milliseconds
        reward: {
          type: 'pokeball',
          chance: 0.1 // 10% chance
        },
        completions: 0,
        successfulCompletions: 0
      }
    },
    idleWorking: []
  }),

  getters: {
    hasStarterPokemon: (state) => state.playerPokemon.length > 0,
    currentRegionData: (state) => regions[state.currentRegion as keyof typeof regions],
    activePokemon: (state) => state.playerPokemon[state.activePokemonIndex] || null,
    getAllPokemon: (state) => [...state.playerPokemon, ...state.availablePokemon],
    getAvailablePokemonCount: (state) => state.availablePokemon.length,
    getPartyCount: (state) => state.playerPokemon.length,
    getJobTimeReduction: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job) return 0;
      return job.assignedPokemon.length * 1000; // 1 second per Pokemon
    },
    
    getJobRemainingTime: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job) return 0;
      const reduction = state.idleJobs[jobId].assignedPokemon.length * 1000;
      return Math.max(1000, job.baseTime - reduction); // Minimum 1 second
    }
  },

  actions: {
      initializeGame() {
      const savedState = localStorage.getItem('gameState')
      if (savedState) {
        const state = JSON.parse(savedState)
        const now = Date.now()
        const lastSaveTime = state.lastSaveTime ?? now

        // Calculate offline progress for idle jobs
        if (state.idleJobs) {
          Object.entries(state.idleJobs).forEach(([jobId, job]: [string, any]) => {
            if (job.assignedPokemon && job.assignedPokemon.length > 0) {
              const elapsedTime = now - lastSaveTime
              const jobTime = this.getJobRemainingTime(jobId)
              const possibleCompletions = Math.floor(elapsedTime / jobTime)
              
              // Apply completions
              for (let i = 0; i < possibleCompletions; i++) {
                if (Math.random() < job.reward.chance) {
                  job.successfulCompletions++
                  state.pokeballs = (state.pokeballs ?? 0) + 1
                }
                job.completions++
              }
              
              // Calculate remaining progress
              const remainingTime = elapsedTime % jobTime
              job.progress = (remainingTime / jobTime) * 100
            }
          })
        }

        this.$patch({
          playerPokemon: state.playerPokemon ?? [],
          activePokemonIndex: state.activePokemonIndex ?? 0,
          pokeballs: state.pokeballs ?? 50,
          unlocked: state.unlocked ?? { pokedex: false, inventory: false, idleJobs: false },
          idleJobs: state.idleJobs ?? this.$state.idleJobs,
          idleWorking: state.idleWorking ?? [],
          inventory: state.inventory ?? { pokemon: {} }
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

    generatePokemonStats(level: number) {
      const baseHP = 100
      const hpPerLevel = 20
      const baseAttack = Math.floor(baseHP / 10)
      const attackPerLevel = baseAttack * 0.2
      const baseDefense = Math.floor(baseHP * 0.8)
      const defensePerLevel = baseDefense * 0.2

      return {
        maxHP: Math.floor(baseHP + (hpPerLevel * (level - 1))),
        attack: Math.floor(baseAttack + (attackPerLevel * (level - 1))),
        defense: Math.floor(baseDefense + (defensePerLevel * (level - 1)))
      }
    },

    addPokemonToParty(pokemon: Pokemon) {
      if (this.playerPokemon.length >= 6) return false;
      
      // Remove from available if it's there
      const availableIndex = this.availablePokemon.findIndex(p => p === pokemon);
      if (availableIndex !== -1) {
        this.availablePokemon.splice(availableIndex, 1);
      }
      
      this.playerPokemon.push(pokemon);
      this.saveState();
      return true;
    },

    removePokemonFromParty(pokemon: Pokemon) {
      const index = this.playerPokemon.indexOf(pokemon);
      if (index === -1) return false;
      
      // If it's the active pokemon, switch to another one first
      if (index === this.activePokemonIndex) {
        const nextPokemon = this.findNextAvailablePokemon();
        if (!nextPokemon) {
          // Don't remove if it's the last healthy pokemon
          if (!this.hasAnyHealthyPokemon()) return false;
        }
        if (nextPokemon) {
          this.setActivePokemon(nextPokemon);
        }
      }
      
      // Adjust active pokemon index if needed
      if (index <= this.activePokemonIndex && this.activePokemonIndex > 0) {
        this.activePokemonIndex--;
      }
      
      this.playerPokemon.splice(index, 1);
      this.availablePokemon.push(pokemon);
      this.saveState();
      return true;
    },

    addPokemonToInventory(pokemon: Pokemon) {
      // Ensure the Pokemon has all required stats
      pokemon.level ??= 1
      pokemon.experience ??= 0
      pokemon.experienceToNextLevel ??= Math.floor(100 * Math.pow(pokemon.level, 1.5))

      // Generate stats if they don't exist
      if (!pokemon.maxHP || !pokemon.attack || !pokemon.defense) {
        const stats = this.generatePokemonStats(pokemon.level)
        pokemon.maxHP = stats.maxHP
        pokemon.currentHP = stats.maxHP
        pokemon.attack = stats.attack
        pokemon.defense = stats.defense
      }

      const key = pokemon.name;
      if (this.inventory.pokemon[key]) {
        this.inventory.pokemon[key].count++;
      } else {
        this.inventory.pokemon[key] = {
          count: 1,
          data: pokemon
        };
      }

      // Add to party if there's space, otherwise to available
      if (this.playerPokemon.length < 6) {
        this.playerPokemon.push(pokemon);
      } else {
        this.availablePokemon.push(pokemon);
      }
      
      this.saveState()
    },

    levelUpPokemon(pokemon: Pokemon) {
      pokemon.level!++
      
      // Generate new stats for this level
      const newStats = this.generatePokemonStats(pokemon.level!)
      
      // Calculate stat increases
      const hpIncrease = newStats.maxHP - pokemon.maxHP!
      const attackIncrease = newStats.attack - pokemon.attack!
      const defenseIncrease = newStats.defense - pokemon.defense!
      
      // Update stats
      pokemon.maxHP = newStats.maxHP
      pokemon.currentHP = pokemon.maxHP // Heal to full on level up
      pokemon.attack = newStats.attack
      pokemon.defense = newStats.defense
      
      // Reset XP and calculate new requirement
      pokemon.experience = 0
      pokemon.experienceToNextLevel = Math.floor(100 * Math.pow(pokemon.level!, 1.5))

      // Add level up message to battle logs
      this.battle.battleLogs.push({
        message: `${pokemon.name} reached level ${pokemon.level}!`,
        type: 'system'
      })
      
      // Add stat increase messages
      this.battle.battleLogs.push({
        message: `Stats increased! HP +${hpIncrease}, Attack +${attackIncrease}, Defense +${defenseIncrease}`,
        type: 'system'
      })
      
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
        const baseDefense = Math.floor(baseHP * 0.8)
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
        currentRegion: this.currentRegion,
        idleJobs: JSON.parse(JSON.stringify(this.idleJobs)),
        idleWorking: JSON.parse(JSON.stringify(this.idleWorking)),
        inventory: JSON.parse(JSON.stringify(this.inventory)),
        lastSaveTime: Date.now()
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
      
      const baseDefense = Math.floor(baseHP * 0.8)
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
    },

    assignPokemonToJob(pokemon: Pokemon, jobId: string) {
      const job = this.idleJobs[jobId];
      if (!job || job.assignedPokemon.length >= job.maxSlots) return false;
      
      // Check if Pokemon matches job type requirement
      if (job.type && !pokemon.types.includes(job.type)) return false;
      
      // Check if Pokemon is already working in any job
      const isAlreadyWorking = this.idleWorking.some(p => p.name === pokemon.name && p.level === pokemon.level);
      if (isAlreadyWorking) return false;
      
      // Remove from party or available list
      const partyIndex = this.playerPokemon.findIndex(p => p.name === pokemon.name && p.level === pokemon.level);
      const availableIndex = this.availablePokemon.findIndex(p => p.name === pokemon.name && p.level === pokemon.level);
      
      if (partyIndex !== -1) {
        // Don't allow assignment if it's the last healthy pokemon in party
        if (this.playerPokemon.length === 1 && !this.hasAnyHealthyPokemon()) return false;
        
        // Use the actual Pokemon reference from the party collection
        const pokemonToAssign = this.playerPokemon[partyIndex];
        this.playerPokemon.splice(partyIndex, 1);
        
        // Update active Pokemon index if needed
        this.handleActivePokemonChange(partyIndex);
        
        // Create a unique work ID for this Pokemon instance
        const workingPokemon = {
          ...pokemonToAssign,
          workId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        
        job.assignedPokemon.push(workingPokemon);
        this.idleWorking.push(workingPokemon);
      } else if (availableIndex !== -1) {
        // Use the actual Pokemon reference from the available collection
        const pokemonToAssign = this.availablePokemon[availableIndex];
        this.availablePokemon.splice(availableIndex, 1);
        
        // Create a unique ID for this Pokemon instance
        const workingPokemon = {
          ...pokemonToAssign,
          workId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        
        job.assignedPokemon.push(workingPokemon);
        this.idleWorking.push(workingPokemon);
      } else {
        // Pokemon not found in either collection
        return false;
      }
      
      this.saveState();
      return true;
    },

    removePokemonFromJob(pokemon: Pokemon, jobId: string) {
      const job = this.idleJobs[jobId];
      if (!job) return false;
      
      const index = job.assignedPokemon.findIndex(p => p.workId === pokemon.workId);
      if (index === -1) return false;
      
      const removedPokemon = job.assignedPokemon[index];
      job.assignedPokemon.splice(index, 1);
      
      const workingIndex = this.idleWorking.findIndex(p => p.workId === pokemon.workId);
      if (workingIndex !== -1) {
        this.idleWorking.splice(workingIndex, 1);
      }
      
      // Always add the Pokemon back to the available list, not to the party
      const { workId, ...cleanPokemon } = removedPokemon;
      this.availablePokemon.push(cleanPokemon);
      
      this.saveState();
      return true;
    },

    completeJob(jobId: string) {
      const job = this.idleJobs[jobId];
      if (!job) return;
      
      job.completions++;
      
      // Check reward chance
      if (Math.random() < job.reward.chance) {
        if (job.reward.type === 'pokeball') {
          this.pokeballs++;
          job.successfulCompletions++;
        }
      }
      
      job.progress = 0;
      this.saveState();
    },

    updateJobProgress(jobId: string, elapsed: number) {
      const job = this.idleJobs[jobId];
      if (!job || job.assignedPokemon.length === 0) return;
      
      const remainingTime = this.getJobRemainingTime(jobId);
      job.progress += (elapsed / remainingTime) * 100;
      
      if (job.progress >= 100) {
        this.completeJob(jobId);
      }
      
      this.saveState();
    },
    moveToParty(pokemon: Pokemon, targetSlotIndex?: number) {
      if (this.playerPokemon.length >= 6) {
        return false; // Party is full
      }
      const availableIndex = this.availablePokemon.findIndex(p => p === pokemon);
      if (availableIndex === -1) return false;
      
      this.availablePokemon.splice(availableIndex, 1);
      
      if (typeof targetSlotIndex === 'number' && targetSlotIndex >= 0 && targetSlotIndex < 6) {
        this.playerPokemon.splice(targetSlotIndex, 0, pokemon);
      } else {
        this.playerPokemon.push(pokemon);
      }
      return true;
    },

    moveToAvailable(pokemon: Pokemon) {
      if (this.playerPokemon.length <= 1) {
        return false; // Can't remove last party pokemon
      }
      const partyIndex = this.playerPokemon.findIndex(p => p === pokemon);
      if (partyIndex === -1) return false;

      this.handleActivePokemonChange(partyIndex);
      this.playerPokemon.splice(partyIndex, 1);
      this.availablePokemon.push(pokemon);
      return true;
    },

    handleActivePokemonChange(removedIndex: number) {
      if (this.activePokemonIndex === removedIndex) {
        const nextIndex = (removedIndex + 1) % this.playerPokemon.length;
        if (nextIndex !== removedIndex) {
          this.activePokemonIndex = nextIndex;
        }
      } else if (removedIndex < this.activePokemonIndex) {
        this.activePokemonIndex--;
      }
    },

    swapPokemonBetweenPartyAndAvailable(pokemon: Pokemon, toParty: boolean, targetSlotIndex?: number) {
      const success = toParty 
        ? this.moveToParty(pokemon, targetSlotIndex)
        : this.moveToAvailable(pokemon);
      
      if (success) {
        this.saveState();
      }
      return success;
    },
  }
});