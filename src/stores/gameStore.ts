import { defineStore } from 'pinia'
import { Pokemon, PokemonType, InventoryItem, ItemEffect } from '@/types/pokemon.js'
import { IdleJob, DEFAULT_IDLE_JOBS } from '@/types/idleJobs.js'
import { itemFactory } from '@/services/itemFactory'
import { useInventoryStore } from './inventoryStore'
import regions from '@/constants/regions.js'

interface BattleState {
  wildPokemon: Pokemon | null;
  spawnTimer: number;
  isPlayerAttacking: boolean;
  isWildPokemonHurt: boolean;
  isEnemyAttacking: boolean;
  isTryingCatch: boolean;
  battleLogs: Array<{ message: string; type: 'damage' | 'heal' | 'system' }>;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

interface GameState {
  playerPokemon: Pokemon[]; // This will now be specifically the active party
  availablePokemon: Pokemon[]; // Pokemon not in party or working
  activePokemonIndex: number;
  pokeballs: number;
  currentRegion: string;
  battle: BattleState;
  notifications: Notification[];
  inventory: {
    pokemon: {
      [key: string]: {
        count: number;
        instances: Pokemon[]; // Store all individual Pokémon instances instead of just a data reference
      }
    }
  };
  unlocked: {
    pokedex: boolean;
    inventory: boolean;
    idleJobs: boolean;
  };
  idleJobs: Record<string, IdleJob>;
  idleWorking: Pokemon[];
}

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
    pokeballs: 10,
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
    notifications: [],
    inventory: {
      pokemon: {}
    },
    unlocked: {
      pokedex: false,
      inventory: false,
      idleJobs: false
    },
    idleJobs: DEFAULT_IDLE_JOBS,
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
      
      // Base reduction from number of assigned Pokemon (keeping this for backward compatibility)
      const baseReduction = job.assignedPokemon.length * 1000;
      
      // Calculate level-based time reduction
      let levelReduction = 0;
      if (job.assignedPokemon.length > 0) {
        // Sum up the level contribution of all Pokémon
        const totalLevelBoost = job.assignedPokemon.reduce((sum, pokemon) => {
          // Each level provides a small reduction in time (0.5% per level)
          return sum + ((pokemon.level || 1) * 0.005);
        }, 0);
        
        // Apply level-based reduction to base time
        levelReduction = job.baseTime * totalLevelBoost;
      }
      
      // Additional percentage-based reduction if the job has the percentual property
      let percentReduction = 0;
      if (job.percentualProgressWithAdditionalPokemon && job.assignedPokemon.length > 1) {
        // Apply the percentage reduction for each additional Pokemon (after the first one)
        const additionalPokemon = job.assignedPokemon.length - 1;
        percentReduction = job.baseTime * (job.percentualProgressWithAdditionalPokemon * additionalPokemon);
      }
      
      // Total reduction is the sum of base, level-based, and percentage reductions
      const totalReduction = baseReduction + levelReduction + percentReduction;
      
      return Math.max(1000, job.baseTime - totalReduction); // Minimum 1 second
    },
    
    getJobSuccessChance: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job) return 0;
      
      // Base chance from the job configuration
      let successChance = job.reward.chance;
      
      // Additional bonus from extra Pokemon (keep existing functionality)
      if (job.percentualProgressWithAdditionalPokemon && job.assignedPokemon.length > 1) {
        const additionalPokemon = job.assignedPokemon.length - 1;
        const bonusChance = job.percentualProgressWithAdditionalPokemon * additionalPokemon;
        successChance += bonusChance;
      }
      
      // Additional bonus from Pokemon levels
      if (job.assignedPokemon.length > 0) {
        // Each level provides a small bonus to success chance (0.2% per level)
        const levelBonus = job.assignedPokemon.reduce((sum, pokemon) => {
          return sum + ((pokemon.level || 1) * 0.002);
        }, 0);
        
        successChance += levelBonus;
      }
      
      // Cap at 100% chance
      return Math.min(1.0, successChance);
    }
  },

  actions: {
    initializeGame() {
      const savedState = localStorage.getItem('gameState')
      if (savedState) {
        const state = JSON.parse(savedState)
        const now = Date.now()
        const lastSaveTime = state.lastSaveTime ?? now

        // Initialize the inventory store
        const inventoryStore = useInventoryStore();
        inventoryStore.initializeInventory();

        // Calculate offline progress for idle jobs
        if (state.idleJobs) {
          Object.entries(state.idleJobs).forEach(([jobId, job]: [string, any]) => {
            if (job.assignedPokemon && job.assignedPokemon.length > 0) {
              const elapsedTime = now - lastSaveTime
              const jobTime = this.getJobRemainingTime(jobId)
              const possibleCompletions = Math.floor(elapsedTime / jobTime)
              
              // If jobs were completed while away, show a summary notification
              if (possibleCompletions > 0) {
                this.addNotification(`While you were away: ${job.name} completed ${possibleCompletions} times!`, 'info');
              }
              
              // Apply completions
              for (let i = 0; i < possibleCompletions; i++) {
                if (Math.random() < job.reward.chance) {
                  job.successfulCompletions++
                  
                  // Handle rewards based on job type
                  if (job.reward.itemDetails) {
                    const { name, description, params } = job.reward.itemDetails;
                    
                    switch (job.reward.type) {
                      case 'pokeball':
                        inventoryStore.addItem(
                          itemFactory.createPokeball(name, description, params.catchRate)
                        );
                        break;
                      case 'potion':
                        inventoryStore.addItem(
                          itemFactory.createPotion(name, description, params.healAmount)
                        );
                        break;
                      case 'berry':
                        inventoryStore.addItem(
                          itemFactory.createBerry(name, description, params.effect)
                        );
                        break;
                      case 'material':
                        inventoryStore.addItem(
                          itemFactory.createMaterial(name, description)
                        );
                        break;
                      default:
                        // Legacy fallback for pokeball only system
                        state.pokeballs = (state.pokeballs ?? 0) + 1
                        break;
                    }
                  } else {
                    // Legacy fallback for pokeball only system
                    state.pokeballs = (state.pokeballs ?? 0) + 1
                  }
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
        // Initialize the inventory store with defaults
        const inventoryStore = useInventoryStore();
        inventoryStore.initializeInventory();
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
        // Add this specific Pokemon instance to the instances array
        this.inventory.pokemon[key].count++;
        this.inventory.pokemon[key].instances.push(pokemon);
      } else {
        // Create a new entry with this Pokemon as the first instance
        this.inventory.pokemon[key] = {
          count: 1,
          instances: [pokemon]
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
      // First try to find a healthy pokemon after the current index
      let nextPokemon = this.playerPokemon.find((pokemon, index) => 
        index > currentIndex && 
        pokemon.currentHP! > 0 && 
        !pokemon.faintedAt
      )

      // If none found after current index, look from beginning up to current index
      nextPokemon ??= this.playerPokemon.find((pokemon, index) => 
          index < currentIndex && 
          pokemon.currentHP! > 0 && 
          !pokemon.faintedAt
        );
      
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

    // New method to handle item effects
    applyItemEffect(item: InventoryItem, targetPokemon?: Pokemon) {
      // If no target specified, use active Pokemon
      const target = targetPokemon || this.activePokemon;
      if (!target) {
        this.addNotification('No active Pokémon to use item on!', 'error');
        return false;
      }
      
      // Handle different effect types
      if (item.effect) {
        switch (item.effect.type) {
          case 'heal':
            // Apply healing effect
            if (target.currentHP === undefined || target.maxHP === undefined) {
              return false;
            }
            
            // Calculate new HP after healing
            const newHP = Math.min(target.maxHP, target.currentHP + item.effect.value);
            this.updatePokemonHP(target, newHP);
            
            // Add healing notification
            const healAmount = newHP - target.currentHP;
            this.addNotification(
              `Used ${item.name} on ${target.name}! Healed ${healAmount} HP.`,
              'success'
            );
            
            // Add to battle log if in battle
            if (this.battle.battleLogs) {
              this.addBattleLog(
                `Used ${item.name} on ${target.name}! Healed ${healAmount} HP.`,
                'heal'
              );
            }
            return true;
            
          case 'catch':
            // Replaced original pokeball logic with this effect-based approach
            if (!this.battle.wildPokemon) {
              this.addNotification('No wild Pokémon to catch!', 'error');
              return false;
            }
            
            // Use the item's catch rate instead of the simple pokeball algorithm
            this.addBattleLog(`Threw a ${item.name} at ${this.battle.wildPokemon.name}!`, 'system');
            
            const hpPercentage = (this.battle.wildPokemon.currentHP! / this.battle.wildPokemon.maxHP!) * 100;
            let catchChance = item.effect.catchRate;
            
            // Modify catch chance based on HP percentage
            if (hpPercentage > 50) {
              catchChance *= 0.5;  // Harder to catch at high HP
            } else if (hpPercentage < 10) {
              catchChance *= 3.0;  // Much easier when almost fainted
            } else if (hpPercentage < 25) {
              catchChance *= 2.0;  // Easier when low HP
            }
            
            if (Math.random() < catchChance) {
              this.addBattleLog(`Caught ${this.battle.wildPokemon.name}!`, 'system');
              // Create a copy of the wild Pokemon and add a unique identifier to it
              const caughtPokemon = { 
                ...this.battle.wildPokemon,
                uniqueId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
              };
              this.addPokemonToInventory(caughtPokemon);
              this.battle.wildPokemon = null;
              this.startSpawnTimer();
            } else {
              this.addBattleLog(`${this.battle.wildPokemon.name} broke free!`, 'system');
            }
            return true;
            
          case 'status':
            // Status effect handling placeholder
            this.addNotification(
              `Used ${item.name} on ${target.name}! Status effect applied.`,
              'success'
            );
            return true;
            
          case 'boost':
            // Stat boost handling placeholder
            if (item.effect.stat === 'attack' && target.attack) {
              target.attack += item.effect.value;
              this.addNotification(
                `Used ${item.name} on ${target.name}! Attack increased by ${item.effect.value}.`,
                'success'
              );
              return true;
            } else if (item.effect.stat === 'defense' && target.defense) {
              target.defense += item.effect.value;
              this.addNotification(
                `Used ${item.name} on ${target.name}! Defense increased by ${item.effect.value}.`,
                'success'
              );
              return true;
            }
            return false;
            
          default:
            this.addNotification(`Item effect type not supported: ${(item.effect as any).type}`, 'error');
            return false;
        }
      }
      
      return false;
    },

    // New method to use items from inventory
    useInventoryItem(item: InventoryItem) {
      const inventoryStore = useInventoryStore();
      
      // First check if item can be used
      if (!item.usable) {
        this.addNotification(`${item.name} cannot be used!`, 'error');
        return false;
      }
      
      // Apply the item effect
      const effectApplied = this.applyItemEffect(item);
      
      if (effectApplied) {
        // Remove the item from inventory if it's consumable
        if (item.consumable) {
          inventoryStore.removeItem(item.id, 1);
        }
        return true;
      }
      
      return false;
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
      if (!this.battle.wildPokemon) return;
      
      // Get pokeballs from inventory
      const inventoryStore = useInventoryStore();
      const pokeballs = inventoryStore.getItemsByType('pokeball');
      
      if (pokeballs.length === 0) {
        // Fall back to legacy pokeball system
        if (!this.usePokeball()) {
          this.addNotification("You don't have any Pokéballs!", 'error');
          return;
        }
        
        this.battle.isTryingCatch = true;
        this.addBattleLog(`Threw a Pokéball at ${this.battle.wildPokemon.name}!`, 'system');
        
        const hpPercentage = (this.battle.wildPokemon.currentHP! / this.battle.wildPokemon.maxHP!) * 100;
        let catchChance = 0;
        
        if (hpPercentage > 50) {
          catchChance = Math.max(5 - this.battle.wildPokemon.level!, 1);
        } else if (hpPercentage < 10) {
          catchChance = Math.max(55 - this.battle.wildPokemon.level!, 10);
        } else if (hpPercentage < 25) {
          catchChance = Math.max(35 - this.battle.wildPokemon.level!, 5);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.battle.isTryingCatch = false;
        
        if (Math.random() * 100 <= catchChance) {
          this.addBattleLog(`Caught ${this.battle.wildPokemon.name}!`, 'system');
          // Create a copy of the wild Pokemon and add a unique identifier to it
          const caughtPokemon = { 
            ...this.battle.wildPokemon,
            uniqueId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
          };
          this.addPokemonToInventory(caughtPokemon);
          this.battle.wildPokemon = null;
          this.startSpawnTimer();
        } else {
          this.addBattleLog(`${this.battle.wildPokemon.name} broke free!`, 'system');
        }
      } else {
        // Use the first pokeball from inventory
        const pokeball = pokeballs[0];
        this.battle.isTryingCatch = true;
        
        // Apply the item effect which handles the catch logic
        const result = this.applyItemEffect(pokeball);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.battle.isTryingCatch = false;
        
        if (result) {
          // Remove the pokeball if successful
          inventoryStore.removeItem(pokeball.id, 1);
        }
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
      const inventoryStore = useInventoryStore();
      
      if (!job) return;
      
      job.completions++;
      
      // Use the enhanced success chance calculation that accounts for additional Pokémon
      const successChance = this.getJobSuccessChance(jobId);
      
      // Check reward chance with the enhanced calculation
      if (Math.random() < successChance) {
        // Handle the reward based on type
        if (job.reward.itemDetails) {
          const { name, description, params } = job.reward.itemDetails;
          
          switch (job.reward.type) {
            case 'pokeball':
              inventoryStore.addItem(
                itemFactory.createPokeball(name, description, params.catchRate)
              );
              break;
            case 'potion':
              inventoryStore.addItem(
                itemFactory.createPotion(name, description, params.healAmount)
              );
              break;
            case 'berry':
              inventoryStore.addItem(
                itemFactory.createBerry(name, description, params.effect)
              );
              break;
            case 'material':
              inventoryStore.addItem(
                itemFactory.createMaterial(name, description)
              );
              break;
            default:
              // Legacy fallback for pokeball only system
              if (job.reward.type === 'pokeball') {
                this.pokeballs++;
              }
              break;
          }
          
          job.successfulCompletions++;
          // Add success notification
          this.addNotification(`${job.name} complete! Received ${name}.`, 'success');
        }
      } else {
        // Add failure notification - job completed but no reward
        this.addNotification(`${job.name} complete, but no reward found.`, 'error');
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

    // Notification methods
    addNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
      const notification: Notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        message,
        type,
        timestamp: Date.now()
      };
      
      this.notifications.push(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, 5000);
      
      return notification;
    },
    
    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
    },
  }
});