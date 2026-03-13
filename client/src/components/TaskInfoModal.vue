<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessionStore } from '../stores/session';
import APIService from '../services/api';
import { getTagColorClasses, getTagForTask } from './taskTags';

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  tags: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close']);

const sessionStore = useSessionStore();
const comments = ref([]);
const loadingComments = ref(false);

const metadata = computed(() => props.task?.metadata);
const originalRow = computed(() => metadata.value?.originalRow);

const taskTag = computed(() => getTagForTask(props.task, props.tags));
const tagColors = computed(() =>
  taskTag.value ? getTagColorClasses(taskTag.value.color) : null
);

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
  if (p.includes('high')) return 'bg-red-500 dark:bg-accent-red';
  if (p.includes('medium')) return 'bg-yellow-500 dark:bg-accent-yellow';
  return 'bg-green-500 dark:bg-accent-green';
}

onMounted(async () => {
  if (sessionStore.roomCode) {
    loadingComments.value = true;
    try {
      comments.value = await APIService.getTaskComments(
        sessionStore.roomCode,
        props.task.id
      );
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      loadingComments.value = false;
    }
  }
});

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="emit('close')"
  >
    <div
      class="bg-warm-50 dark:glass-panel-solid rounded-lg shadow-xl dark:shadow-card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto warm-glow-border"
    >
      <!-- Header -->
      <div
        class="sticky top-0 px-6 py-4 border-b border-warm-300 dark:border-white/10 bg-warm-50 dark:bg-dark-bg-800 flex items-center justify-between"
      >
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          Task Details
        </h2>
        <button
          @click="emit('close')"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-accent-cyan text-2xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Title + Tag -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
              {{ task.title || 'Untitled Task' }}
            </h3>
            <span
              v-if="taskTag"
              :class="[
                'px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1',
                tagColors.pill,
              ]"
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="tagColors.dot"
              ></span>
              {{ taskTag.name }}
            </span>
          </div>
          <p
            v-if="task.display_id || task.id"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            ID:
            <span class="font-mono dark:accent-text-primary">{{
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
              class="flex gap-3 pb-3 border-b border-warm-300 dark:border-white/10 last:border-0"
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
          class="p-4 bg-warm-100 dark:bg-dark-bg-700 rounded-lg text-center"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">
            No additional metadata available for this task
          </p>
        </div>

        <!-- Comments Section -->
        <div>
          <h4
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            Comments
          </h4>
          <div v-if="loadingComments" class="text-center py-2">
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Loading comments...
            </p>
          </div>
          <div v-else-if="comments.length === 0" class="text-center py-2">
            <p class="text-sm text-gray-400 dark:text-gray-500">
              No comments yet
            </p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="bg-warm-100 dark:bg-dark-bg-700/50 rounded-lg px-3 py-2"
            >
              <div class="flex items-center justify-between mb-1">
                <span
                  class="text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {{ comment.user_name }}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  {{ formatTime(comment.created_at) }}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ comment.content }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="sticky bottom-0 px-6 py-4 border-t border-warm-300 dark:border-white/10 bg-warm-100 dark:bg-dark-bg-800 flex justify-end"
      >
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-warm-300 dark:bg-white/10 text-gray-800 dark:text-white rounded-lg hover:bg-warm-400 dark:hover:bg-white/20 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
