import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const userId = ref(localStorage.getItem('userId') || null);
  const userName = ref(localStorage.getItem('userName') || null);

  const isLoggedIn = computed(() => !!(userId.value && userName.value));
  const currentUser = computed(() =>
    isLoggedIn.value ? { id: userId.value, name: userName.value } : null
  );

  function login(id, name) {
    userId.value = id;
    userName.value = name;
    localStorage.setItem('userId', id);
    localStorage.setItem('userName', name);
  }

  function logout() {
    userId.value = null;
    userName.value = null;
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  }

  return { userId, userName, isLoggedIn, currentUser, login, logout };
});
