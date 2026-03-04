<script setup>
import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <router-view />
  </div>
</template>
