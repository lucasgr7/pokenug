<template>
  <div class="buff-display">
    <div v-if="buffs.length > 0" class="flex flex-wrap gap-2 items-center">
      <div 
        v-for="buff in buffs" 
        :key="buff.id"
        class="buff-icon relative cursor-pointer"
        @click="openBuffModal(buff)"
      >
        <!-- Buff icon -->
        <div 
          class="w-[80px] h-[80px] rounded-xl border-2 shadow-md overflow-hidden bg-gray-100 relative hover:shadow-lg hover:scale-105 transition-all"
          :class="getBuffBorderClass(buff.type)"
        >
          <img 
            :src="buff.icon" 
            :alt="buff.name" 
            class="w-full h-full object-contain p-1"
            @error="$event.target.src = '/images/not-found.png'"
          />
          
          <!-- Buff level indicator -->
          <div class="absolute bottom-1 right-1 bg-gray-800 text-white font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-lg text-xs">
            {{ buff.value }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-sm text-gray-500">No active buffs</div>

    <!-- Buff Description Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" @click="closeModal">
      <div class="bg-white rounded-lg p-5 max-w-md w-full shadow-xl" @click.stop>
        <div v-if="selectedBuff" class="flex flex-col items-center">
          <!-- Buff icon header -->
          <div class="flex items-center mb-4">
            <div 
              class="w-16 h-16 rounded-xl border-2 shadow-md overflow-hidden bg-gray-100 mr-4"
              :class="getBuffBorderClass(selectedBuff.type)"
            >
              <img 
                :src="selectedBuff.icon" 
                :alt="selectedBuff.name" 
                class="w-full h-full object-contain p-1"
                @error="$event.target.src = '/images/not-found.png'"
              />
            </div>
            <div>
              <h3 class="text-xl font-bold">{{ selectedBuff.name }}</h3>
              <div class="flex items-center">
                <span class="mr-2 text-sm text-gray-600">Level:</span>
                <span class="bg-gray-800 text-white font-bold py-0.5 px-2 rounded-full text-sm">
                  {{ selectedBuff.value }}
                </span>
                <span v-if="selectedBuff.maxValue" class="ml-1 text-sm text-gray-600">
                  / {{ selectedBuff.maxValue }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Buff description -->
          <div class="bg-gray-50 p-4 rounded-lg w-full mb-4">
            <p class="text-gray-800">{{ selectedBuff.description }}</p>
          </div>
          
          <!-- Buff effect details -->
          <div class="w-full">
            <div class="font-semibold mb-2">Effect:</div>
            <div v-if="selectedBuff.type === 'xp-boost'" class="flex items-center bg-purple-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium">XP Boost</div>
                <div class="text-sm">+{{ selectedBuff.value }} XP per attack</div>
              </div>
            </div>
            <div v-else-if="selectedBuff.type === 'attack-boost'" class="flex items-center bg-red-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Attack Boost</div>
                <div class="text-sm">+{{ selectedBuff.value * 5 }}% attack damage</div>
              </div>
            </div>
            <div v-else-if="selectedBuff.type === 'defense-boost'" class="flex items-center bg-blue-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Defense Boost</div>
                <div class="text-sm">+{{ selectedBuff.value * 5 }}% damage reduction</div>
              </div>
            </div>
            <div v-else-if="selectedBuff.type === 'catch-rate'" class="flex items-center bg-green-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Catch Rate Boost</div>
                <div class="text-sm">+{{ selectedBuff.value * 10 }}% Pokéball catch chance</div>
              </div>
            </div>
            <div v-else-if="selectedBuff.type === 'loot-chance'" class="flex items-center bg-yellow-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Loot Chance Boost</div>
                <div class="text-sm">+{{ selectedBuff.value * 5 }}% chance of finding items</div>
              </div>
            </div>
            <!-- Stun Resistance Buff Display (Rock Emblem) -->
            <div v-else-if="selectedBuff.type === 'stun-resistance'" class="flex items-center bg-gradient-to-r from-gray-50 to-yellow-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-gradient-to-br from-gray-500 to-yellow-700 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Stun Resistance</div>
                <div class="text-sm mb-1">Level {{ selectedBuff.value }}: Prevents fainting, leaving Pokémon at 10% HP</div>
                <div class="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                  <span>Base chance: {{ (0.01 * selectedBuff.value).toFixed(2) }}% per level</span>
                </div>
                <div class="text-xs text-gray-700 mt-1">
                  With potions: Automatically uses a potion when taking fatal damage
                </div>
              </div>
            </div>
            <!-- Fire Rate Buff Display -->
            <div v-else-if="selectedBuff.type === 'fire-rate'" class="flex items-center bg-gradient-to-r from-yellow-50 to-red-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-gradient-to-r from-yellow-500 to-red-500 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Fire Rate Boost</div>
                <div class="text-sm">Consecutive attacks build fire rate, multiplying XP gain by up to x{{ (1.3 + (0.1 * (selectedBuff.value - 1))).toFixed(1) }}</div>
                <div class="flex items-center mt-1">
                  <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Tier 1: x1.1</span>
                  <span class="mx-1">→</span>
                  <span class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Tier 2: x1.2</span>
                  <span class="mx-1">→</span>
                  <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Tier 3: x{{ (1.3 + (0.1 * (selectedBuff.value - 1))).toFixed(1) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Auto Attack Buff Display (Electric Emblem) -->
            <div v-else-if="selectedBuff.type === 'auto-attack'" class="flex items-center bg-gradient-to-r from-yellow-50 to-blue-50 p-3 rounded-lg">
              <div class="w-8 h-8 bg-gradient-to-r from-yellow-400 to-blue-300 rounded-full flex items-center justify-center text-white mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium">Auto Attack</div>
                <div class="text-sm mb-1">Level {{ selectedBuff.value }}: Automatically attacks every {{ getAutoAttackInterval(selectedBuff.value).toFixed(1) }} seconds</div>
                <div v-if="buffStore.autoAttackState.active" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  <span>Status: Active</span>
                </div>
                <div v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  <span>Status: Inactive (Click the lightning bolt to activate)</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Close Button -->
          <button @click="closeModal" class="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBuffStore } from '@/stores/buffStore'
import type { BuffEffect } from '@/types/idleJobs'

const buffStore = useBuffStore()
const showModal = ref(false)
const selectedBuff = ref<BuffEffect | null>(null)

// Get all active buffs
const buffs = computed(() => {
  return buffStore.getAllBuffs
})

// Open modal with buff details
const openBuffModal = (buff: BuffEffect) => {
  selectedBuff.value = buff
  showModal.value = true
}

// Close modal
const closeModal = () => {
  showModal.value = false
  setTimeout(() => {
    selectedBuff.value = null
  }, 300) // Clear after animation
}

// Get appropriate border color for each buff type
const getBuffBorderClass = (type: string) => {
  const typeClasses: Record<string, string> = {
    'xp-boost': 'border-purple-500',
    'attack-boost': 'border-red-500',
    'defense-boost': 'border-blue-500',
    'catch-rate': 'border-green-500',
    'loot-chance': 'border-yellow-500',
    'fire-rate': 'border-orange-500',
    'auto-attack': 'border-yellow-400',
    'stun-resistance': 'border-yellow-700'
  }
  
  return typeClasses[type] || 'border-gray-400'
}

// Calculate auto-attack interval based on buff level
const getAutoAttackInterval = (level: number) => {
  // Formula: auto_attack_interval = 0.5 + (5.0 - 0.5) * exp(-0.003 * level)
  return 0.5 + (5.0 - 0.5) * Math.exp(-0.003 * level);
}
</script>

<style scoped>
.buff-icon {
  transition: transform 0.2s ease;
  position: relative;
}

/* Added responsive layout to handle multiple buffs */
.buff-display {
  overflow-x: auto;
  max-width: 100%;
  padding-bottom: 4px; /* Space for scrollbar if needed */
}

/* Hide scrollbar but allow scrolling */
.buff-display::-webkit-scrollbar {
  height: 3px;
}

.buff-display::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.buff-display::-webkit-scrollbar-track {
  background: transparent;
}
</style>