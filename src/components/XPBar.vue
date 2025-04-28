<template>
  <div class="relative w-full">
    <!-- XP Bar Container with enhanced design -->
    <div class="relative h-6 bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg overflow-hidden shadow-inner border border-orange-300">
      <!-- XP Progress -->
      <div
        class="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-600 ease-out rounded-full glow-effect"
        :class="{ 
          'animate-level-up': isLevelingUp,
          'fire-rate-active': fireRateActive,
          'fire-rate-tier-1': fireRateActive && fireRateTier === 1,
          'fire-rate-tier-2': fireRateActive && fireRateTier === 2,
          'fire-rate-tier-3': fireRateActive && fireRateTier === 3
        }"
        :style="{
          width: `${(experience / experienceToNextLevel) * 100}%`,
          boxShadow: isGainingXP || fireRateActive ? '0 0 15px rgba(249, 115, 22, 0.8)' : 'none'
        }"
      >
        <!-- Shimmer effect -->
        <div class="shimmer-effect"></div>
        
        <!-- Fire rate flames overlay -->
        <div v-if="fireRateActive" class="fire-overlay"></div>
        
        <!-- Fire particles container -->
        <div v-if="fireRateActive" class="particles-container">
          <!-- Dynamic particles for fire effect -->
          <div v-for="i in 12" :key="`particle-${i}`" 
               class="fire-particle"
               :class="[
                 `particle-${i}`,
                 fireRateTier === 1 ? 'fire-particle-tier-1' : 
                 fireRateTier === 2 ? 'fire-particle-tier-2' : 
                 'fire-particle-tier-3'
               ]">
          </div>
        </div>
      </div>

      <!-- XP Text with enhanced styling -->
      <div class="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
        <div class="px-3 py-0.5 bg-white bg-opacity-30 rounded-full backdrop-filter backdrop-blur-sm">
          <span class="text-sm text-orange-800 font-bold drop-shadow-sm">{{ Math.floor(experience) }}/{{ experienceToNextLevel }}</span>
          <span class="ml-2 text-xs bg-orange-700 text-white px-2 py-0.5 rounded-full font-semibold">Lv.{{ level }}</span>
          
          <!-- Fire rate multiplier -->
          <span 
            v-if="fireRateActive" 
            class="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
            :class="getFireRateClass"
          >
            x{{ fireRateMultiplier.toFixed(1) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Floating XP Numbers with enhanced animation -->
    <TransitionGroup 
      name="float-up" 
      tag="div" 
      class="absolute inset-0 overflow-visible pointer-events-none"
      style="z-index: 9999;"
    >
      <div
        v-for="xpGain in recentXPGains"
        :key="xpGain.id"
        class="absolute text-amber-400 font-bold text-sm animate-float-up"
        :style="{ 
          left: `${xpGain.x}%`, 
          bottom: '0',
          textShadow: '0 0 8px rgba(251, 191, 36, 0.8), 0 0 5px rgba(251, 191, 36, 0.5), 0 0 3px rgba(251, 191, 36, 0.3)'
        }"
      >
        +{{ xpGain.amount }} XP
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useBuffStore } from '@/stores/buffStore'

const props = defineProps<{
  experience: number
  experienceToNextLevel: number
  level: number
}>()

const isGainingXP = ref(false)
const isLevelingUp = ref(false)
const recentXPGains = ref<Array<{ id: number; amount: number; x: number }>>([])

let xpGainCounter = 0

// Get the buff store to access fire rate state
const buffStore = useBuffStore()

// Fire rate reactive properties
const fireRateActive = computed(() => buffStore.getFireRateState.active)
const fireRateTier = computed(() => buffStore.getFireRateState.tier)
const fireRateMultiplier = computed(() => buffStore.getFireRateMultiplier)

// Get appropriate fire rate class based on tier
const getFireRateClass = computed(() => {
  if (!fireRateActive.value) return '';
  
  const classes = {
    1: 'bg-yellow-500 text-yellow-900',
    2: 'bg-red-500 text-white',
    3: 'bg-blue-500 text-white'
  };
  
  return classes[fireRateTier.value] || '';
})

// Watch for XP changes to trigger animations
watch(() => props.experience, (newXP, oldXP) => {
  if (newXP > oldXP) {
    const xpGained = newXP - oldXP
    addFloatingXP(xpGained)
    triggerGlowEffect()
  }
})

const addFloatingXP = (amount: number) => {
  const newXPGain = {
    id: xpGainCounter++,
    amount,
    x: Math.random() * 80 + 10 // Random position between 10% and 90%
  }
  recentXPGains.value.push(newXPGain)
  setTimeout(() => {
    recentXPGains.value = recentXPGains.value.filter(g => g.id !== newXPGain.id)
  }, 2000)
}

const triggerGlowEffect = () => {
  isGainingXP.value = true
  setTimeout(() => {
    isGainingXP.value = false
  }, 1000)
}
</script>

<style scoped>
.glow-effect {
  filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.7));
}

.float-up-enter-active {
  animation: float-up 2s ease-out forwards;
}

.float-up-leave-active {
  display: none;
}

@keyframes float-up {
  0% {
    transform: translateY(0);
    opacity: 0;
    scale: 0.8;
  }
  20% {
    opacity: 1;
    scale: 1.2;
  }
  60% {
    opacity: 1;
    scale: 1;
  }
  100% {
    transform: translateY(-60px);
    opacity: 0;
    scale: 0.8;
  }
}

.animate-float-up {
  animation: float-up 2s ease-out forwards;
}

.animate-level-up {
  animation: levelUp 0.8s ease-out;
}

@keyframes levelUp {
  0% { transform: scaleY(1); }
  50% { transform: scaleY(1.8); filter: brightness(1.5); }
  100% { transform: scaleY(1); }
}

/* Shimmer effect */
.shimmer-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Fire Rate Effect Styles */
.fire-rate-active {
  position: relative;
  overflow: hidden;
}

.fire-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-repeat: repeat-x;
  background-size: auto 100%;
  mix-blend-mode: screen;
}

/* Fire rate tier styles */
.fire-rate-tier-1 {
  background-image: linear-gradient(to right, #f59e0b, #f97316);
}

.fire-rate-tier-1 .fire-overlay {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Cpath d='M10 50 Q20 30 30 50 Q40 20 50 50 Q60 30 70 50 Q80 20 90 50' stroke='%23ffdd00' stroke-width='4' fill='none'/%3E%3C/svg%3E");
  animation: fire-wave 2s infinite linear;
}

.fire-rate-tier-2 {
  background-image: linear-gradient(to right, #ef4444, #dc2626);
}

.fire-rate-tier-2 .fire-overlay {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Cpath d='M10 50 Q20 20 30 50 Q40 10 50 50 Q60 20 70 50 Q80 10 90 50' stroke='%23ff9500' stroke-width='6' fill='none'/%3E%3C/svg%3E");
  animation: fire-wave 1.5s infinite linear;
}

.fire-rate-tier-3 {
  background-image: linear-gradient(to right, #2563eb, #1d4ed8);
}

.fire-rate-tier-3 .fire-overlay {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Cpath d='M10 50 Q20 10 30 50 Q40 0 50 50 Q60 10 70 50 Q80 0 90 50' stroke='%2376a9fa' stroke-width='8' fill='none'/%3E%3C/svg%3E");
  animation: fire-wave 0.8s infinite linear;
}

@keyframes fire-wave {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 100px 0;
  }
}

/* Fire particles container */
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

/* Fire particle styling */
.fire-particle {
  position: absolute;
  border-radius: 50%;
  width: 4px;
  height: 4px;
  opacity: 0;
  pointer-events: none;
  filter: blur(0.5px);
  z-index: 5;
  transform: translateY(0) scale(0);
}

/* Generate different particle animations and positions */
@keyframes sparkle {
  0% { transform: translateY(25px) scale(0); opacity: 0; }
  25% { opacity: 1; }
  50% { transform: translateY(-5px) scale(1.2); opacity: 0.8; }
  100% { transform: translateY(-15px) scale(0.2); opacity: 0; }
}

/* Position and animate particles individually */
.particle-1 { left: 10%; animation: sparkle 1.5s infinite ease-out 0.1s; }
.particle-2 { left: 20%; animation: sparkle 1.8s infinite ease-out 0.3s; }
.particle-3 { left: 30%; animation: sparkle 1.2s infinite ease-out 0.5s; }
.particle-4 { left: 40%; animation: sparkle 1.6s infinite ease-out 0.2s; }
.particle-5 { left: 50%; animation: sparkle 1.3s infinite ease-out 0.7s; }
.particle-6 { left: 60%; animation: sparkle 1.7s infinite ease-out 0.4s; }
.particle-7 { left: 70%; animation: sparkle 1.4s infinite ease-out 0.6s; }
.particle-8 { left: 80%; animation: sparkle 1.9s infinite ease-out 0.3s; }
.particle-9 { left: 15%; animation: sparkle 1.2s infinite ease-out 0.8s; }
.particle-10 { left: 35%; animation: sparkle 1.5s infinite ease-out 0.1s; }
.particle-11 { left: 65%; animation: sparkle 1.1s infinite ease-out 0.4s; }
.particle-12 { left: 85%; animation: sparkle 1.3s infinite ease-out 0.2s; }

/* Fire particle colors by tier */
.fire-particle-tier-1 {
  background: radial-gradient(circle, #fff176 0%, #ffeb3b 50%, #fdd835 100%);
  box-shadow: 0 0 6px 2px rgba(255, 235, 59, 0.6);
}

.fire-particle-tier-2 {
  background: radial-gradient(circle, #ffab91 0%, #ff7043 50%, #e64a19 100%);
  box-shadow: 0 0 8px 2px rgba(255, 112, 67, 0.7);
}

.fire-particle-tier-3 {
  background: radial-gradient(circle, #90caf9 0%, #42a5f5 50%, #1976d2 100%);
  box-shadow: 0 0 10px 3px rgba(66, 165, 245, 0.8);
}
</style>