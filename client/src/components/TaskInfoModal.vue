<script setup>
import { computed } from 'vue';

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close']);

const metadata = computed(() => props.task?.metadata);
const originalRow = computed(() => metadata.value?.originalRow);

const fields = computed(() => {
  if (!originalRow.value) return [];
  return Object.keys(originalRow.value)
    .filter((key) => {
      const value = originalRow.value[key];
      return value && (typeof value === 'string' ? value.trim() : value);
    })
    .sort();
});

function priorityColor(priority) {
  const p = String(priority).toLowerCase();
  if (p.includes('high')) return 'bg-red-500';
  if (p.includes('medium')) return 'bg-yellow-500';
  return 'bg-green-500';
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="emit('close')"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div
        class="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between"
      >
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          Task Details
        </h2>
        <button
          @click="emit('close')"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Title -->
        <div>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {{ task.title || 'Untitled Task' }}
          </h3>
          <p
            v-if="task.display_id || task.id"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            ID:
            <span class="font-mono">{{
              String(task.display_id || task.id)
            }}</span>
          </p>
        </div>

        <!-- Description -->
        <div v-if="task.description">
          <h4
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Description
          </h4>
          <p
            class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap"
          >
            {{ task.description }}
          </p>
        </div>

        <!-- Key Metadata -->
        <div
          v-if="
            metadata &&
            (metadata.issueType || metadata.priority || metadata.status)
          "
          class="grid grid-cols-3 gap-4"
        >
          <div v-if="metadata.issueType">
            <h4
              class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase"
            >
              Type
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ String(metadata.issueType) }}
            </p>
          </div>
          <div v-if="metadata.priority">
            <h4
              class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase"
            >
              Priority
            </h4>
            <div class="flex items-center gap-1">
              <span
                class="inline-block w-2 h-2 rounded-full"
                :class="priorityColor(metadata.priority)"
              ></span>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ String(metadata.priority) }}
              </p>
            </div>
          </div>
          <div v-if="metadata.status">
            <h4
              class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase"
            >
              Status
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ String(metadata.status) }}
            </p>
          </div>
        </div>

        <!-- Additional Fields -->
        <div v-if="fields.length > 0">
          <h4
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            Additional Metadata
          </h4>
          <div class="space-y-3">
            <div
              v-for="key in fields"
              :key="key"
              class="flex gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
            >
              <div
                class="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[120px] break-words"
              >
                {{ String(key) }}
              </div>
              <div
                class="text-sm text-gray-600 dark:text-gray-400 flex-1 break-words"
              >
                {{ String(originalRow[key]) }}
              </div>
            </div>
          </div>
        </div>

        <!-- No metadata message -->
        <div
          v-if="
            fields.length === 0 &&
            (!metadata ||
              (!metadata.issueType && !metadata.priority && !metadata.status))
          "
          class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">
            No additional metadata available for this task
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end"
      >
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
