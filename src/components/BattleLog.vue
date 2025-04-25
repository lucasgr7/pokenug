<template>
  <div class="bg-gray-800 text-white p-4 rounded-lg mt-4 h-48 overflow-y-auto" ref="logContainer">
    <div v-for="(log, index) in logs" :key="index" 
         :class="{'text-red-400': log.type === 'damage', 'text-green-400': log.type === 'heal', 'text-yellow-400': log.type === 'system'}"
    >
      {{ log.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface LogMessage {
  message: string;
  type: 'damage' | 'heal' | 'system';
}

const props = defineProps<{
  logs: LogMessage[];
}>()

const logContainer = ref<HTMLElement | null>(null)

// Auto scroll to bottom when new logs are added
watch(() => props.logs.length, () => {
  setTimeout(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }, 0)
})

// Initial scroll to bottom
onMounted(() => {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})
</script>