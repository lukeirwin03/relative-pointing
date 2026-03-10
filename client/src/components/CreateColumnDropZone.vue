<script setup>
import { ref, computed, onUnmounted } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  zoneId: {
    type: String,
    default: 'new-column',
  },
});

const emit = defineEmits(['taskDropped']);

// Drop zone starts locked — only accepts drops after a short hover delay
// to prevent accidental column creation when dragging past quickly.
const activated = ref(false);
let hoverTimer = null;

const groupConfig = computed(() => ({
  name: 'tasks',
  put: activated.value,
  pull: false,
}));

function onHoverStart() {
  if (hoverTimer) return;
  hoverTimer = setTimeout(() => {
    activated.value = true;
  }, 100);
}

function onHoverEnd() {
  clearTimeout(hoverTimer);
  hoverTimer = null;
  activated.value = false;
}

onUnmounted(() => {
  clearTimeout(hoverTimer);
});

// Empty list — drop zone never holds items itself
const items = computed({
  get: () => [],
  set: () => {},
});

function onDragChange(evt) {
  if (evt.added) {
    emit('taskDropped', {
      task: evt.added.element,
      zoneId: props.zoneId,
    });
    activated.value = false;
  }
}
</script>

<template>
  <draggable
    :model-value="items"
    :group="groupConfig"
    item-key="id"
    :class="[
      'rounded-lg flex-shrink-0 min-h-[500px] border-2 border-dashed flex items-center justify-center text-center transition-colors transition-opacity duration-150',
      activated
        ? 'min-w-[120px] border-blue-500 bg-blue-100 dark:border-accent-cyan/60 dark:bg-accent-cyan/15 opacity-100'
        : 'min-w-[50px] border-gray-300/60 dark:border-white/10 opacity-60',
    ]"
    ghost-class="opacity-0"
    @change="onDragChange"
    @dragenter="onHoverStart"
    @dragleave="onHoverEnd"
  >
    <template #header>
      <div
        v-if="activated"
        class="pointer-events-none select-none flex flex-col items-center gap-2 text-blue-500 dark:text-accent-cyan animate-fade-in"
      >
        <span class="text-3xl">+</span>
        <span class="text-xs font-semibold uppercase tracking-wide"
          >New Column</span
        >
      </div>
    </template>
    <template #item="{ element }">
      <div></div>
    </template>
  </draggable>
</template>
