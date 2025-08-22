import { Pokemon, PokemonType, InventoryItem } from '@/types/pokemon.js'
import { IdleJob, DEFAULT_IDLE_JOBS } from '@/types/idleJobs.js'
import { itemFactory } from '@/services/itemFactory.js'
import { defineStore } from 'pinia'
import { playerAttack, enemyAttack } from '../services/battleSystem.js'
import { useInventoryStore } from './inventoryStore.js'
import regions from '@/constants/regions.js'
import { useBuffStore } from './buffStore.js'
import { RemovableRef } from '@vueuse/core'
import { useStorage } from '@vueuse/core'
import { generateRandomId } from '@/services/util.js'
import { workerTimer } from '@/services/workerTimer.js'


interface BattleState {
  wildPokemon: Pokemon | null;
  spawnTimer: number;
  isPlayerAttacking: boolean;
  isWildPokemonHurt: boolean;
  isEnemyAttacking: boolean;
  enemyAttackAnimationEndTime?: number; // Track when enemy attack animation should end
  isTryingCatch: boolean;
  currentCaptureAttemptId?: string;
  battleLogs: RemovableRef<Array<{ message: string; type: 'player' | 'damage' | 'heal' | 'system' | 'success' }>>;
  nextSpawnQueue: Array<{ id: number, name: string }>;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
  count?: number;
  groupKey?: string; // Used to group similar notifications
}

interface FearFactorState {
  defeats: Array<{ timestamp: number; region: string }>;
  disabledRegions: Record<string, number>; // region -> disableEndTime
}

interface PhantomContractState {
  guaranteedCaptureAvailable: boolean;
}

interface GameState {
  playerPokemon: Pokemon[]; // This will now be specifically the active party
  availablePokemon: Pokemon[]; // Pokemon not in party or working
  activePokemonIndex: number;
  pokeballs: number;
  currentRegion: string;
  battle: BattleState;
  notifications: RemovableRef<Notification[]>;
  inventory: {
    pokemon: {
      [key: string]: {
        count: number;
        instances: Pokemon[]; // Store all individual Pokémon instances instead of just a data reference
      }
    }
  };
  quickInventoryFilter: RemovableRef<string[]>;
  unlocked: {
    pokedex: boolean
    inventory: boolean;
    idleJobs: boolean;
  };
  idleJobs: Record<string, IdleJob>;
  idleWorking: Pokemon[];
  temporaryRegion: {
    isActive: boolean;
    regionId: string | null;
    endTime: number | null;
    remainingTime: number;
  };
  fearFactor: RemovableRef<FearFactorState>;
  phantomContract: RemovableRef<PhantomContractState>;
  pendingSave: boolean; // Flag to track if state needs to be saved
}

// Constants
const BASE_HITS_TO_DEFEAT = 10
const HP_REGEN_RATE = 2.5 // 2.5% per second
const ENEMY_ATTACK_INTERVAL = 3000
const RUN_CHANCE = 0.05

// Fear Factor Constants - Easy to balance
const FEAR_FACTOR_WINDOW = 30000 // 10 seconds in milliseconds - window to track defeats
const FEAR_FACTOR_THRESHOLD = 10 // Number of defeats to trigger fear (10 defeats)
const FEAR_FACTOR_DISABLE_DURATION = 60000 // 1 minute in milliseconds - how long region stays disabled


export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    playerPokemon: [],
    availablePokemon: [],
    activePokemonIndex: 0,
    pokeballs: 10,
    currentRegion: 'Home',
    battle: {
      wildPokemon: null,
      spawnTimer: 10,
      isPlayerAttacking: false,
      isWildPokemonHurt: false,
      isEnemyAttacking: false,
      enemyAttackAnimationEndTime: undefined,
      isTryingCatch: false,
      currentCaptureAttemptId: undefined,
      battleLogs: useStorage<Array<{ message: string; type: 'damage' | 'heal' | 'system' }>>('battleLogs', []),
      nextSpawnQueue: []
    },
    notifications: useStorage<Notification[]>('notifications', []),
    inventory: {
      pokemon: {}
    },
    unlocked: {
      pokedex: false,
      inventory: false,
      idleJobs: false
    },
    idleJobs: DEFAULT_IDLE_JOBS,
    idleWorking: [],
    temporaryRegion: {
      isActive: false,
      regionId: null,
      endTime: null,
      remainingTime: 0
    },
    fearFactor: useStorage<FearFactorState>('fearFactor', {
      defeats: [],
      disabledRegions: {}
    }),
    phantomContract: useStorage<PhantomContractState>('phantomContract', {
      guaranteedCaptureAvailable: false
    }),
    pendingSave: false,
    quickInventoryFilter: useStorage<string[]>('quickInventoryFilter', [])
  }),



  getters: {
    hasStarterPokemon: (state) => state.playerPokemon.length > 0,
    currentRegionData: (state) => regions[state.currentRegion as keyof typeof regions],
    activePokemon: (state) => state.playerPokemon[state.activePokemonIndex] || null,
    getAllPokemon: (state) => [...state.playerPokemon, ...state.availablePokemon],
    getAvailablePokemonCount: (state) => state.availablePokemon.length,
    getPartyCount: (state) => state.playerPokemon.length,
    hasAnyPokemonOfType: (state) => (type: PokemonType) => {
      // Check in player party
      const inParty = state.playerPokemon.some(pokemon =>
        pokemon.types && pokemon.types.includes(type));

      // Check in available Pokémon
      const inAvailable = state.availablePokemon.some(pokemon =>
        pokemon.types && pokemon.types.includes(type));

      // Check for pokemon in idleJobs
      const inIdleJobs = Object.values(state.idleJobs).some(job =>
        job.assignedPokemon.some(pokemon =>
          pokemon.types && pokemon.types.includes(type)
        )
      );

      return inParty || inAvailable || inIdleJobs;
    },
    getJobEffectiveMaxSlots: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job) return 0;
      
      // Get expansions from localStorage
      const expansions = JSON.parse(localStorage.getItem('jobSlotExpansions') || '{}');
      const expansion = expansions[jobId] || 0;
      
      return job.maxSlots + expansion;
    },

    getJobRemainingTime: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job) return 0;

      // New distributed time reduction system
      let totalReductionPercent = 0;
      
      if (job.assignedPokemon.length > 0) {
        // Each Pokémon contributes up to 20% reduction based on their level
        for (const pokemon of job.assignedPokemon) {
          const pokemonLevel = pokemon.level || 1;
          
          // Calculate individual Pokémon contribution (max 20% per Pokémon)
          // Level 100+ gives full 20% contribution
          const individualContribution = Math.min(0.20, (pokemonLevel / 100) * 0.20);
          totalReductionPercent += individualContribution;
        }
        
        // Cap total reduction at 90% (0.90)
        totalReductionPercent = Math.min(0.90, totalReductionPercent);
      }

      // Additional percentage-based reduction if the job has the percentual property
      let percentReduction = 0;
      if (job.percentualProgressWithAdditionalPokemon && job.assignedPokemon.length > 1) {
        // Apply a small additional percentage reduction for each additional Pokemon (after the first one)
        const additionalPokemon = job.assignedPokemon.length - 1;
        const additionalPercent = Math.min(0.05, job.percentualProgressWithAdditionalPokemon * additionalPokemon);
        totalReductionPercent = Math.min(0.90, totalReductionPercent + additionalPercent);
      }

      // Calculate final time with percentage-based reduction
      const finalTime = job.baseTime * (1 - totalReductionPercent);

      // Minimum time is 10% of original time (never less than 10% of base time)
      const minimumTime = job.baseTime * 0.10;

      return Math.max(minimumTime, finalTime);
    },

    getJobProgressPercent: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job || job.assignedPokemon.length === 0) return 0;

      // If the job doesn't have a startTime, it hasn't been properly initialized
      if (!job.startTime) {
        job.startTime = Date.now();
        return 0;
      }

      const now = Date.now();
      const elapsed = now - job.startTime;
      
      // Use the same distributed time reduction system as getJobRemainingTime
      let totalReductionPercent = 0;
      
      if (job.assignedPokemon.length > 0) {
        // Each Pokémon contributes up to 20% reduction based on their level
        for (const pokemon of job.assignedPokemon) {
          const pokemonLevel = pokemon.level || 1;
          
          // Calculate individual Pokémon contribution (max 20% per Pokémon)
          // Level 100+ gives full 20% contribution
          const individualContribution = Math.min(0.20, (pokemonLevel / 100) * 0.20);
          totalReductionPercent += individualContribution;
        }
        
        // Cap total reduction at 90% (0.90)
        totalReductionPercent = Math.min(0.90, totalReductionPercent);
      }

      // Additional percentage-based reduction if the job has the percentual property
      if (job.percentualProgressWithAdditionalPokemon && job.assignedPokemon.length > 1) {
        // Apply a small additional percentage reduction for each additional Pokemon (after the first one)
        const additionalPokemon = job.assignedPokemon.length - 1;
        const additionalPercent = Math.min(0.05, job.percentualProgressWithAdditionalPokemon * additionalPokemon);
        totalReductionPercent = Math.min(0.90, totalReductionPercent + additionalPercent);
      }

      // Calculate final time with percentage-based reduction
      const finalTime = job.baseTime * (1 - totalReductionPercent);

      // Minimum time is 10% of original time (never less than 10% of base time)
      const minimumTime = job.baseTime * 0.10;
      const jobDuration = Math.max(minimumTime, finalTime);

      // Calculate progress as a percentage
      const progressPercent = Math.min(100, (elapsed / jobDuration) * 100);

      return progressPercent;
    },

    getJobSuccessChance: (state) => (jobId: string) => {
      const job = state.idleJobs[jobId];
      if (!job) return 0;

      // Base chance from the job configuration
      let successChance = job.chance;

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
    },

    // Temporary region getters
    isTemporaryRegionActive: (state) => state.temporaryRegion.isActive,
    temporaryRegionId: (state) => state.temporaryRegion.regionId,
    temporaryRegionRemainingTime: (state) => state.temporaryRegion.remainingTime,
    temporaryRegionEndTime: (state) => state.temporaryRegion.endTime,
    
    // Get available regions including temporary region
    availableRegions: (state) => {
      const baseRegions = Object.keys(regions);
      if (state.temporaryRegion.isActive && state.temporaryRegion.regionId) {
        return [...baseRegions, state.temporaryRegion.regionId];
      }
      return baseRegions;
    },

    // Fear Factor getters
    getFearFactorProgress: (state) => (region: string) => {
      const now = Date.now();
      const recentDefeats = state.fearFactor.defeats.filter(
        defeat => defeat.region === region && (now - defeat.timestamp) <= FEAR_FACTOR_WINDOW
      );
      return Math.min(100, (recentDefeats.length / FEAR_FACTOR_THRESHOLD) * 100);
    },

    isRegionDisabledByFear: (state) => (region: string) => {
      const now = Date.now();
      const disableEndTime = state.fearFactor.disabledRegions[region];
      return disableEndTime ? now < disableEndTime : false;
    },

    getFearFactorTimeRemaining: (state) => (region: string) => {
      const now = Date.now();
      const disableEndTime = state.fearFactor.disabledRegions[region];
      return disableEndTime ? Math.max(0, disableEndTime - now) : 0;
    },

    hasGuaranteedCapture: (state) => state.phantomContract.guaranteedCaptureAvailable
  },

  actions: {
    initializeGame() {
      const savedState = localStorage.getItem('gameState')
      const buffStore = useBuffStore();
      buffStore.initializeBuffStore();
      if (savedState) {
        const state = JSON.parse(savedState)
        const now = Date.now()
        const lastSaveTime = state.lastSaveTime ?? now

        // Then initialize the inventory store
        const inventoryStore = useInventoryStore();
        inventoryStore.initializeInventory();

        // Update idle jobs definitions while preserving progress
        if (state.idleJobs) {
          const updatedJobs: Record<string, IdleJob> = {};

          // Process each job from the current DEFAULT_IDLE_JOBS
          Object.entries(DEFAULT_IDLE_JOBS).forEach(([jobId, defaultJob]) => {
            const savedJob = state.idleJobs[jobId];

            if (savedJob) {
              // Preserve essential player progress
              const preservedFields = {
                assignedPokemon: savedJob.assignedPokemon || [],
                completions: savedJob.completions || 0,
                successfulCompletions: savedJob.successfulCompletions || 0,
                progress: savedJob.progress || 0,
                startTime: savedJob.startTime || now
              };

              // Merge the default job with preserved progress
              updatedJobs[jobId] = {
                ...defaultJob, // Get latest job definition
                ...preservedFields // Preserve player progress
              };
            } else {
              // This is a new job that didn't exist in player's save
              updatedJobs[jobId] = defaultJob;
            }
          });

          // Update the state with merged jobs
          state.idleJobs = updatedJobs;
        }

        // Calculate offline progress for idle jobs
        if (state.idleJobs) {
          Object.entries(state.idleJobs).forEach(([jobId, job]: [string, any]) => {
            if (job.assignedPokemon && job.assignedPokemon.length > 0) {
              const elapsedTime = now - lastSaveTime
              const jobTime = this.getJobRemainingTime(jobId)
              const possibleCompletions = Math.floor(elapsedTime / jobTime)

              if (possibleCompletions > 0) {
                this.addNotification(`While you were away: ${job.name} completed ${possibleCompletions} times!`, 'info', `away-job:${job.name}`);
              }

              // Apply completions
              for (let i = 0; i < possibleCompletions; i++) {
                if (Math.random() < job.chance) {
                  job.successfulCompletions++

                  if (job.rewards && job.rewards.length > 0) {
                    const totalWeight = job.rewards.reduce((sum: number, reward: any) => sum + reward.weight, 0);
                    const randomValue = Math.random() * totalWeight;

                    let cumulativeWeight = 0;
                    let selectedReward = null;

                    for (const reward of job.rewards) {
                      cumulativeWeight += reward.weight;
                      if (randomValue <= cumulativeWeight) {
                        selectedReward = reward;
                        break;
                      }
                    }

                    if (selectedReward?.itemDetails) {
                      const { name, description, params } = selectedReward.itemDetails;

                      switch (selectedReward.type) {
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
                          if (name.toLowerCase().includes('lure') ||
                            description.toLowerCase().includes('lure') ||
                            (params.effect && params.effect.toLowerCase().includes('catch'))) {
                            inventoryStore.addItem(itemFactory.createRandomLureBerry(1));
                          } else {
                            inventoryStore.addItem(
                              itemFactory.createBerry(name, description, params.effect)
                            );
                          }
                          break;
                        case 'material':
                          // Check for specific material types
                          if (name === 'Expansion Crystal') {
                            const expansionCrystal = itemFactory.createFromDefinition('expansion-crystal');
                            if (expansionCrystal) {
                              inventoryStore.addItem(expansionCrystal);
                            }
                          } else if (name === 'Dragon Stone') {
                            const dragonStone = itemFactory.createFromDefinition('dragon-stone');
                            if (dragonStone) {
                              inventoryStore.addItem(dragonStone);
                            }
                          } else if (name === 'Seeker Stone') {
                            const seekerStone = itemFactory.createFromDefinition('seeker-stone');
                            if (seekerStone) {
                              inventoryStore.addItem(seekerStone);
                            }
                          } else {
                            inventoryStore.addItem(
                              itemFactory.createMaterial(name, description)
                            );
                          }
                          break;
                        case 'buff':
                          try {
                            const buffId: string = params.buffId ?? name.toLowerCase().replace(/\s+/g, '-');
                            buffStore.addBuff({
                              id: buffId,
                              name: name,
                              description: description,
                              icon: params.imageUrl ?? '/images/not-found.png',
                              type: params.buffType,
                              value: 1,
                              effect: (val: number) => val
                            });
                          } catch (error) {
                            console.error('Error adding buff:', error);
                            this.addNotification(`Error applying buff reward: ${name}`, 'error');
                          }
                          break;
                        default:
                          state.pokeballs = (state.pokeballs ?? 0) + 1;
                          break;
                      }
                    }
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

        // Initialize buff store for auto-attack functionality
        const buffStore = useBuffStore();
        buffStore.initializeBuffStore();

        this.$patch({
          playerPokemon: state.playerPokemon ?? [],
          availablePokemon: state.availablePokemon ?? [],
          activePokemonIndex: state.activePokemonIndex ?? 0,
          pokeballs: state.pokeballs ?? 50,
          unlocked: state.unlocked ?? { pokedex: false, inventory: false, idleJobs: false },
          idleJobs: state.idleJobs ?? DEFAULT_IDLE_JOBS,
          idleWorking: state.idleWorking ?? [],
          inventory: state.inventory ?? { pokemon: {} }
        })

        // Recycle battle logs to ensure they don't exceed the limit
        this.recycleBattleLogs();

        // Recycle notifications to ensure they don't exceed the limit
        this.recycleNotifications();

        // Set up game systems including auto-attack with the tickSystem
        this.setupGameSystems();
        
        // Set up save on page unload to prevent data loss
        this.setupSaveOnUnload();
      } else {
        // Then initialize the inventory store with defaults
        const inventoryStore = useInventoryStore();
        inventoryStore.initializeInventory();

        this.selectRandomStarter()

        // Recycle battle logs to ensure they don't exceed the limit
        this.recycleBattleLogs();

        // Recycle notifications to ensure they don't exceed the limit
        this.recycleNotifications();

        // Set up the auto-attack processing with the tickSystem
        this.setupGameSystems();
        
        // Set up save on page unload to prevent data loss
        this.setupSaveOnUnload();
      }
    },

    // Set up event listeners to save before page unload
    setupSaveOnUnload() {
      const saveBeforeUnload = () => {
        if (this.pendingSave) {
          // Synchronous save since we're unloading
          try {
            const essentialState = {
              playerPokemon: this.playerPokemon,
              availablePokemon: this.availablePokemon,
              activePokemonIndex: this.activePokemonIndex,
              pokeballs: this.pokeballs,
              unlocked: this.unlocked,
              currentRegion: this.currentRegion,
              idleJobs: this.idleJobs,
              idleWorking: this.idleWorking,
              inventory: this.inventory,
              lastSaveTime: Date.now()
            }
            
            // Use JSON serialization for emergency save to avoid any cloning issues
            localStorage.setItem('gameState', JSON.stringify(essentialState));
          } catch (error) {
            console.error('Emergency save failed:', error);
          }
        }
      };

      window.addEventListener('beforeunload', saveBeforeUnload);
      window.addEventListener('pagehide', saveBeforeUnload);
      
      // Also save on visibility change (when tab becomes hidden)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.pendingSave) {
          console.log('Tab hidden - performing save');
          this.performBatchSave();
        }
      });
    },

    setActivePokemon(pokemon: Pokemon) {
      const index = this.playerPokemon.indexOf(pokemon)
      if (index !== -1) {
        this.activePokemonIndex = index
        this.markStateForSaving()
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
      const baseHP = 100 * Math.random() * 1.5 // Base HP between 100 and 150
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
      this.markStateForSaving();
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
      this.markStateForSaving();
      return true;
    },

    addPokemonToInventory(pokemon: Pokemon) {
      // Ensure the Pokemon has all required stats
      pokemon.level ??= 1
      pokemon.experience ??= 0
      pokemon.experienceToNextLevel ??= Math.floor(100 * Math.pow(pokemon.level, 1.5))
      
      // Ensure the Pokemon has a unique identifier
      if (!pokemon.uniqueId) {
        pokemon.uniqueId = generateRandomId()
      }

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

      this.saveImmediately() // Save immediately when adding Pokemon to inventory
    },

levelUpPokemon(pokemon: Pokemon) {
  pokemon.level!++
  // Use the same stat calculation as wild Pokémon
  const stats = this.calculateStats(pokemon.level!)
  pokemon.maxHP = stats.maxHP
  pokemon.currentHP = stats.maxHP // Heal to full on level up
  pokemon.attack = stats.attack
  pokemon.defense = stats.defense
  // Reset XP and calculate new requirement
  pokemon.experience = 0
  pokemon.experienceToNextLevel = Math.floor(100 * Math.pow(pokemon.level!, 1.5))
  // Add level up message to battle logs
  this.battle.battleLogs.push({
    message: `${pokemon.name} reached level ${pokemon.level}!`,
    type: 'system'
  })
  this.recycleBattleLogs()

  this.saveImmediately() // Save immediately for level ups
},

    async setStarterPokemon(pokemonName: string) {
      const response = await fetch('/pokemon-data.json')
      const pokemonList = await response.json()
      const starter = pokemonList.find((p: Pokemon) => p.name === pokemonName)
      if (starter) {
        const starterLevel = 8
        // Use the existing generatePokemonStats function instead of manually calculating
        const stats = this.generatePokemonStats(starterLevel)

        const newPokemon = {
          ...starter,
          currentHP: stats.maxHP,
          maxHP: stats.maxHP,
          experience: 0,
          experienceToNextLevel: Math.floor(100 * Math.pow(starterLevel, 1.5)),
          level: starterLevel,
          attack: stats.attack,
          defense: stats.defense,
          uniqueId: generateRandomId()
        }

        this.playerPokemon = [newPokemon]
        this.activePokemonIndex = 0
        this.saveImmediately() // Save immediately for starter Pokemon
      }
    },

    usePokeball() {
      if (this.pokeballs > 0) {
        this.pokeballs--
        this.markStateForSaving()
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

    markStateForSaving(immediate = false) {
      // Mark that we need to save - the actual saving will be handled by the worker timer
      if (!this.pendingSave) {
        this.pendingSave = true
      }
      
      // For critical actions, save immediately
      if (immediate) {
        this.performBatchSave();
      }
    },

    // Method for immediate saves on critical actions
    saveImmediately() {
      this.markStateForSaving(true);
    },

    // Efficient batch save method called by worker timer
    performBatchSave() {
      if (!this.pendingSave) return


      // Use requestIdleCallback if available for better performance
      const saveFn = () => {
        try {
          // Note: We exclude battleLogs and notifications as they are handled by useStorage
          const essentialState = {
            playerPokemon: this.playerPokemon,
            availablePokemon: this.availablePokemon,
            activePokemonIndex: this.activePokemonIndex,
            pokeballs: this.pokeballs,
            unlocked: this.unlocked,
            currentRegion: this.currentRegion,
            idleJobs: this.idleJobs,
            idleWorking: this.idleWorking,
            inventory: this.inventory,
            lastSaveTime: Date.now()
            // Note: battle state and pendingSave are intentionally excluded as they're transient
          }

          // Always use JSON cloning for game state to avoid structuredClone compatibility issues
          // JSON cloning is sufficient for our game data and more reliable across browsers
          const stateToSave = JSON.parse(JSON.stringify(essentialState))

          // Save to localStorage (this is still synchronous but unavoidable)
          localStorage.setItem('gameState', JSON.stringify(stateToSave))
          
          this.pendingSave = false
        } catch (error) {
          console.error('Failed to save game state:', error)
          // Retry save on next batch
        }
      }

      // Use requestIdleCallback for better performance, fallback to setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(saveFn, { timeout: 1000 })
      } else {
        setTimeout(saveFn, 0)
      }
    },

    updatePokemonHP(pokemon: Pokemon, newHP: number) {
      const index = this.playerPokemon.findIndex(p => p === pokemon)
      if (index !== -1) {
        // Ensure HP is within valid bounds
        const clampedHP = Math.max(0, Math.min(newHP, pokemon.maxHP || 0))
        
        // Create a new array with the updated pokemon
        const updatedPokemon = { ...pokemon, currentHP: clampedHP }
        const newPlayerPokemon = [...this.playerPokemon]
        newPlayerPokemon[index] = updatedPokemon

        // Update only the playerPokemon array since activePokemon is now a computed
        this.$patch((state) => {
          state.playerPokemon = newPlayerPokemon
        })

        // Mark state for saving to ensure changes persist
        this.markStateForSaving()
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
            const pokemonLevel = this.battle.wildPokemon.level!;
            let catchChance = item.effect.catchRate;

            // Exponential catch rate formula that makes high-level, full-health Pokémon extremely hard to catch
            // Base formula: catchRate * (100 - hpPercentage)^2 / 10000 * levelPenalty
            const hpFactor = Math.pow(100 - hpPercentage, 2) / 10000; // HP penalty (0-1, exponential)
            const levelPenalty = Math.pow(0.95, pokemonLevel - 1); // Level penalty (exponential decay)
            
            // Additional legendary penalty for very high level Pokémon (likely legendaries)
            const legendaryPenalty = pokemonLevel >= 50 ? Math.pow(0.8, pokemonLevel - 49) : 1;
            
            // Calculate final catch chance with all modifiers
            catchChance = catchChance * hpFactor * levelPenalty * legendaryPenalty;
            
            // Ensure minimum chance (0.1%) and maximum chance (based on original item rate)
            catchChance = Math.max(0.001, Math.min(catchChance, item.effect.catchRate));

            if (Math.random() < catchChance) {
              this.addBattleLog(`Caught ${this.battle.wildPokemon.name}!`, 'success');
              // Create a copy of the wild Pokemon and add a unique identifier to it
              const caughtPokemon = {
                ...this.battle.wildPokemon,
                uniqueId: generateRandomId()
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

          case 'auto-catch':
            // Auto-catch berries are handled by the berryService
            // Just return true to indicate the item was used successfully
            this.addNotification(`You used a ${item.name}. It will attract Pokémon over time.`, 'success');
            return true;

          case 'special':
            // Handle special effects
            if (item.effect.effect === 'choose-next-spawn') {
              // This is handled by the UI layer - just return true to allow consumption
              return true;
            } else if (item.effect.effect === 'expand-job-slot') {
              // Expansion crystal logic would go here
              this.addNotification(`Used ${item.name}! Job slot expansion available.`, 'success');
              return true;
            } else if (item.effect.effect === 'reset-fear-factor') {
              // Reset fear factor for current region and enable guaranteed capture
              this.resetFearFactor(this.currentRegion);
              this.phantomContract.guaranteedCaptureAvailable = true;
              this.addNotification(`Used ${item.name}! Fear factor reset and guaranteed capture enabled!`, 'success');
              return true;
            }
            this.addNotification(`Special effect not implemented: ${item.effect.effect}`, 'error');
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
        if (pokemon === this.activePokemon && this.currentRegion !== 'Home') return

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
          const newHP = Math.floor(Math.min(pokemon.maxHP, pokemon.currentHP + regenAmount))
          this.updatePokemonHP(pokemon, newHP)
        }
      })
    },

    calculateStats(level: number) {
      const STAT_GROWTH_EXP = 0.8;      // 1 = linear; <1 = suavizado
      const HP_PER_LEVEL = 20;
      const ATK_DEF_RATIO = 0.8;       // manteve seu 80 %

      const growth = Math.pow(level, STAT_GROWTH_EXP);

      const baseHP = 100 + Math.random() * 50;          // 100-150
      const maxHP = Math.floor(baseHP + HP_PER_LEVEL * growth);

      const baseAtk = Math.floor(baseHP / BASE_HITS_TO_DEFEAT);
      const attack = Math.floor(baseAtk * (1 + 0.2 * growth));

      const baseDef = Math.floor(baseHP * ATK_DEF_RATIO);
      const defense = Math.floor(baseDef * (1 + 0.2 * growth));

      return { maxHP, attack, defense };
    },
    levelExponent(avgLevel: number,
      midLevel = 30,
      minExponent = 0.25): number {

      // Logística suave:  1  ➞ 0,5 em ~midLevel ➞ minExponent assimptótico
      const raw = 1 / (1 + Math.exp((avgLevel - midLevel) / 6));

      // Garante piso (nunca zera completamente)
      return Math.max(minExponent, raw);
    },
    calculateDamage(
      attack: number,
      defense: number,
      attackerLevel: number,
      defenderLevel: number,
      isEnemy: boolean = false
    ): number {

      // se for inimigo adicionar um fator de 300%
      attack *= isEnemy ? 2.5 : 1.5; // Aumenta o ataque do inimigo
      const BASE_SCALING = 1.28;   // era o LEVEL_SCALING_FACTOR

      const levelDiff = attackerLevel - defenderLevel;
      const avgLevel = (attackerLevel + defenderLevel) / 2;

      // Expoente móvel
      const exp = this.levelExponent(avgLevel);
      const levelFactor = Math.pow(BASE_SCALING, levelDiff * exp);

      // Resto igual
      const baseDamage = (attack * levelFactor) *
        (1 - (defense / (defense + 100)));

      // Variação RNG (mantive seu 0,85-1,15 mas sem “levelDifficulty” que escalava o RNG)
      const variation = 0.85 + Math.random() * 0.30;

      return Math.floor(Math.max(1, Math.floor(baseDamage * variation)));
    },

    calculateXPGain(playerLevel: number, enemyLevel: number) {
      return Math.floor(10 * (enemyLevel / playerLevel)) * 35
    },

    addBattleLog(message: string, type: 'player' | 'damage' | 'heal' | 'system' | 'success') {
      this.battle.battleLogs.push({ message, type })
      this.recycleBattleLogs()
    },

    recycleBattleLogs() {
      const MAX_BATTLE_LOGS = 50
      if (this.battle.battleLogs.length > MAX_BATTLE_LOGS) {
        // Keep only the latest MAX_BATTLE_LOGS messages
        this.battle.battleLogs.splice(0, this.battle.battleLogs.length - MAX_BATTLE_LOGS)
      }
    },

    recycleNotifications() {
      const MAX_NOTIFICATIONS = 50
      if (this.notifications.length > MAX_NOTIFICATIONS) {
        // Keep only the latest MAX_NOTIFICATIONS messages
        this.notifications.splice(0, this.notifications.length - MAX_NOTIFICATIONS)
      }
    },

    async spawnWildPokemon() {
      // Don't spawn Pokémon in the Home region
      if (this.currentRegion === 'Home') {
        return;
      }

      // Don't spawn Pokémon if the region is disabled by fear factor
      if (this.isRegionDisabledByFear(this.currentRegion)) {
        return;
      }

      let selectedPokemon: { id: number, name: string };

      // Check if there's a queued Pokemon to spawn first
      if (this.battle.nextSpawnQueue.length > 0) {
        selectedPokemon = this.battle.nextSpawnQueue.shift()!;
        this.addBattleLog(`A ${selectedPokemon.name} appears from the seeker stone's power!`, 'system');
      } else {
        // Normal probability-based selection
        const region = this.currentRegionData;
        const weightedPool: Array<{ id: number, name: string }> = [];

        region.pool.forEach((pokemon: { probability: number; id: any; name: any }) => {
          // Add Pokémon to the pool multiple times based on its probability
          const count = pokemon.probability || 1;
          for (let i = 0; i < count; i++) {
            weightedPool.push({ id: pokemon.id, name: pokemon.name });
          }
        });

        // Select a random Pokémon from the weighted pool
        selectedPokemon = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      }

      try {
        const response = await fetch('/pokemon-data.json');
        const pokemonList = await response.json();
        const pokemon = pokemonList.find((p: Pokemon) => p.id === selectedPokemon.id);

        if (pokemon) {
          await this.createWildPokemon(pokemon, this.currentRegionData);
        }
      } catch (error) {
        console.error('Failed to spawn wild Pokemon:', error);
      }
    },

    async createWildPokemon(pokemon: Pokemon, region: any) {
      const level = Math.floor(Math.random() * (region.maxLevel - region.minLevel + 1)) + region.minLevel;
      const stats = this.calculateStats(level);

      // Shiny determination configuration
      const SHINY_CONFIG = {
        // 100% for testing purposes (normally would be 1/4096 = 0.000244)
        testingChance: 1.0,
        normalChance: 1 / 1000,
        useTestingChance: false // Set to false for normal gameplay
      };
      
      const shinyChance = SHINY_CONFIG.useTestingChance ? 
        SHINY_CONFIG.testingChance : 
        SHINY_CONFIG.normalChance;
      
      const isShiny = Math.random() < shinyChance;

      // Use pre-loaded sprite URLs and cache them
      let displaySprite = pokemon.sprite;
      if (isShiny && pokemon.shinySprite) {
        displaySprite = pokemon.shinySprite;
      }

      // Cache the sprite using imageCache
      const cachedSprite = await this.cacheSprite(displaySprite);

      this.battle.wildPokemon = {
        ...pokemon,
        level,
        currentHP: stats.maxHP,
        maxHP: stats.maxHP,
        attack: stats.attack,
        defense: stats.defense,
        lastAttackTime: Date.now(),
        isRunning: false,
        uniqueId: generateRandomId(),
        isShiny,
        sprite: cachedSprite,
        shinySprite: isShiny ? cachedSprite : undefined
      };

      // Enhanced battle log message for shiny Pokémon
      const shinyText = isShiny ? ' ✨SHINY✨' : '';
      this.addBattleLog(`A wild${shinyText} ${pokemon.name} (Lvl ${level}) appeared!`, 'system');
      
      // Add special notification for shiny Pokémon
      if (isShiny) {
        this.addNotification(`✨ A shiny ${pokemon.name} appeared! ✨`, 'success');
      }
    },

    async cacheSprite(spriteUrl: string): Promise<string> {
      try {
        // Import imageCache
        const { imageCache } = await import('../services/imageCache.js');
        return await imageCache.getImage(spriteUrl);
      } catch (error) {
        console.warn(`Failed to cache sprite: ${spriteUrl}`, error);
        return spriteUrl; // Fallback to original URL
      }
    },

    // Start spawn timer with region and defeat count consideration
    startSpawnTimer() {
      // Don't spawn Pokémon in the Home region
      if (this.currentRegion === 'Home') {
        this.battle.spawnTimer = 0;
        return;
      }

      // Don't start spawn timer if the region is disabled by fear factor
      if (this.isRegionDisabledByFear(this.currentRegion)) {
        this.battle.spawnTimer = 0;
        return;
      }

      const buffStore = useBuffStore();

      // Check if we need to delay spawn based on defeat count
      const shouldDelay = buffStore.shouldDelaySpawn;

      // Use the region-specific spawnTimer or default
      let regionTimer: number = this.currentRegionData.spawnTimer || 10;

      // Apply Flying Emblem spawn timer reduction
      const spawnReduction = buffStore.getSpawnTimerReduction;
      if (spawnReduction > 0) {
        regionTimer = regionTimer * (1 - spawnReduction);
        // Ensure minimum spawn timer of 0.5 seconds
        regionTimer = Math.max(regionTimer, 0.5);
      }

      this.battle.spawnTimer = shouldDelay ? 10 : regionTimer;

      // If a delay was applied, reset the counter to the next 10
      if (shouldDelay) {
        buffStore.resetDefeatCounter();
        this.addBattleLog(`The area seems quiet after defeating many Pokémon...`, 'system');
      }

      const interval = setInterval(() => {
        this.battle.spawnTimer--;
        if (this.battle.spawnTimer <= 0) {
          clearInterval(interval);
          this.spawnWildPokemon();
        }
      }, 1000);
    },

    async attack() {
      return await playerAttack({
        battle: this.battle,
        playerPokemon: this.playerPokemon,
        activePokemon: this.activePokemon,
        currentRegion: this.currentRegion,
        player: this,
        phantomContract: this.phantomContract,
        addBattleLog: this.addBattleLog,
        addNotification: this.addNotification,
        updatePokemonHP: this.updatePokemonHP,
        useInventoryItem: this.useInventoryItem,
        removeItem: (id: string, qty: number) => useInventoryStore().removeItem(id, qty),
        handlePokemonFaint: this.handlePokemonFaint,
        handleXPGain: this.handleXPGain,
        addDefeatToFearFactor: this.addDefeatToFearFactor,
        startSpawnTimer: this.startSpawnTimer,
        markStateForSaving: this.markStateForSaving,
        levelUpPokemon: this.levelUpPokemon,
        addPokemonToInventory: this.addPokemonToInventory,
        calculateDamage: this.calculateDamage,
        getBuffStore: () => useBuffStore(),
        getInventoryStore: () => useInventoryStore(),
      })
    },

    handlePokemonFaint() {
      if (!this.activePokemon) return

      const now = Date.now()
      
      // Ensure the current HP is properly set to 0
      this.updatePokemonHP(this.activePokemon, 0)
      
      this.activePokemon.faintedAt = now
      this.activePokemon.recoveryEndTime = now + (60 * 1000)

      const nextPokemon = this.findNextAvailablePokemon()

      if (nextPokemon) {
        this.addBattleLog(`Go, ${nextPokemon.name}!`, 'player')
        this.setActivePokemon(nextPokemon)
      }
      // If no nextPokemon, handled below
    },
    enemyAttack() {
      return enemyAttack({
        battle: this.battle,
        playerPokemon: this.playerPokemon,
        activePokemon: this.activePokemon,
        currentRegion: this.currentRegion,
        player: this,
        phantomContract: this.phantomContract,
        addBattleLog: this.addBattleLog,
        addNotification: this.addNotification,
        updatePokemonHP: this.updatePokemonHP,
        useInventoryItem: this.useInventoryItem,
        removeItem: (id: string, qty: number) => useInventoryStore().removeItem(id, qty),
        handlePokemonFaint: this.handlePokemonFaint,
        handleXPGain: this.handleXPGain,
        addDefeatToFearFactor: this.addDefeatToFearFactor,
        startSpawnTimer: this.startSpawnTimer,
        markStateForSaving: this.markStateForSaving,
        levelUpPokemon: this.levelUpPokemon,
        addPokemonToInventory: this.addPokemonToInventory,
        calculateDamage: this.calculateDamage,
        getBuffStore: () => useBuffStore(),
        getInventoryStore: () => useInventoryStore(),
      })
    },

    tryPokemonRun() {
      if (!this.battle.wildPokemon || this.battle.wildPokemon.isRunning) return

      // Prevent Pokemon from running away if phantom contract guaranteed capture is active
      if (this.phantomContract.guaranteedCaptureAvailable) {
        return;
      }

      if (Math.random() < RUN_CHANCE && this.battle.wildPokemon.currentHP! < this.battle.wildPokemon.maxHP! / 2) {
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

      // Prevent concurrent capture attempts with debounce
      if (this.battle.isTryingCatch) return;

      // Set the flag immediately to prevent race conditions
      this.battle.isTryingCatch = true;

      // Additional debounce: create a unique capture attempt ID
      const captureAttemptId = generateRandomId();
      this.battle.currentCaptureAttemptId = captureAttemptId;

      // Helper function to clean up capture state
      const cleanupCapture = () => {
        // Only reset if this is still the current attempt
        if (this.battle.currentCaptureAttemptId === captureAttemptId) {
          this.battle.isTryingCatch = false;
          this.battle.currentCaptureAttemptId = undefined;
        }
      };

      // Helper function to check if this attempt is still valid
      const isValidAttempt = () => {
        return this.battle.currentCaptureAttemptId === captureAttemptId && this.battle.wildPokemon;
      };

      // Get pokeballs from inventory
      const inventoryStore = useInventoryStore();
      const pokeballs = inventoryStore.getItemsByType('pokeball');

      if (pokeballs.length === 0) {
        // Fall back to legacy pokeball system
        if (!this.usePokeball()) {
          this.addNotification("You don't have any Pokéballs!", 'error');
          cleanupCapture();
          return;
        }
        
        // Check if attempt is still valid before proceeding
        if (!isValidAttempt()) {
          cleanupCapture();
          return;
        }
        
        this.addBattleLog(`Threw a Pokéball at ${this.battle.wildPokemon!.name}!`, 'system');

        const hpPercentage = (this.battle.wildPokemon.currentHP! / this.battle.wildPokemon.maxHP!) * 100;
        const pokemonLevel = this.battle.wildPokemon.level!;
        
        // Exponential catch rate formula for pokeballs - much lower base rate than special items
        const baseCatchRate = 0.15; // 15% base catch rate for pokeballs
        
        // Exponential catch rate formula that makes high-level, full-health Pokémon extremely hard to catch
        const hpFactor = Math.pow(100 - hpPercentage, 2) / 10000; // HP penalty (0-1, exponential)
        const levelPenalty = Math.pow(0.9, pokemonLevel - 1); // Level penalty (stronger than items)
        
        // Additional legendary penalty for very high level Pokémon (likely legendaries)
        const legendaryPenalty = pokemonLevel >= 50 ? Math.pow(0.7, pokemonLevel - 49) : 1;
        
        // Calculate final catch chance with all modifiers
        let catchChance = baseCatchRate * hpFactor * levelPenalty * legendaryPenalty;
        
        // Ensure minimum chance (0.05%) and maximum chance (15%)
        catchChance = Math.max(0.0005, Math.min(catchChance, baseCatchRate));
        
        // Convert to percentage for the random check
        catchChance *= 100;

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if attempt is still valid after delay
        if (!isValidAttempt()) {
          cleanupCapture();
          return;
        }

        if (Math.random() * 100 <= catchChance) {
          this.addBattleLog(`Caught ${this.battle.wildPokemon!.name}!`, 'success');
          // Create a copy of the wild Pokemon and add a unique identifier to it
          const caughtPokemon = {
            ...this.battle.wildPokemon!,
            uniqueId: generateRandomId()
          };
          this.addPokemonToInventory(caughtPokemon);
          this.battle.wildPokemon = null;
          this.startSpawnTimer();
        } else {
          this.addBattleLog(`${this.battle.wildPokemon!.name} broke free!`, 'system');
        }
        
        cleanupCapture();
      } else {
        // Use the first pokeball from inventory
        const pokeball = pokeballs[0];

        // Check if attempt is still valid before applying item effect
        if (!isValidAttempt()) {
          cleanupCapture();
          return;
        }

        // Apply the item effect which handles the catch logic
        const result = this.applyItemEffect(pokeball);

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if attempt is still valid after delay
        if (!isValidAttempt()) {
          cleanupCapture();
          return;
        }

        if (result) {
          // Remove the pokeball if successful
          inventoryStore.removeItem(pokeball.id, 1);
        }
        
        cleanupCapture();
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

      this.markStateForSaving()
    },

    resetBattleState() {
      this.battle = {
        wildPokemon: null,
        spawnTimer: 10,
        isPlayerAttacking: false,
        isWildPokemonHurt: false,
        isEnemyAttacking: false,
        enemyAttackAnimationEndTime: undefined,
        isTryingCatch: false,
        currentCaptureAttemptId: undefined,
        battleLogs: this.battle.battleLogs,
        nextSpawnQueue: this.battle.nextSpawnQueue || []
      }
    },

    assignPokemonToJob(pokemon: Pokemon, jobId: string) {
      const job = this.idleJobs[jobId];
      if (!job || job.assignedPokemon.length >= this.getJobEffectiveMaxSlots(jobId)) return false;

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
          workId: generateRandomId()
        };

        job.assignedPokemon.push(workingPokemon);
        this.idleWorking.push(workingPokemon);

        // Initialize job startTime if this is the first Pokemon assigned
        if (job.assignedPokemon.length === 1) {
          job.startTime = Date.now();
        }
      } else if (availableIndex !== -1) {
        // Use the actual Pokemon reference from the available collection
        const pokemonToAssign = this.availablePokemon[availableIndex];
        this.availablePokemon.splice(availableIndex, 1);

        // Create a unique ID for this Pokemon instance
        const workingPokemon = {
          ...pokemonToAssign,
          workId: generateRandomId()
        };

        job.assignedPokemon.push(workingPokemon);
        this.idleWorking.push(workingPokemon);

        // Initialize job startTime if this is the first Pokemon assigned
        if (job.assignedPokemon.length === 1) {
          job.startTime = Date.now();
        }
      } else {
        // Pokemon not found in either collection
        return false;
      }

      this.markStateForSaving();
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

      this.markStateForSaving();
      return true;
    },

    completeJob(jobId: string) {
      const job = this.idleJobs[jobId];
      const inventoryStore = useInventoryStore();
      const buffStore = useBuffStore(); // Get fresh instance of buffStore

      if (!job) return;

      job.completions++;

      // Special handling for material-mining job - increase stun resistance
      if (jobId === 'material-mining') {
        buffStore.increaseStunResistance();
      }

      // Use the enhanced success chance calculation that accounts for additional Pokémon
      const successChance = this.getJobSuccessChance(jobId);

      // Check reward chance with the enhanced calculation
      if (Math.random() < successChance) {
        // Handle the reward based on type
        if (job.rewards && job.rewards.length > 0) {
          // Filter rewards by their weight/probability
          const totalWeight = job.rewards.reduce((sum, reward) => sum + reward.weight, 0);
          const randomValue = Math.random() * totalWeight;

          let cumulativeWeight = 0;
          let selectedReward = null;

          for (const reward of job.rewards) {
            cumulativeWeight += reward.weight;
            if (randomValue <= cumulativeWeight) {
              selectedReward = reward;
              break;
            }
          }

          if (!selectedReward?.itemDetails) return;

          const { name, description, params } = selectedReward.itemDetails;

          try {
            switch (selectedReward.type) {
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
                if (name.toLowerCase().includes('lure') ||
                  description.toLowerCase().includes('lure') ||
                  (params.effect && params.effect.toLowerCase().includes('catch'))) {
                  inventoryStore.addItem(itemFactory.createRandomLureBerry(1));
                } else {
                  inventoryStore.addItem(
                    itemFactory.createBerry(name, description, params.effect)
                  );
                }
                break;
              case 'material':
                // Check for specific material types
                if (name === 'Expansion Crystal') {
                  const expansionCrystal = itemFactory.createFromDefinition('expansion-crystal');
                  if (expansionCrystal) {
                    inventoryStore.addItem(expansionCrystal);
                  }
                } else if (name === 'Dragon Stone') {
                  const dragonStone = itemFactory.createFromDefinition('dragon-stone');
                  if (dragonStone) {
                    inventoryStore.addItem(dragonStone);
                  }
                } else if (name === 'Seeker Stone') {
                  const seekerStone = itemFactory.createFromDefinition('seeker-stone');
                  if (seekerStone) {
                    inventoryStore.addItem(seekerStone);
                  }
                } else {
                  inventoryStore.addItem(
                    itemFactory.createMaterial(name, description)
                  );
                }
                break;
              case 'buff':
                try {
                  const buffId: string = params.buffId ?? name.toLowerCase().replace(/\s+/g, '-');
                  buffStore.addBuff({
                    id: buffId,
                    name: name,
                    description: description,
                    icon: params.imageUrl ?? '/images/not-found.png',
                    type: params.buffType,
                    value: 1,
                    effect: (val: number) => val
                  });
                } catch (error) {
                  console.error('Error adding buff:', error);
                  this.addNotification(`Error applying buff reward: ${name}`, 'error');
                }
                break;

              default:
                // Legacy fallback for pokeball only system
                if (selectedReward.type === 'pokeball') {
                  this.pokeballs++;
                }
                break;
            }
          } catch (error) {
            console.error('Error handling job reward:', error);
          }
        }

        job.successfulCompletions++;
        // Add success notification with group key
        this.addNotification(`${job.name} complete!`, 'success', `job-success:${job.name}`);
      } else {
        // Add failure notification - job completed but no reward
        this.addNotification(`${job.name} complete, but no reward found.`, 'error', `job-failure:${job.name}`);
      }

      // Reset progress and set a new startTime for the next cycle
      job.progress = 0;
      job.startTime = Date.now();

      this.markStateForSaving();
    },

    updateJobProgress(jobId: string, elapsed: number) {
      const job = this.idleJobs[jobId];
      if (!job || job.assignedPokemon.length === 0) return;

      // Calculate the appropriate progress increment based on the remaining time
      const remainingTime = this.getJobRemainingTime(jobId);
      const progressIncrement = (elapsed / remainingTime) * 100;

      // Update progress
      job.progress += progressIncrement;

      // Check if the job is complete
      if (job.progress >= 100) {
        this.completeJob(jobId);
      }

      // Save state to ensure progress persists
      this.markStateForSaving();
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
        this.markStateForSaving();
      }
      return success;
    },

    // Notification methods
    addNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', groupKey?: string) {
      // Create a group key if not provided - use the message itself for grouping similar messages
      const effectiveGroupKey = groupKey || this.generateGroupKey(message, type);
      
      // Look for existing notification with the same group key
      const existingNotification = this.notifications.find(n => n.groupKey === effectiveGroupKey);
      
      if (existingNotification) {
        // Update existing notification
        existingNotification.count = (existingNotification.count || 1) + 1;
        existingNotification.timestamp = Date.now(); // Update timestamp to most recent
        
        // Move to end of notifications array to show as most recent
        const index = this.notifications.indexOf(existingNotification);
        this.notifications.splice(index, 1);
        this.notifications.push(existingNotification);
        this.recycleNotifications();
        
        return existingNotification;
      } else {
        // Create new notification
        const notification: Notification = {
          id: generateRandomId(),
          message,
          type,
          timestamp: Date.now(),
          count: 1,
          groupKey: effectiveGroupKey
        };

        this.notifications.push(notification);
        this.recycleNotifications();
        return notification;
      }
    },

    // Helper method to generate group keys for similar messages
    generateGroupKey(message: string, type: string): string {
      // Normalize message for grouping by removing specific details
      let normalizedMessage = message;
      
      // Group "while you were away" messages by job type
      if (message.includes('While you were away:')) {
        const awayMatch = message.match(/While you were away: (.+?) completed \d+ times!/);
        if (awayMatch) {
          const [, jobName] = awayMatch;
          normalizedMessage = `While you were away: ${jobName} completed jobs!`;
        }
      }
      
      // Group job completion messages by job type
      else if (message.includes('complete! Received')) {
        const jobMatch = message.match(/^(.+?) complete! Received (.+?)\.$/);
        if (jobMatch) {
          const [, jobName, rewardItem] = jobMatch;
          // Group by job name and general reward type (remove quantities)
          const generalReward = rewardItem.replace(/\d+x?\s*/, '').trim();
          normalizedMessage = `${jobName} complete! Received ${generalReward}.`;
        }
      }
      
      // Group job completion failures by job type  
      else if (message.includes('complete, but no reward found')) {
        const failMatch = message.match(/^(.+?) complete, but no reward found\.$/);
        if (failMatch) {
          const [, jobName] = failMatch;
          normalizedMessage = `${jobName} complete, but no reward found.`;
        }
      }
      
      // Group caught Pokemon messages
      else if (message.includes('Caught') && message.includes('!')) {
        const caughtMatch = message.match(/^Caught (.+?)!$/);
        if (caughtMatch) {
          normalizedMessage = 'Caught Pokemon!';
        }
      }
      
      // Group level up messages
      else if (message.includes('reached level')) {
        normalizedMessage = 'Pokemon leveled up!';
      }
      
      // Group item usage messages
      else if (message.includes('You used a') && message.includes('It will attract Pokémon')) {
        normalizedMessage = 'Used lure item!';
      }
      
      // Group Pokeball shortage messages
      else if (message.includes("don't have any Pokéballs")) {
        normalizedMessage = "No Pokéballs available!";
      }
      
      // Group faint/recovery messages
      else if (message.includes('fainted') || message.includes('returned to Home')) {
        if (message.includes('All your Pokémon fainted')) {
          normalizedMessage = 'All Pokemon fainted! Returned to Home.';
        } else if (message.includes('fainted')) {
          normalizedMessage = 'Pokemon fainted!';
        }
      }
      
      // Group error messages
      else if (message.includes('Error applying buff reward')) {
        normalizedMessage = 'Error applying buff reward!';
      }
      
      return `${type}:${normalizedMessage}`;
    },

    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
    },

    // Set up game systems including auto-attack with the tickSystem
    setupGameSystems() {
      const buffStore = useBuffStore();
      let hpRegenAccumulatedTime = 0;
      const HP_REGEN_INTERVAL = 1000; // 1 second in milliseconds

      // Add save system variables
      let saveAccumulatedTime = 0;
      const SAVE_INTERVAL = 5000; // Save every 2 seconds if there are pending changes

      // Add deduplication variables
      let deduplicationAccumulatedTime = 0;
      const DEDUPLICATION_INTERVAL = 3 * 250; // 3 ticks (each tick is 250ms)
      let lastPokemonCount = this.getAllPokemon.length;

      // Add fear factor variables
      let fearFactorAccumulatedTime = 0;
      const FEAR_FACTOR_UPDATE_INTERVAL = 1000; // Update fear factor every 1 second

      // Use the tickSystem to handle auto-attack and other time-based game mechanics
      workerTimer.subscribe('setup game systems', (elapsed: number) => {
        // Process auto-attack if the conditions are met
        if (this.battle.wildPokemon && this.activePokemon) {
          // Check if auto-attack is enabled
          if (buffStore.autoAttackState.active) {
            const now = Date.now();
            const timeSinceLastAttack = now - buffStore.autoAttackState.lastAttackTime;

            // Only trigger attack if enough time has passed
            if (timeSinceLastAttack >= buffStore.autoAttackState.interval) {
              this.attack();
              buffStore.recordAutoAttack();
            }
          }
        }

        // Process HP regeneration every 1 second
        hpRegenAccumulatedTime += elapsed;
        if (hpRegenAccumulatedTime >= HP_REGEN_INTERVAL) {
          this.regenHP();
          hpRegenAccumulatedTime -= HP_REGEN_INTERVAL;
        }

        // Process deduplication every 3 ticks if Pokémon count changed
        deduplicationAccumulatedTime += elapsed;
        if (deduplicationAccumulatedTime >= DEDUPLICATION_INTERVAL) {
          const currentPokemonCount = this.getAllPokemon.length;
          
          // Only run deduplication if the count has changed
          if (currentPokemonCount !== lastPokemonCount) {
            // Use setTimeout to avoid blocking the tick
            setTimeout(() => {
              this.deduplicatePokemon();
            }, 0);
            lastPokemonCount = currentPokemonCount;
          }
          
          deduplicationAccumulatedTime -= DEDUPLICATION_INTERVAL;
        }

        // Update job progress for idle jobs
        Object.keys(this.idleJobs).forEach(jobId => {
          this.updateJobProgress(jobId, elapsed);
        });

        // Handle enemy attack animation timing
        if (this.battle.isEnemyAttacking && this.battle.enemyAttackAnimationEndTime) {
          const now = Date.now();
          if (now >= this.battle.enemyAttackAnimationEndTime) {
            this.battle.isEnemyAttacking = false;
            this.battle.enemyAttackAnimationEndTime = undefined;
          }
        }

        // Handle batch saving with proper timing
        saveAccumulatedTime += elapsed;
        if (saveAccumulatedTime >= SAVE_INTERVAL && this.pendingSave) {
          this.performBatchSave();
          saveAccumulatedTime = 0; // Reset the timer
        }

        // Update fear factor system
        fearFactorAccumulatedTime += elapsed;
        if (fearFactorAccumulatedTime >= FEAR_FACTOR_UPDATE_INTERVAL) {
          this.updateFearFactor();
          fearFactorAccumulatedTime -= FEAR_FACTOR_UPDATE_INTERVAL;
        }
      });
    },

    // Deduplication routine to merge duplicate Pokémon by uniqueId
    deduplicatePokemon() {
      let duplicatesFound = false;
      
      // Helper function to merge two Pokémon (keep the one with higher level/experience)
      const mergePokemon = (pokemon1: Pokemon, pokemon2: Pokemon): Pokemon => {
        // Prefer higher level, or if levels are equal, prefer higher experience
        if ((pokemon1.level || 1) > (pokemon2.level || 1)) {
          return pokemon1;
        } else if ((pokemon1.level || 1) < (pokemon2.level || 1)) {
          return pokemon2;
        } else {
          // Same level, check experience
          return (pokemon1.experience || 0) >= (pokemon2.experience || 0) ? pokemon1 : pokemon2;
        }
      };

      // Check and deduplicate playerPokemon
      const uniquePlayerPokemon: Pokemon[] = [];
      const seenPlayerIds = new Set<string>();
      
      for (const pokemon of this.playerPokemon) {
        if (!pokemon.uniqueId) {
          // Generate uniqueId for Pokémon that don't have one
          pokemon.uniqueId = generateRandomId();
          uniquePlayerPokemon.push(pokemon);
          seenPlayerIds.add(pokemon.uniqueId);
        } else if (seenPlayerIds.has(pokemon.uniqueId)) {
          // Found duplicate, merge with existing
          const existingIndex = uniquePlayerPokemon.findIndex(p => p.uniqueId === pokemon.uniqueId);
          if (existingIndex !== -1) {
            uniquePlayerPokemon[existingIndex] = mergePokemon(uniquePlayerPokemon[existingIndex], pokemon);
            duplicatesFound = true;
          }
        } else {
          uniquePlayerPokemon.push(pokemon);
          seenPlayerIds.add(pokemon.uniqueId);
        }
      }

      // Check and deduplicate availablePokemon
      const uniqueAvailablePokemon: Pokemon[] = [];
      const seenAvailableIds = new Set<string>();
      
      for (const pokemon of this.availablePokemon) {
        if (!pokemon.uniqueId) {
          // Generate uniqueId for Pokémon that don't have one
          pokemon.uniqueId = generateRandomId();
          uniqueAvailablePokemon.push(pokemon);
          seenAvailableIds.add(pokemon.uniqueId);
        } else if (seenAvailableIds.has(pokemon.uniqueId)) {
          // Found duplicate, merge with existing
          const existingIndex = uniqueAvailablePokemon.findIndex(p => p.uniqueId === pokemon.uniqueId);
          if (existingIndex !== -1) {
            uniqueAvailablePokemon[existingIndex] = mergePokemon(uniqueAvailablePokemon[existingIndex], pokemon);
            duplicatesFound = true;
          }
        } else {
          uniqueAvailablePokemon.push(pokemon);
          seenAvailableIds.add(pokemon.uniqueId);
        }
      }

      // Check for cross-collection duplicates (between party and available)
      for (let i = 0; i < uniqueAvailablePokemon.length; i++) {
        const availablePokemon = uniqueAvailablePokemon[i];
        const duplicateInParty = uniquePlayerPokemon.findIndex(p => p.uniqueId === availablePokemon.uniqueId);
        
        if (duplicateInParty !== -1) {
          // Found duplicate between collections, merge and keep in the better collection
          const mergedPokemon = mergePokemon(uniquePlayerPokemon[duplicateInParty], availablePokemon);
          
          // Update the party Pokémon and remove from available
          uniquePlayerPokemon[duplicateInParty] = mergedPokemon;
          uniqueAvailablePokemon.splice(i, 1);
          i--; // Adjust index after removal
          
          duplicatesFound = true;
        }
      }

      // Update the state if duplicates were found
      if (duplicatesFound) {
        // Adjust activePokemonIndex if it's out of bounds
        if (this.activePokemonIndex >= uniquePlayerPokemon.length) {
          this.activePokemonIndex = Math.max(0, uniquePlayerPokemon.length - 1);
        }

        this.$patch({
          playerPokemon: uniquePlayerPokemon,
          availablePokemon: uniqueAvailablePokemon
        });

        this.markStateForSaving();
      }
    },

    releasePokemon(pokemon: Pokemon) {
      // Remove from party if it's there
      const partyIndex = this.playerPokemon.findIndex(p => 
        p.uniqueId ? p.uniqueId === pokemon.uniqueId : p === pokemon
      );
      if (partyIndex !== -1) {
        // If it's the active pokemon, switch to another one first
        if (partyIndex === this.activePokemonIndex) {
          const nextPokemon = this.findNextAvailablePokemon();
          if (nextPokemon) {
            this.setActivePokemon(nextPokemon);
          } else {
            // Adjust active pokemon index if no other pokemon available
            this.activePokemonIndex = Math.max(0, this.activePokemonIndex - 1);
          }
        }
        
        // Adjust active pokemon index if needed
        if (partyIndex <= this.activePokemonIndex && this.activePokemonIndex > 0) {
          this.activePokemonIndex--;
        }
        
        this.playerPokemon.splice(partyIndex, 1);
      }

      // Remove from available Pokemon if it's there
      const availableIndex = this.availablePokemon.findIndex(p => 
        p.uniqueId ? p.uniqueId === pokemon.uniqueId : p === pokemon
      );
      if (availableIndex !== -1) {
        this.availablePokemon.splice(availableIndex, 1);
      }

      // Remove from working Pokemon if it's there
      const workingIndex = this.idleWorking.findIndex(p => 
        p.uniqueId ? p.uniqueId === pokemon.uniqueId : p === pokemon
      );
      if (workingIndex !== -1) {
        this.idleWorking.splice(workingIndex, 1);
      }

      // Remove from any idle jobs
      Object.values(this.idleJobs).forEach(job => {
        const jobIndex = job.assignedPokemon.findIndex(p => 
          p.uniqueId ? p.uniqueId === pokemon.uniqueId : p === pokemon
        );
        if (jobIndex !== -1) {
          job.assignedPokemon.splice(jobIndex, 1);
        }
      });

      // Remove from inventory tracking
      const inventoryKey = pokemon.name;
      if (this.inventory.pokemon[inventoryKey]) {
        const instanceIndex = this.inventory.pokemon[inventoryKey].instances.findIndex(p => 
          p.uniqueId ? p.uniqueId === pokemon.uniqueId : p === pokemon
        );
        if (instanceIndex !== -1) {
          this.inventory.pokemon[inventoryKey].instances.splice(instanceIndex, 1);
          this.inventory.pokemon[inventoryKey].count--;
          
          // Remove the entry entirely if no instances remain
          if (this.inventory.pokemon[inventoryKey].count <= 0) {
            delete this.inventory.pokemon[inventoryKey];
          }
        }
      }

      this.markStateForSaving();
      return true;
    },

    // Queue a Pokemon to be the next one spawned
    queuePokemonForSpawn(pokemonId: number, pokemonName: string) {
      this.battle.nextSpawnQueue.push({ id: pokemonId, name: pokemonName });
    },

    // Get all available Pokemon from current region (pool + berryPool)
    getCurrentRegionPokemonPool(): Array<{ id: number, name: string, probability: number, source: 'pool' | 'berryPool' }> {
      if (this.currentRegion === 'Home') {
        return [];
      }

      const region = this.currentRegionData as any;
      const allPokemon: Array<{ id: number, name: string, probability: number, source: 'pool' | 'berryPool' }> = [];

      // Add Pokemon from regular pool
      region.pool.forEach((pokemon: { probability: number; id: any; name: any }) => {
        allPokemon.push({
          id: pokemon.id,
          name: pokemon.name,
          probability: pokemon.probability,
          source: 'pool'
        });
      });

      // Add Pokemon from berry pool if it exists
      if (region.berryPool) {
        region.berryPool.forEach((pokemon: { probability: number; id: any; name: any }) => {
          // Check if Pokemon is already in the list from regular pool
          const existing = allPokemon.find(p => p.id === pokemon.id);
          if (!existing) {
            allPokemon.push({
              id: pokemon.id,
              name: pokemon.name,
              probability: pokemon.probability,
              source: 'berryPool'
            });
          }
        });
      }

      return allPokemon;
    },

    // Temporary region actions
    activateTemporaryRegion(regionId: string, duration: number) {
      const endTime = Date.now() + duration;
      this.temporaryRegion = {
        isActive: true,
        regionId: regionId,
        endTime: endTime,
        remainingTime: duration
      };
      
      // Switch to the temporary region
      this.currentRegion = regionId;
      this.resetBattleState();
      this.startSpawnTimer();
      
      this.addNotification(`Welcome to the ${regions[regionId as keyof typeof regions]?.name || regionId}! Time remaining: ${Math.ceil(duration / 60000)} minutes`, 'success');
      
      // Set up a timer to update remaining time
      this.updateTemporaryRegionTimer();
    },

    updateTemporaryRegionTimer() {
      if (!this.temporaryRegion.isActive || !this.temporaryRegion.endTime) return;
      
      const now = Date.now();
      const remaining = Math.max(0, this.temporaryRegion.endTime - now);
      
      this.temporaryRegion.remainingTime = remaining;
      
      if (remaining <= 0) {
        this.deactivateTemporaryRegion();
      }
    },

    deactivateTemporaryRegion() {
      if (!this.temporaryRegion.isActive) return;
      
      this.temporaryRegion = {
        isActive: false,
        regionId: null,
        endTime: null,
        remainingTime: 0
      };
      
      // Return to Home region
      this.currentRegion = 'Home';
      this.resetBattleState();
      this.startSpawnTimer();
      
      this.addNotification('The mystical portal has closed. You have been returned to Home.', 'info');
    },

    consumeDragonStone() {
      // This function will be called when the dragon stone is used
      const duration = 600000; // 10 minutes
      this.activateTemporaryRegion('ethereal-nexus', duration);
    },

    // Fear Factor Methods
    addDefeatToFearFactor(region: string) {
      const now = Date.now();
      
      // Add the new defeat
      this.fearFactor.defeats.push({ timestamp: now, region });
      
      // Clean up old defeats (older than the window)
      this.fearFactor.defeats = this.fearFactor.defeats.filter(
        defeat => (now - defeat.timestamp) <= FEAR_FACTOR_WINDOW
      );
      
      // Check if fear threshold is reached for this region
      const recentDefeats = this.fearFactor.defeats.filter(
        defeat => defeat.region === region && (now - defeat.timestamp) <= FEAR_FACTOR_WINDOW
      );
      
      if (recentDefeats.length >= FEAR_FACTOR_THRESHOLD) {
        this.triggerFearFactor(region);
      }
      
      this.markStateForSaving();
    },

    triggerFearFactor(region: string) {
      const now = Date.now();
      const disableEndTime = now + FEAR_FACTOR_DISABLE_DURATION;
      
      // Disable the region
      this.fearFactor.disabledRegions[region] = disableEndTime;
      
      // Clear wild Pokemon if we're in the affected region
      if (this.currentRegion === region) {
        this.battle.wildPokemon = null;
      }
      
      // Clear defeats for this region since fear is now active
      this.fearFactor.defeats = this.fearFactor.defeats.filter(
        defeat => defeat.region !== region
      );
      
      this.addBattleLog('The Pokemon in this area have become too frightened to appear!', 'system');
      this.addNotification(`Fear factor activated in ${region}! Pokemon will avoid this area for 1 minute.`, 'warning');
      
      this.markStateForSaving();
    },

    updateFearFactor() {
      const now = Date.now();
      let regionsCleared = false;
      
      // Clean up expired defeats
      this.fearFactor.defeats = this.fearFactor.defeats.filter(
        defeat => (now - defeat.timestamp) <= FEAR_FACTOR_WINDOW
      );
      
      // Check for expired disabled regions
      Object.keys(this.fearFactor.disabledRegions).forEach(region => {
        const disableEndTime = this.fearFactor.disabledRegions[region];
        if (now >= disableEndTime) {
          delete this.fearFactor.disabledRegions[region];
          regionsCleared = true;
          
          if (this.currentRegion === region) {
            this.addBattleLog('The Pokemon have calmed down and returned to the area.', 'system');
            this.addNotification(`Fear factor cleared in ${region}! Pokemon are appearing again.`, 'success');
            this.startSpawnTimer();
          }
        }
      });
      
      if (regionsCleared) {
        this.markStateForSaving();
      }
    },

    resetFearFactor(region: string) {
      // Clear all defeats for the specified region
      this.fearFactor.defeats = this.fearFactor.defeats.filter(
        defeat => defeat.region !== region
      );
      
      // Remove region from disabled regions if it's disabled
      if (this.fearFactor.disabledRegions[region]) {
        delete this.fearFactor.disabledRegions[region];
      }
      
      this.addBattleLog(`Fear factor has been reset in ${region}!`, 'system');
      this.markStateForSaving();
    },

    useGuaranteedCapture() {
      if (!this.phantomContract.guaranteedCaptureAvailable) {
        this.addNotification('No guaranteed capture available!', 'error');
        return false;
      }

      if (!this.battle.wildPokemon) {
        this.addNotification('No wild Pokemon to capture!', 'error');
        return false;
      }

      // Capture the wild Pokemon instantly
      const capturedPokemon = {
        ...this.battle.wildPokemon,
        uniqueId: generateRandomId()
      };
      
      this.addBattleLog(`Phantom Contract activates! ${capturedPokemon.name} is captured instantly!`, 'system');
      this.addPokemonToInventory(capturedPokemon);
      
      // Consume the phantom contract
      this.phantomContract.guaranteedCaptureAvailable = false;
      this.addNotification('Phantom Contract used! Pokemon captured!', 'success');
      
      // Clear the wild Pokemon
      this.battle.wildPokemon = null;
      this.startSpawnTimer();
      
      this.markStateForSaving();
      return true;
    }
  }
});