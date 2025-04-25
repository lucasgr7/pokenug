<template>
  <div class="relative w-[180px]">
    <!-- XP Bar -->
    <div class="relative h-3 bg-orange-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-orange-500 transition-all duration-600 ease-out rounded-full glow-effect"
        :class="{ 'animate-level-up': isLevelingUp }"
        :style="{
          width: `${(experience / experienceToNextLevel) * 100}%`,
          boxShadow: isGainingXP ? '0 0 10px rgba(249, 115, 22, 0.8)' : 'none'
        }"
      ></div>
    </div>

    <!-- Floating XP Numbers -->
    <TransitionGroup 
      name="float-up" 
      tag="div" 
      class="absolute inset-0 overflow-visible pointer-events-none"
      style="z-index: 9999;"
    >
      <div
        v-for="xpGain in recentXPGains"
        :key="xpGain.id"
        class="absolute text-orange-500 font-bold text-sm animate-float-up glow-text"
        :style="{ left: `${xpGain.x}%`, bottom: '0' }"
      >
        +{{ xpGain.amount }}
      </div>
    </TransitionGroup>

    <!-- XP Text -->
    <div class="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs text-orange-700 font-bold">
      {{ Math.floor(experience) }}/{{ experienceToNextLevel }}
    </div>
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
  }, 600)
}
</script>

<style scoped>
.glow-effect {
  filter: drop-shadow(0 0 5px rgba(249, 115, 22, 0.5));
}

.glow-text {
  text-shadow: 0 0 5px rgba(249, 115, 22, 0.8);
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
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    transform: translateY(-50px);
    opacity: 0;
  }
}

.animate-float-up {
  animation: float-up 2s ease-out forwards;
}

.animate-level-up {
  animation: levelUp 0.6s ease-out;
}

@keyframes levelUp {
  0% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); filter: brightness(1.5); }
  100% { transform: scaleY(1); }
}
</style>