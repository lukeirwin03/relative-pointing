import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(
    (() => {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    })()
  );

  const isChristmas = ref(
    (() => {
      const saved = localStorage.getItem('christmasMode');
      if (saved !== null) return saved === 'true';
      return new Date().getMonth() === 11;
    })()
  );

  // Sync dark mode to DOM + localStorage
  watch(
    isDark,
    (val) => {
      if (val) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    },
    { immediate: true }
  );

  watch(isChristmas, (val) => {
    localStorage.setItem('christmasMode', val.toString());
  });

  function toggleTheme() {
    isDark.value = !isDark.value;
  }

  function toggleChristmas() {
    isChristmas.value = !isChristmas.value;
  }

  return { isDark, isChristmas, toggleTheme, toggleChristmas };
});
