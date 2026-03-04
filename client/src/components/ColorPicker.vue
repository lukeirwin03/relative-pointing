<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { COLOR_OPTIONS } from './taskColors';

defineProps({
  currentColor: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['selectColor', 'close']);

const popoverRef = ref(null);

function handleClickOutside(event) {
  if (popoverRef.value && !popoverRef.value.contains(event.target)) {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div
    ref="popoverRef"
    class="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-2 z-50"
    @pointerdown.stop
  >
    <div class="flex gap-1">
      <button
        v-for="color in COLOR_OPTIONS"
        :key="color.id || 'none'"
        @click.prevent.stop="
          emit('selectColor', color.id);
          emit('close');
        "
        class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
        :class="[
          color.dot || 'bg-gray-200 dark:bg-gray-600',
          currentColor === color.id ? 'ring-2 ring-offset-1 ring-gray-400' : '',
          color.id === null
            ? 'border-gray-400 dark:border-gray-500'
            : 'border-transparent',
        ]"
        :title="color.name"
      />
    </div>
  </div>
</template>
