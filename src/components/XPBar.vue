<template>
  <div class="relative w-full">
    <!-- XP Bar Container with enhanced design -->
    <div class="relative h-6 bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg overflow-hidden shadow-inner border border-orange-300">
      <!-- XP Progress -->
      <div
        class="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-600 ease-out rounded-full glow-effect"
        :class="{ 'animate-level-up': isLevelingUp }"
        :style="{
          width: `${(experience / experienceToNextLevel) * 100}%`,
          boxShadow: isGainingXP ? '0 0 15px rgba(249, 115, 22, 0.8)' : 'none'
        }"
      >
        <!-- Shimmer effect -->
        <div class="shimmer-effect"></div>
      </div>

      <!-- XP Text with enhanced styling -->
      <div class="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
        <div class="px-3 py-0.5 bg-white bg-opacity-30 rounded-full backdrop-filter backdrop-blur-sm">
          <span class="text-sm text-orange-800 font-bold drop-shadow-sm">{{ Math.floor(experience) }}/{{ experienceToNextLevel }}</span>
          <span class="ml-2 text-xs bg-orange-700 text-white px-2 py-0.5 rounded-full font-semibold">Lv.{{ level }}</span>
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
import { ref, watch } from 'vue'

const props = defineProps<{
  experience: number
  experienceToNextLevel: number
  level: number
}>()

const isGainingXP = ref(false)
const isLevelingUp = ref(false)
const recentXPGains = ref<Array<{ id: number; amount: number; x: number }>>([])
let xpGainCounter = 0

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
</style>