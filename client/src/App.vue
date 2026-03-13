<script setup>
import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();
</script>

<template>
  <div
    class="min-h-screen bg-warm-100 dark:bg-dark-bg-900 transition-colors neon-grid-bg"
  >
    <router-view />
  </div>
</template>
