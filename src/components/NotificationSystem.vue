<template>
  <div class="notification-container">
    <TransitionGroup name="notification">
      <div 
        v-for="notification in notifications" 
        :key="notification.id" 
        :class="['notification', notification.type]"
      >
        <div class="notification-content">
          <span class="message">{{ notification.message }}</span>
          <button class="close-btn" @click="removeNotification(notification.id)">×</button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

const notifications = computed(() => gameStore.notifications);

function removeNotification(id) {
  gameStore.removeNotification(id);
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
}

.notification {
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  cursor: default;
  animation: slideIn 0.3s ease-out;
}

.notification-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.message {
  flex-grow: 1;
  margin-right: 8px;
  font-size: 14px;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.success {
  background-color: #4caf50;
  color: white;
}

.error {
  background-color: #f44336;
  color: white;
}

.info {
  background-color: #2196f3;
  color: white;
}

/* Transition effects */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes slideIn {
  from {
    transform: translateX(30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>