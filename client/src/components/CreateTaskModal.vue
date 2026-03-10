<script setup>
import { ref } from 'vue';
import APIService from '../services/api';

const props = defineProps({
  roomCode: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['taskCreated', 'close']);

const issueKey = ref('');
const title = ref('');
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  if (!issueKey.value.trim()) {
    error.value = 'Issue key is required';
    return;
  }
  if (!title.value.trim()) {
    error.value = 'Task title is required';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await APIService.createTask(
      props.roomCode,
      issueKey.value,
      title.value
    );

    if (result.success && result.task) {
      emit('taskCreated', result.task);
      issueKey.value = '';
      title.value = '';
      emit('close');
    }
  } catch (err) {
    error.value = err.message || 'Failed to create task';
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="emit('close')"
  >
    <div
      class="bg-warm-50 dark:glass-panel-solid rounded-lg shadow-xl dark:shadow-card max-w-md w-full mx-4 warm-glow-border"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-warm-300 dark:border-white/10 flex items-center justify-between"
      >
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          Create New Task
        </h2>
        <button
          @click="emit('close')"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-accent-cyan text-2xl leading-none transition-colors"
          :disabled="loading"
        >
          ×
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Issue Key Field -->
        <div>
          <label
            for="issue-key"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Issue Key
            <span class="text-red-500 dark:text-accent-red ml-1">*</span>
          </label>
          <input
            type="text"
            id="issue-key"
            v-model="issueKey"
            @input="issueKey = issueKey.toUpperCase()"
            placeholder="e.g., PROJ-1"
            class="w-full px-4 py-2 border border-warm-400 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent-cyan focus:border-transparent dark:bg-dark-bg-700 dark:text-white font-mono dark:placeholder-gray-500"
            maxlength="20"
            :disabled="loading"
            autofocus
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ issueKey.length }}/20
          </p>
        </div>

        <!-- Title Field -->
        <div>
          <label
            for="task-title"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Task Title
            <span class="text-red-500 dark:text-accent-red ml-1">*</span>
          </label>
          <input
            type="text"
            id="task-title"
            v-model="title"
            placeholder="Enter task title"
            class="w-full px-4 py-2 border border-warm-400 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent-cyan focus:border-transparent dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-500"
            maxlength="200"
            :disabled="loading"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ title.length }}/200
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg"
        >
          <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="emit('close')"
            :disabled="loading"
            class="flex-1 px-4 py-2 border border-warm-400 dark:border-white/20 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-warm-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading || !issueKey.trim() || !title.trim()"
            class="flex-1 px-4 py-2 rounded-lg transition-all disabled:cursor-not-allowed font-medium cursor-pointer btn-gradient-primary"
          >
            {{ loading ? 'Creating...' : 'Create Task' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
