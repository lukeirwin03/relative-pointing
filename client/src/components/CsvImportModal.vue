<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
  },
  fileName: {
    type: String,
    default: '',
  },
  skippedRows: {
    type: Number,
    default: 0,
  },
  jiraBaseUrl: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['confirm', 'close']);

const selectedIds = ref(new Set(props.tasks.map((_, i) => i)));
const loading = ref(false);

const allSelected = computed(
  () => selectedIds.value.size === props.tasks.length
);
const noneSelected = computed(() => selectedIds.value.size === 0);
const selectedCount = computed(() => selectedIds.value.size);

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(props.tasks.map((_, i) => i));
  }
}

function toggleTask(index) {
  const next = new Set(selectedIds.value);
  if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  selectedIds.value = next;
}

async function handleImport() {
  loading.value = true;
  const selected = props.tasks.filter((_, i) => selectedIds.value.has(i));
  emit('confirm', selected, props.jiraBaseUrl);
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="emit('close')"
  >
    <div
      class="bg-warm-50 dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 flex flex-col max-h-[85vh] warm-glow-border"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-warm-300 dark:border-gray-700 flex items-center justify-between flex-shrink-0"
      >
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white">
            Import Tasks
          </h2>
          <span
            class="px-2 py-0.5 bg-warm-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full font-mono"
          >
            {{ fileName }}
          </span>
        </div>
        <button
          @click="emit('close')"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
          :disabled="loading"
        >
          ×
        </button>
      </div>

      <!-- Warning banner for skipped rows -->
      <div
        v-if="skippedRows > 0"
        class="mx-6 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2"
      >
        <svg
          class="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          {{ skippedRows }} row{{ skippedRows === 1 ? ' was' : 's were' }}
          skipped due to missing data
        </p>
      </div>

      <!-- Task table -->
      <div class="px-6 py-4 overflow-y-auto flex-1 min-h-0">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-warm-50 dark:bg-gray-800">
            <tr
              class="border-b border-warm-300 dark:border-gray-700 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              <th class="pb-2 pr-2 w-8">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="!allSelected && !noneSelected"
                  @change="toggleAll"
                  class="rounded border-warm-400 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  :disabled="loading"
                />
              </th>
              <th class="pb-2 pr-3">Key</th>
              <th class="pb-2 pr-3">Title</th>
              <th class="pb-2 pr-3 hidden sm:table-cell">Type</th>
              <th class="pb-2 pr-3 hidden sm:table-cell">Priority</th>
              <th class="pb-2 hidden md:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(task, index) in tasks"
              :key="index"
              class="border-b border-gray-100 dark:border-gray-700/50 transition-opacity"
              :class="{ 'opacity-40': !selectedIds.has(index) }"
            >
              <td class="py-2 pr-2">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(index)"
                  @change="toggleTask(index)"
                  class="rounded border-warm-400 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  :disabled="loading"
                />
              </td>
              <td
                class="py-2 pr-3 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap"
              >
                {{ task.jiraKey }}
              </td>
              <td
                class="py-2 pr-3 text-gray-800 dark:text-gray-200 max-w-xs truncate"
              >
                {{ task.title }}
              </td>
              <td
                class="py-2 pr-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell"
              >
                {{ task.issueType || '-' }}
              </td>
              <td
                class="py-2 pr-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell"
              >
                {{ task.priority || '-' }}
              </td>
              <td
                class="py-2 text-gray-500 dark:text-gray-400 hidden md:table-cell"
              >
                {{ task.status || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-warm-300 dark:border-gray-700 flex items-center justify-between flex-shrink-0"
      >
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ selectedCount }} of {{ tasks.length }} task{{
            tasks.length === 1 ? '' : 's'
          }}
          selected
        </span>
        <div class="flex gap-3">
          <button
            type="button"
            @click="emit('close')"
            :disabled="loading"
            class="px-4 py-2 border border-warm-400 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-warm-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleImport"
            :disabled="loading || noneSelected"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] btn-gradient-primary"
          >
            {{
              loading
                ? 'Importing...'
                : `Import ${selectedCount} Task${selectedCount === 1 ? '' : 's'}`
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
