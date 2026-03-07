<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useUserStore } from '../stores/user';
import APIService from '../services/api';
import Version from './Version.vue';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const userName = ref('');
const roomCode = ref('');
const mode = ref('create');
const loading = ref(false);
const error = ref(null);

// Pre-fill join form if redirected from a shared link
if (route.query.join) {
  roomCode.value = route.query.join;
  mode.value = 'join';
}

async function handleCreateSession() {
  if (!userName.value.trim()) {
    error.value = 'Please enter your name';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const userId = userStore.userId || uuidv4();
    const result = await APIService.createSession(
      userId,
      userName.value.trim()
    );

    userStore.login(userId, userName.value.trim());
    router.push(`/session/${result.roomCode}`);
  } catch (err) {
    console.error('Error creating session:', err);
    error.value = 'Failed to create session. Please try again.';
    loading.value = false;
  }
}

async function handleJoinSession() {
  if (!userName.value.trim()) {
    error.value = 'Please enter your name';
    return;
  }

  if (!roomCode.value.trim()) {
    error.value = 'Please enter a room code';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const userId = userStore.userId || uuidv4();
    const code = roomCode.value.toLowerCase();

    await APIService.joinSession(code, userId, userName.value.trim());

    userStore.login(userId, userName.value.trim());
    router.push(`/session/${code}`);
  } catch (err) {
    console.error('Error joining session:', err);
    error.value = err.message || 'Failed to join session. Check the room code.';
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="flex items-center justify-center min-h-screen bg-gradient-to-br from-warm-100 to-warm-200 dark:from-dark-bg-900 dark:to-dark-bg-800 relative neon-grid-bg"
  >
    <div class="absolute bottom-4 right-4">
      <Version />
    </div>
    <div
      class="bg-warm-50 dark:glass-panel-solid p-8 rounded-lg shadow-lg dark:shadow-card max-w-md w-full warm-glow-border"
    >
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        Relative Pointing
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        Collaborative story pointing for Scrum teams
      </p>

      <!-- Tab buttons -->
      <div class="flex gap-2 mb-6">
        <button
          type="button"
          @click="mode = 'create'"
          :class="[
            'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
            mode === 'create'
              ? 'bg-blue-600 text-white btn-gradient-primary'
              : 'bg-warm-200 dark:bg-white/5 text-gray-700 dark:text-gray-400 hover:bg-warm-300 dark:hover:bg-white/10',
          ]"
        >
          Create Session
        </button>
        <button
          type="button"
          @click="mode = 'join'"
          :class="[
            'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
            mode === 'join'
              ? 'bg-blue-600 text-white btn-gradient-primary'
              : 'bg-warm-200 dark:bg-white/5 text-gray-700 dark:text-gray-400 hover:bg-warm-300 dark:hover:bg-white/10',
          ]"
        >
          Join Session
        </button>
      </div>

      <!-- Create form -->
      <form v-if="mode === 'create'" @submit.prevent="handleCreateSession">
        <div class="mb-4">
          <label
            for="userName"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Your Name
          </label>
          <input
            type="text"
            id="userName"
            v-model="userName"
            class="w-full px-4 py-2 border border-warm-400 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent-cyan focus:border-transparent dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-500"
            placeholder="Enter your name"
            maxlength="50"
            :disabled="loading"
            autofocus
          />
        </div>

        <div
          v-if="error"
          class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg"
        >
          <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading || !userName.trim()"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed font-medium btn-gradient-primary"
        >
          {{ loading ? 'Creating Session...' : 'Create New Session' }}
        </button>
      </form>

      <!-- Join form -->
      <form v-else @submit.prevent="handleJoinSession">
        <div class="mb-4">
          <label
            for="userName-join"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Your Name
          </label>
          <input
            type="text"
            id="userName-join"
            v-model="userName"
            class="w-full px-4 py-2 border border-warm-400 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent-cyan focus:border-transparent dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-500"
            placeholder="Enter your name"
            maxlength="50"
            :disabled="loading"
            autofocus
          />
        </div>

        <div class="mb-4">
          <label
            for="roomCode"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Room Code
          </label>
          <input
            type="text"
            id="roomCode"
            v-model="roomCode"
            @input="roomCode = roomCode.toLowerCase()"
            class="w-full px-4 py-2 border border-warm-400 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent-cyan focus:border-transparent dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-500"
            placeholder="Enter room code"
            :disabled="loading"
          />
        </div>

        <div
          v-if="error"
          class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg"
        >
          <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading || !userName.trim() || !roomCode.trim()"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed font-medium btn-gradient-primary"
        >
          {{ loading ? 'Joining...' : 'Join Session' }}
        </button>
      </form>
    </div>
  </div>
</template>
