<script setup>
import { ref, computed, onUnmounted } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  zoneId: {
    type: String,
    default: 'new-column',
  },
  isFirst: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['taskDropped']);

const widthClass = computed(() =>
  props.isFirst ? 'min-w-[50px]' : 'min-w-[20px]'
);

// Drop zone starts locked — only accepts drops after hover delay
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

// Empty list for the drop zone
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
      'rounded-lg flex-shrink-0 min-h-[500px] border-2 border-dashed flex items-center justify-center text-center transition-all duration-300 ease-out',
      activated
        ? 'min-w-[120px] border-blue-500 bg-blue-100 dark:border-accent-cyan/60 dark:bg-accent-cyan/15'
        : [
            widthClass,
            'border-blue-400/50 bg-blue-50/40 dark:border-accent-cyan/20 dark:bg-accent-cyan/5',
          ],
    ]"
    ghost-class="opacity-0"
    @change="onDragChange"
    @dragenter.native="onHoverStart"
    @dragleave.native="onHoverEnd"
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
