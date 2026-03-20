<script setup>
import { ref, computed, onUnmounted } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  zoneId: {
    type: String,
    default: 'new-column',
  },
  expand: {
    type: Boolean,
    default: false,
  },
  indicatorPosition: {
    type: String,
    default: 'center',
  },
});

const emit = defineEmits(['taskDropped']);

// Drop zone starts locked — only accepts drops after a short hover delay
// to prevent accidental column creation when dragging past quickly.
const activated = ref(false);
let hoverTimer = null;
// Counter tracks nested dragenter/dragleave events from child elements.
// dragenter fires when entering a child, dragleave fires when leaving the parent
// into that child — the counter ensures we only deactivate when truly leaving.
let enterCount = 0;

const groupConfig = computed(() => ({
  name: 'tasks',
  put: activated.value,
  pull: false,
}));

function onHoverStart() {
  enterCount++;
  if (hoverTimer) return;
  hoverTimer = setTimeout(() => {
    activated.value = true;
  }, 100);
}

function onHoverEnd() {
  enterCount--;
  if (enterCount > 0) return;
  enterCount = 0;
  clearTimeout(hoverTimer);
  hoverTimer = null;
  activated.value = false;
}

onUnmounted(() => {
  clearTimeout(hoverTimer);
  enterCount = 0;
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
  <div
    :class="[
      expand
        ? 'flex-shrink-0 min-h-[500px] min-w-[80px] flex-grow relative'
        : 'flex-shrink-0 min-h-[500px] w-20 relative',
    ]"
  >
    <!-- Visual indicator layer -->
    <div
      :class="[
        'absolute flex items-center justify-center pointer-events-none transition-all duration-150',
        indicatorPosition === 'center' ? 'inset-y-0 inset-x-3' : '',
        indicatorPosition === 'left' ? 'inset-y-0 left-0 w-20' : '',
        indicatorPosition === 'right' ? 'inset-y-0 right-0 w-20' : '',
        activated
          ? 'rounded-lg border-2 border-dashed border-blue-500 bg-blue-100/80 dark:border-accent-cyan/60 dark:bg-accent-cyan/15'
          : '',
      ]"
    >
      <div
        v-if="!activated && !expand"
        class="w-0.5 h-full rounded-full bg-gray-300 dark:bg-white/15"
      ></div>
      <span
        v-else
        class="text-2xl text-blue-500 dark:text-accent-cyan select-none"
        >+</span
      >
    </div>

    <!-- Invisible drop target layer — fills full hitbox, handles all drag interaction.
         overflow-hidden prevents the ghost card from affecting layout. -->
    <draggable
      :model-value="items"
      :group="groupConfig"
      item-key="id"
      class="absolute inset-0 overflow-hidden opacity-0"
      @change="onDragChange"
      @dragenter="onHoverStart"
      @dragleave="onHoverEnd"
    >
      <template #item="{ element }">
        <div></div>
      </template>
    </draggable>
  </div>
</template>
