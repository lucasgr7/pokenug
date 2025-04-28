import { defineStore } from 'pinia'
import { BuffEffect } from '@/types/idleJobs'

interface BuffState {
  buffs: Record<string, BuffEffect>;
}

export const useBuffStore = defineStore('buff', {
  state: (): BuffState => ({
    buffs: {}
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
    }
  },

  actions: {
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

    // Reset all buffs (for testing)
    resetBuffs() {
      this.buffs = {};
      this.saveState();
    },

    initializeBuffStore() {
      const savedState = localStorage.getItem('buffState');
      
      if (savedState) {
        const state = JSON.parse(savedState);
        this.$patch({
          buffs: state.buffs || {}
        });
      }
    },

    saveState() {
      const state = {
        buffs: JSON.parse(JSON.stringify(this.buffs))
      };
      
      localStorage.setItem('buffState', JSON.stringify(state));
    }
  }
});