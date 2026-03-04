<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps({
  turnStartedAt: {
    type: String,
    default: null,
  },
});

const elapsed = ref(0);
let intervalId = null;

function startTimer() {
  stopTimer();
  if (!props.turnStartedAt) return;

  const updateElapsed = () => {
    const start = new Date(props.turnStartedAt).getTime();
    elapsed.value = Math.max(0, Math.floor((Date.now() - start) / 1000));
  };

  updateElapsed();
  intervalId = setInterval(updateElapsed, 1000);
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

watch(
  () => props.turnStartedAt,
  () => startTimer(),
  { immediate: true }
);

onUnmounted(() => stopTimer());

const formattedTime = computed(() => {
  const minutes = Math.floor(elapsed.value / 60);
  const seconds = elapsed.value % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});
</script>

<template>
  <span
    v-if="turnStartedAt"
    class="inline-flex items-center gap-1 text-sm font-mono text-gray-600 dark:text-gray-300"
  >
    <span class="hourglass-pulse">&#9203;</span>
    {{ formattedTime }}
  </span>
</template>

<style scoped>
.hourglass-pulse {
  display: inline-block;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
