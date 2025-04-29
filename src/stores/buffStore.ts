import { defineStore } from 'pinia'
import { BuffEffect } from '@/types/idleJobs'
import regions from '@/constants/regions'

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
      timeAllowed: 5000 // Default 5 seconds
    },
    pokemonDefeatedCount: 0,
    lastRegionId: null,
    stunResistanceProgress: 0 // Initialize at 0%
  }),

  getters: {
    getAllBuffs: (state) => Object.values(state.buffs),
    
    getBuffById: (state) => (buffId: string) => {
      return state.buffs[buffId] || null;
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
    }
  },

  actions: {
    // Increase stun resistance progress by 0.01% (called when material-mining job completes)
    increaseStunResistance() {
      this.stunResistanceProgress += 0.0001; // 0.01% in decimal form
      this.saveState();
    },
    
    // Check if stun should be resisted based on current progress
    shouldResistStun() {
      // Get random number between 0-1
      const roll = Math.random();
      // Check if roll is less than current resistance chance
      return roll < this.stunResistanceProgress;
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
      if (this.fireRateState.activePokemonId === null) {
        this.fireRateState.activePokemonId = pokemonId;
      }
      
      // Check if the time since last attack is within the allowed time
      if (this.fireRateState.active && now - this.fireRateState.lastAttackTime > this.fireRateState.timeAllowed) {
        // Reset if the player took too long between attacks
        this.resetFireRate();
        return;
      }
      
      // Increment attack counter
      this.fireRateState.count++;
      this.fireRateState.lastAttackTime = now;
      
      // Update time allowed based on count (every 100 clicks)
      this.updateTimeAllowed();
      
      // If we haven't activated fire rate yet, check if we've hit 25 attacks
      if (!this.fireRateState.active && this.fireRateState.count >= 20) {
        this.activateFireRate();
      }
      // Update tiers based on consecutive attacks
      else if (this.fireRateState.active) {
        this.updateFireRateTier();
      }
    },
    
    // Update the time allowed between attacks based on count
    updateTimeAllowed() {
      // Base time is determined by tier
      let baseTime;
      
      if (this.fireRateState.tier === 1) {
        baseTime = 3000; // 3 seconds for tier 1
      } else if (this.fireRateState.tier === 2.2) {
        // For tier 2, add 1 second for every 100 attacks (after the first 100)
        const extraSeconds = Math.floor(this.fireRateState.count / 100);
        baseTime = 2000 + (extraSeconds * 1000); // 2 seconds + bonus time
      } else if (this.fireRateState.tier === 3.5) {
        // For tier 3, add 1 second for every 100 attacks (after the first 100)
        const extraSeconds = Math.floor(this.fireRateState.count / 100);
        baseTime = 1500 + (extraSeconds * 1000); // 1.5 seconds + bonus time
      } else {
        baseTime = 5000; // Default
      }
      
      // Minimum time is 100ms regardless of tier or count
      const reducedTime = Math.max(100, baseTime);
      
      this.fireRateState.timeAllowed = reducedTime;
    },
    
    // Activate fire rate
    activateFireRate() {
      // Get the fire emblem buff to check its level
      const fireEmblemBuff = this.getBuffById('fire-emblem');
      if (!fireEmblemBuff) return;
      
      this.fireRateState.active = true;
      this.fireRateState.tier = 1.5;
      
      // Update the time allowed between attacks
      this.updateTimeAllowed();
      
      // Set initial multiplier based on buff level
      // First tier is always 1.1 (10% bonus) for level 1
      this.updateFireRateMultiplier();
    },
    
    // Update fire rate tier
    updateFireRateTier() {
      const fireEmblemBuff = this.getBuffById('fire-emblem');
      if (!fireEmblemBuff || !this.fireRateState.active) return;
      
      // Check count thresholds for tier upgrades
      if (this.fireRateState.count >= 80 && this.fireRateState.tier < 3) {
        this.fireRateState.tier = 3; // Max tier
        this.updateTimeAllowed(); // Update time allowed
        this.updateFireRateMultiplier();
      } else if (this.fireRateState.count >= 40 && this.fireRateState.tier < 2) {
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
        timeAllowed: 5000
      };
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
        timeAllowed: 5000
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

    initializeBuffStore() {
      const savedState = localStorage.getItem('buffState');
      
      if (savedState) {
        const state = JSON.parse(savedState);
        this.$patch({
          buffs: state.buffs || {},
          fireRateState: state.fireRateState || {
            active: false,
            tier: 0,
            count: 0,
            lastAttackTime: 0,
            multiplier: 1.0,
            activePokemonId: null,
            timeAllowed: 5000
          },
          pokemonDefeatedCount: state.pokemonDefeatedCount || 0,
          lastRegionId: state.lastRegionId || null
        });
      }
    },

    saveState() {
      const state = {
        buffs: JSON.parse(JSON.stringify(this.buffs)),
        fireRateState: this.fireRateState,
        pokemonDefeatedCount: this.pokemonDefeatedCount,
        lastRegionId: this.lastRegionId
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