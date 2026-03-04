<script setup>
import { version } from '../../package.json';

defineProps({
  class: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <span :class="['text-xs text-gray-400 dark:text-gray-500', $props.class]">
    v{{ version }}
  </span>
</template>
