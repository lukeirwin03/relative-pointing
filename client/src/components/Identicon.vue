<script setup>
import { computed } from 'vue';
import { generateIdenticon } from '../utils/identicon';

const props = defineProps({
  seed: {
    type: String,
    required: true,
  },
});

const identicon = computed(() => generateIdenticon(props.seed));
const cellSize = computed(() => 100 / identicon.value.grid);
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <rect width="100" height="100" fill="white" />
    <template v-for="(row, y) in identicon.cells" :key="y">
      <template v-for="(filled, x) in row" :key="x">
        <rect
          v-if="filled"
          :x="x * cellSize"
          :y="y * cellSize"
          :width="cellSize"
          :height="cellSize"
          :fill="identicon.color"
        />
      </template>
    </template>
  </svg>
</template>
