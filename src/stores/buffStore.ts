import { defineStore } from 'pinia'
import { BuffEffect } from '../types/idleJobs.js'
import regions from '../constants/regions.js'

interface BuffState {
  buffs: Record<string, BuffEffect>;
  fireRateState: {
    active: boolean;
    tier: number;
    count: number;
    lastAttackTime: number;
    multiplier: number;
    activePokemonId: number | null; // Track active Pokemon ID
    timeAllowed: number; // Time allowed between attacks in milliseconds
  };
  pokemonDefeatedCount: number; // Track defeated Pokemon count for spawn delay
  lastRegionId: string | null; // Track the region ID to reset count on region change
  stunResistanceProgress: number; // Track stun resistance progress (0.01% per completion)
  autoAttackState: {
    active: boolean;
    lastAttackTime: number;
    interval: number;
    triggerAttack: boolean; // New reactive property to trigger auto-attacks
  };
}

export const useBuffStore = defineStore('buff', {
  state: (): BuffState => ({
    buffs: {},
    fireRateState: {
      active: false,
      tier: 0,
      count: 0,
      lastAttackTime: 0,
      multiplier: 1.0,
      activePokemonId: null,
      timeAllowed: 10000 // Updated default timeout
    },
    pokemonDefeatedCount: 0,
    lastRegionId: null,
    stunResistanceProgress: 0, // Initialize at 0%
    autoAttackState: {
      active: false,
      lastAttackTime: 0,
      interval: 5000, // Default interval (5 seconds)
      triggerAttack: false // Initialize as false
    }
  }),

  getters: {
    getAllBuffs: (state) => Object.values(state.buffs),

    getBuffById: (state) => (buffId: string) => {
      return state.buffs[buffId] ?? null;
    },

    getBuffsByType: (state) => (type: string) => {
      return Object.values(state.buffs).filter(buff => buff.type === type);
    },

    // Helper for getting total XP gain bonus from all XP buffs
    getTotalXPBonus: (state) => {
      return Object.values(state.buffs)
        .filter(buff => buff.type === 'xp-boost')
        .reduce((total, buff) => total + buff.value, 0);
    },

    // Helper for getting water emblem XP sharing multiplier
    getWaterEmblemShareMultiplier: (state) => {
      const waterEmblem = state.buffs['water-emblem'];
      if (!waterEmblem) return 0;
      
      // Calculate sharing percentage with diminishing returns after level 10
      const level = waterEmblem.value;
      if (level <= 10) {
        // First 10 levels: 1% per level (linear growth)
        return level * 0.01;
      } else {
        // After level 10: diminishing returns using logarithmic scaling
        const baseShare = 0.10; // 10% from first 10 levels
        const additionalLevels = level - 10;
        // Use logarithmic formula: additional_share = 0.05 * ln(1 + additionalLevels * 0.5)
        const additionalShare = 0.05 * Math.log(1 + additionalLevels * 0.5);
        return Number((Math.min(baseShare + additionalShare, 0.50)).toFixed(2)); // Cap at 50% sharing
      }
    },

    // Check if Water Emblem is active
    hasWaterEmblem: (state) => {
      return state.buffs['water-emblem'] !== undefined;
    },

    // Get fire rate state
    getFireRateState: (state) => state.fireRateState,

    // Get fire rate multiplier
    getFireRateMultiplier: (state) => {
      // If fire rate isn't active, return 1 (no multiplier)
      if (!state.fireRateState.active) return 1.0;

      // Return the current multiplier based on tier
      return state.fireRateState.multiplier;
    },

    // Get defeated Pokemon count
    getDefeatedCount: (state) => state.pokemonDefeatedCount,

    // Check if spawn delay is needed (every 10 defeats)
    shouldDelaySpawn: (state) => state.pokemonDefeatedCount > 0 && state.pokemonDefeatedCount % 10 === 0,

    // Get stun resistance chance - base 0% + 0.01% per material mining completion
    getStunResistanceChance: (state) => {
      return state.stunResistanceProgress;
    },

    // Check if Rock Emblem is active
    hasRockEmblem: (state) => {
      return state.buffs['rock-emblem'] !== undefined;
    },

    // Check if Electric Emblem (auto-attack) is active
    hasElectricEmblem: (state) => {
      return state.buffs['electric-emblem'] !== undefined;
    },

    // Get auto-attack state
    getAutoAttackState: (state) => state.autoAttackState,

    // Calculate auto-attack interval based on buff level
    getAutoAttackInterval: (state) => {
      const electricEmblem = state.buffs['electric-emblem'];
      if (!electricEmblem) return 5000; // Default 5 seconds if no buff

      const level = electricEmblem.value;
      // Formula: auto_attack_interval = 0.5 + (5.0 - 0.5) * exp(-0.003 * level)
      // This gives approximately 5s at level 1, and approaches 0.5s as level increases
      const interval = 0.5 + (5.0 - 0.5) * Math.exp(-0.003 * level);

      // Convert to milliseconds
      return Math.round(interval * 1000);
    },

    // Check if auto-attack is available (has buff and level > 0)
    canAutoAttack: (state) => {
      const electricEmblem = state.buffs['electric-emblem'];
      return electricEmblem !== undefined && electricEmblem.value > 0;
    },

    // Get fire rate progress toward activation (percentage)
    getFireRateProgress: (state) => {
      const fireEmblemBuff = state.buffs['fire-emblem'];
      if (!fireEmblemBuff) return 0;
      
      if (!state.fireRateState.active) {
        // Progress toward 40 attacks needed to activate
        return Math.min(100, (state.fireRateState.count / 40) * 100);
      }
      
      // When active, show progress toward next tier
      if (state.fireRateState.tier === 1) {
        // Progress from 40 to 80 (tier 2)
        const progress = Math.min(100, ((state.fireRateState.count - 40) / (80 - 40)) * 100);
        return progress;
      } else if (state.fireRateState.tier === 2) {
        // Progress from 80 to 120 (tier 3)
        const progress = Math.min(100, ((state.fireRateState.count - 80) / (120 - 80)) * 100);
        return progress;
      } else {
        // Tier 3 - show full progress
        return 100;
      }
    },

    // Get countdown progress (for showing time remaining before reset)
    getCountdownProgress: (state) => {
      const fireEmblemBuff = state.buffs['fire-emblem'];
      if (!fireEmblemBuff || state.fireRateState.active || state.fireRateState.count === 0) return 0;
      
      const now = Date.now();
      const elapsed = now - state.fireRateState.lastAttackTime;
      const timeLimit = 10000; // 10 seconds before reset (matches the reset logic)
      
      // Return percentage of time remaining (countdown)
      const timeRemaining = Math.max(0, timeLimit - elapsed);
      return (timeRemaining / timeLimit) * 100;
    },

    // Check if Flying Emblem is active
    hasFlyingEmblem: (state) => {
      return state.buffs['flying-emblem'] !== undefined;
    },

    // Get spawn timer reduction percentage from Flying Emblem
    getSpawnTimerReduction: (state) => {
      const flyingEmblem = state.buffs['flying-emblem'];
      if (!flyingEmblem) return 0;

      const level = flyingEmblem.value;
      
      // Exponential scaling formula: reduction = 1 - (0.99)^(level^1.2)
      // This creates a steep curve where early levels provide significant benefit
      // but later levels provide diminishing returns, reaching ~63% reduction at level 100
      const exponent = Math.pow(level, 1.2);
      const reduction = 1 - Math.pow(0.99, exponent);
      
      // Cap at 80% reduction (minimum 20% of original time)
      return Math.min(reduction, 0.80);
    },

    // ...existing code...
  },

  actions: {
    // Increase stun resistance progress by 0.01% (called when material-mining job completes)
    increaseStunResistance() {
      this.stunResistanceProgress += 0.0001; // 0.01% in decimal form
      this.saveState();
    },

    // Check if stun should be resisted based on current progress
    shouldResistStun() {
      const targetFullLevel = 10000;
      const progress = Math.min(Math.log(this.stunResistanceProgress) / Math.log(targetFullLevel), 1.0);
      return Math.random() < progress;
    },

    addBuff(buff: BuffEffect) {
      // If buff already exists, increase its level
      if (this.buffs[buff.id]) {
        this.buffs[buff.id].value += 1;

        // Check if buff has hit its maximum level
        if (this.buffs[buff.id].maxValue &&
          this.buffs[buff.id].value >= this.buffs[buff.id].maxValue!) {
          this.buffs[buff.id].value = this.buffs[buff.id].maxValue!;
        }
      } else {
        // Otherwise add a new buff with starting value of 1
        this.buffs[buff.id] = {
          ...buff,
          value: 1
        };
      }

      this.saveState();
    },

    removeBuff(buffId: string) {
      if (this.buffs[buffId]) {
        delete this.buffs[buffId];
        this.saveState();
        return true;
      }
      return false;
    },

    // Update existing buff level
    updateBuffLevel(buffId: string, newLevel: number) {
      if (this.buffs[buffId]) {
        // Make sure we don't exceed max level if defined
        if (this.buffs[buffId].maxValue && newLevel > this.buffs[buffId].maxValue) {
          this.buffs[buffId].value = this.buffs[buffId].maxValue;
        } else {
          this.buffs[buffId].value = newLevel;
        }

        this.saveState();
        return true;
      }
      return false;
    },

    // Fire rate system actions

    // Register an attack for fire rate with level restrictions
    registerFireRateAttack(pokemonId: number, pokemonLevel: number, currentRegionId: string) {
      const now = Date.now();
      const fireEmblemBuff = this.getBuffById('fire-emblem');

      // If user doesn't have the Fire Emblem buff, do nothing
      if (!fireEmblemBuff) return;

      // Get region's max level
      const region = regions[currentRegionId as keyof typeof regions];
      if (!region) return;

      // Apply level restriction - disable fire rate if player level exceeds region max level
      if (pokemonLevel > region.maxLevel) {
        // If fire rate was active, reset it
        if (this.fireRateState.active) {
          this.resetFireRate();
        }
        return; // Don't allow fire rate to activate
      }

      // If pokemon has changed, reset fire rate
      if (this.fireRateState.activePokemonId !== null &&
        this.fireRateState.activePokemonId !== pokemonId) {
        this.resetFireRate();
        this.fireRateState.activePokemonId = pokemonId;
        return;
      }

      // Set active Pokemon ID if not set
      this.fireRateState.activePokemonId ??= pokemonId;

      // Check if the time since last attack is within the allowed time
      // Only reset if the player has been inactive for a significant period
      if (this.fireRateState.active && now - this.fireRateState.lastAttackTime > this.fireRateState.timeAllowed) {
        // Reset if the player took too long between attacks
        this.resetFireRate();
        return;
      }

      // If not active and player took too long between attacks (10 seconds), reset count
      if (!this.fireRateState.active && this.fireRateState.count > 0 && 
          now - this.fireRateState.lastAttackTime > 10000) {
        this.fireRateState.count = 0;
        this.fireRateState.lastAttackTime = 0;
        this.saveState();
        return;
      }

      // Increment attack counter
      this.fireRateState.count++;
      this.fireRateState.lastAttackTime = now;

      // Update time allowed based on count
      this.updateTimeAllowed();

      // If we haven't activated fire rate yet, check if we've hit 40 attacks
      if (!this.fireRateState.active && this.fireRateState.count >= 40) {
        this.activateFireRate();
      }
      // Update tiers based on consecutive attacks
      else if (this.fireRateState.active) {
        this.updateFireRateTier();
      }

      // Save state after each attack registration
      this.saveState();
    },

    // Update the time allowed between attacks based on count
    updateTimeAllowed() {
      // Base time is determined by tier - but we need reasonable timeouts to prevent accidental resets
      let baseTime;

      if (this.fireRateState.tier === 1) {
        baseTime = 8000; // 8 seconds for tier 1 (more forgiving)
      } else if (this.fireRateState.tier === 2) {
        baseTime = 6000; // 6 seconds for tier 2
      } else if (this.fireRateState.tier === 3) {
        baseTime = 5000; // 5 seconds for tier 3 (still reasonable)
      } else {
        baseTime = 10000; // Default 10 seconds (before activation)
      }

      this.fireRateState.timeAllowed = baseTime;
    },

    // Activate fire rate
    activateFireRate() {
      // Get the fire emblem buff to check its level
      const fireEmblemBuff = this.getBuffById('fire-emblem');
      if (!fireEmblemBuff) return;

      this.fireRateState.active = true;
      this.fireRateState.tier = 1; // Start at tier 1

      // Update the time allowed between attacks
      this.updateTimeAllowed();

      // Set initial multiplier based on buff level
      this.updateFireRateMultiplier();
      
      // Save state
      this.saveState();
    },

    // Update fire rate tier
    updateFireRateTier() {
      const fireEmblemBuff = this.getBuffById('fire-emblem');
      if (!fireEmblemBuff || !this.fireRateState.active) return;

      // Check count thresholds for tier upgrades
      // Tier 1: 40-79 attacks
      // Tier 2: 80-119 attacks  
      // Tier 3: 120+ attacks
      if (this.fireRateState.count >= 120 && this.fireRateState.tier < 3) {
        this.fireRateState.tier = 3; // Max tier
        this.updateTimeAllowed(); // Update time allowed
        this.updateFireRateMultiplier();
      } else if (this.fireRateState.count >= 80 && this.fireRateState.tier < 2) {
        this.fireRateState.tier = 2;
        this.updateTimeAllowed(); // Update time allowed
        this.updateFireRateMultiplier();
      }
    },

    // Reset fire rate
    resetFireRate() {
      this.fireRateState = {
        active: false,
        tier: 0,
        count: 0,
        lastAttackTime: 0,
        multiplier: 1.0,
        activePokemonId: this.fireRateState.activePokemonId, // Preserve the active Pokemon ID
        timeAllowed: 10000 // Use updated default timeout
      };
      this.saveState();
    },

    // Reset all buffs (for testing)
    resetBuffs() {
      this.buffs = {};
      this.fireRateState = {
        active: false,
        tier: 0,
        count: 0,
        lastAttackTime: 0,
        multiplier: 1.0,
        activePokemonId: null,
        timeAllowed: 10000 // Use updated default timeout
      };
      this.saveState();
    },

    // Register a Pokemon defeat for spawn delay tracking
    registerPokemonDefeat(regionId: string) {
      // Reset count if region changed
      if (this.lastRegionId !== regionId) {
        this.lastRegionId = regionId;
        this.pokemonDefeatedCount = 1;
      } else {
        this.pokemonDefeatedCount++;
      }

      this.saveState();
    },

    // Reset Pokemon defeated count (called after delay is applied)
    resetDefeatCounter() {
      // Only reset the counter to the next multiple of 10
      // So if we're at 20, stay at 20 for the next delay at 30
      if (this.pokemonDefeatedCount % 10 === 0) {
        this.pokemonDefeatedCount++;
      }
      this.saveState();
    },

    // Toggle auto-attack on/off
    toggleAutoAttack() {
      // If user doesn't have the Electric Emblem buff, do nothing
      if (!this.hasElectricEmblem) return false;

      // Toggle active state
      this.autoAttackState.active = !this.autoAttackState.active;

      // If turning on, update interval and lastAttackTime
      if (this.autoAttackState.active) {
        // Fix: Calculate the interval as a numeric value instead of using the getter reference
        const electricEmblem = this.buffs['electric-emblem'];
        const level = electricEmblem?.value ?? 1;
        const intervalSeconds = 0.5 + (5.0 - 0.5) * Math.exp(-0.003 * level);
        this.autoAttackState.interval = Math.round(intervalSeconds * 1000);

        // Set the last attack time to now
        this.autoAttackState.lastAttackTime = Date.now();

        console.log(`Auto-attack activated with interval: ${this.autoAttackState.interval}ms (${intervalSeconds.toFixed(2)}s)`);
      } else {
        console.log('Auto-attack deactivated');
      }

      this.saveState();
      return this.autoAttackState.active;
    },

    // Record an auto-attack
    recordAutoAttack() {
      this.autoAttackState.lastAttackTime = Date.now();

      // Only reset triggerAttack if it was true
      if (this.autoAttackState.triggerAttack) {
        this.autoAttackState.triggerAttack = false;
      }

      this.saveState();
    },

    // Check if it's time for an auto-attack
    shouldAutoAttack() {
      if (!this.autoAttackState.active) return false;

      const now = Date.now();
      const elapsed = now - this.autoAttackState.lastAttackTime;

      // Check if enough time has passed since the last attack
      if (elapsed >= this.autoAttackState.interval) {
        // Set the reactive property to trigger the attack
        this.autoAttackState.triggerAttack = true;
        return true;
      }

      return false;
    },

    // Update auto-attack interval (should be called when buff level changes)
    updateAutoAttackInterval() {
      const electricEmblem = this.buffs['electric-emblem'];
      if (!electricEmblem) {
        this.autoAttackState.interval = 5000;
      } else {
        const level = electricEmblem.value;
        const intervalSeconds = 0.5 + (5.0 - 0.5) * Math.exp(-0.003 * level);
        this.autoAttackState.interval = Math.round(intervalSeconds * 1000);
      }
      this.saveState();
    },

    initializeBuffStore() {
      const savedState = localStorage.getItem('buffState');

      if (savedState) {
        const state = JSON.parse(savedState);
        this.$patch({
          buffs: state.buffs ?? {},
          fireRateState: state.fireRateState ?? {
            active: false,
            tier: 0,
            count: 0,
            lastAttackTime: 0,
            multiplier: 1.0,
            activePokemonId: null,
            timeAllowed: 10000 // Updated default timeout
          },
          pokemonDefeatedCount: state.pokemonDefeatedCount ?? 0,
          lastRegionId: state.lastRegionId ?? null,
          autoAttackState: state.autoAttackState ?? {
            active: false,
            lastAttackTime: 0,
            interval: 5000,
            triggerAttack: false
          }
        });
      }
    },

    saveState() {
      const state = {
        buffs: JSON.parse(JSON.stringify(this.buffs)),
        fireRateState: this.fireRateState,
        pokemonDefeatedCount: this.pokemonDefeatedCount,
        lastRegionId: this.lastRegionId,
        autoAttackState: this.autoAttackState
      };

      localStorage.setItem('buffState', JSON.stringify(state));
    },

    // Update multiplier based on buff level and current tier
    updateFireRateMultiplier() {
      const fireEmblemBuff = this.getBuffById('fire-emblem');
      if (!fireEmblemBuff) return;

      const buffLevel = fireEmblemBuff.value;

      // Calculate tier 1 multiplier: Base 1.0 + 0.01 per buff level
      // So at level 10 it's 1.1, at level 20 it's 1.2, etc.
      const tier1Multiplier = 1.0 + (0.01 * buffLevel);

      // Calculate tier 2 multiplier: tier1 + tier1
      // At level 10: tier1 = 1.1, so tier2 = 1.1 + 1.1 = 2.2
      const tier2Multiplier = tier1Multiplier + tier1Multiplier;

      // Calculate tier 3 multiplier: 3 * (tier1 + tier2)
      // At level 10: tier1 = 1.1, tier2 = 2.2, so tier3 = 3 * (1.1 + 2.2) = 3 * 3.3 = 9.9
      const tier3Multiplier = 3 * (tier1Multiplier + tier2Multiplier);

      // Set multiplier based on current tier
      if (this.fireRateState.tier === 1) {
        this.fireRateState.multiplier = tier1Multiplier;
      } else if (this.fireRateState.tier === 2) {
        this.fireRateState.multiplier = tier2Multiplier;
      } else if (this.fireRateState.tier === 3) {
        this.fireRateState.multiplier = tier3Multiplier;
      } else {
        this.fireRateState.multiplier = 1.1;
      }
    }
  }
});