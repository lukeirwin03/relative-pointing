<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useThemeStore } from '../stores/theme';
import APIService from '../services/api';
import Version from './Version.vue';

const route = useRoute();
const router = useRouter();
const themeStore = useThemeStore();

const roomCode = computed(() => route.params.roomCode);
const loading = ref(true);
const error = ref(null);

const session = ref(null);
const participants = ref([]);
const columns = ref([]);
const tasks = ref([]);
const tags = ref([]);
const selectedScale = ref('fibonacci');

const userId = localStorage.getItem('userId');
const isCreator = computed(() => userId === session.value?.creator_id);

const SCALE_OPTIONS = [
  { value: 'fibonacci', label: 'Fibonacci (1, 2, 3, 5, 8, 13...)' },
  { value: 'powers_of_2', label: 'Powers of 2 (1, 2, 4, 8, 16...)' },
  { value: 'tshirt', label: 'T-Shirt (1, 2, 3, 5, 8, 13)' },
  { value: 'linear', label: 'Linear (1, 2, 3, 4, 5...)' },
];

const sortedColumns = computed(() =>
  [...columns.value].sort(
    (a, b) => (a.column_order || 0) - (b.column_order || 0)
  )
);

const unsortedTasks = computed(() =>
  tasks.value.filter((t) => t.column_id === 'unsorted' || !t.column_id)
);

function tasksForColumn(columnId) {
  return tasks.value.filter((t) => t.column_id === columnId);
}

function getTagForTask(task) {
  if (!task.tag_id) return null;
  return tags.value.find((t) => t.id === task.tag_id);
}

const sessionDuration = computed(() => {
  if (!session.value?.created_at || !session.value?.ended_at) return '';
  const start = new Date(session.value.created_at + 'Z');
  const end = new Date(session.value.ended_at + 'Z');
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
});

const totalPoints = computed(() => {
  let total = 0;
  for (const col of sortedColumns.value) {
    const count = tasksForColumn(col.id).length;
    total += (col.point_value || 0) * count;
  }
  return total;
});

const tasksPointed = computed(() => {
  return tasks.value.filter((t) => t.column_id && t.column_id !== 'unsorted')
    .length;
});

async function fetchReport() {
  try {
    const data = await APIService.getReport(roomCode.value);
    session.value = data.session;
    participants.value = data.participants || [];
    columns.value = data.columns || [];
    tasks.value = data.tasks || [];
    tags.value = data.tags || [];
    error.value = null;
  } catch (err) {
    error.value = err.message || 'Failed to load report';
  } finally {
    loading.value = false;
  }
}

async function handleApplyScale() {
  try {
    const result = await APIService.applyScale(
      roomCode.value,
      userId,
      selectedScale.value
    );
    if (result.columns) {
      columns.value = result.columns;
    }
  } catch (err) {
    console.error('Error applying scale:', err);
  }
}

async function handlePointValueChange(columnId, value) {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return;

  // Optimistic update
  columns.value = columns.value.map((c) =>
    c.id === columnId ? { ...c, point_value: numValue } : c
  );

  try {
    await APIService.updateColumnPointValue(
      roomCode.value,
      columnId,
      userId,
      numValue
    );
  } catch (err) {
    console.error('Error updating point value:', err);
    await fetchReport();
  }
}

const TAG_COLORS = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-800 dark:text-green-200',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-800 dark:text-red-200',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-800 dark:text-blue-200',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-800 dark:text-purple-200',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    text: 'text-pink-800 dark:text-pink-200',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-800 dark:text-orange-200',
  },
};

function tagClasses(tag) {
  const colors = TAG_COLORS[tag.color] || TAG_COLORS.blue;
  return `${colors.bg} ${colors.text}`;
}

onMounted(fetchReport);
</script>

<template>
  <!-- Loading -->
  <div
    v-if="loading"
    class="flex items-center justify-center min-h-screen bg-warm-100 dark:bg-dark-bg-900"
  >
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-accent-cyan mx-auto mb-4"
      ></div>
      <p class="text-gray-600 dark:text-gray-400">Loading report...</p>
    </div>
  </div>

  <!-- Error -->
  <div
    v-else-if="error"
    class="flex items-center justify-center min-h-screen bg-warm-100 dark:bg-dark-bg-900"
  >
    <div class="text-center">
      <p class="text-xl text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <router-link
        to="/"
        class="text-blue-600 dark:accent-text-primary hover:underline"
      >
        Go Home
      </router-link>
    </div>
  </div>

  <!-- Report -->
  <div
    v-else
    class="min-h-screen bg-warm-100 dark:bg-dark-bg-900 transition-colors"
  >
    <!-- Header -->
    <header
      class="bg-warm-50 dark:glass-panel-solid shadow-sm border-b border-warm-300 dark:border-white/10"
    >
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="router.push('/')"
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-accent-cyan text-2xl transition-colors"
              title="Go to home"
            >
              ←
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
                Session Report <Version class="ml-2" />
              </h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Room:
                <span
                  class="font-mono font-semibold dark:accent-text-primary"
                  >{{ roomCode }}</span
                >
                <span v-if="sessionDuration" class="ml-3">
                  Duration: {{ sessionDuration }}
                </span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="themeStore.toggleTheme()"
              class="p-2 rounded-lg hover:bg-warm-200 dark:hover:bg-white/5 transition-colors"
            >
              {{ themeStore.isDark ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <!-- Scale Controls (leader only) -->
      <div
        v-if="isCreator"
        class="bg-warm-50 dark:bg-dark-bg-800/60 rounded-xl border border-warm-300 dark:border-white/10 p-4"
      >
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Point Scale
        </h2>
        <div class="flex items-center gap-3 flex-wrap">
          <select
            v-model="selectedScale"
            class="px-3 py-2 border border-warm-400 dark:border-white/20 rounded-lg text-sm bg-warm-50 dark:bg-dark-bg-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent-cyan"
          >
            <option
              v-for="option in SCALE_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <button
            @click="handleApplyScale"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium btn-gradient-primary"
          >
            Apply Scale
          </button>
        </div>
      </div>

      <!-- Columns Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="column in sortedColumns"
          :key="column.id"
          class="bg-warm-50 dark:bg-dark-bg-800/60 rounded-xl border border-warm-300 dark:border-white/10 overflow-hidden"
        >
          <!-- Column Header -->
          <div
            class="px-4 py-3 border-b border-warm-300 dark:border-white/10 bg-warm-100 dark:bg-dark-bg-700/50"
          >
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800 dark:text-white">
                {{ column.name }}
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ tasksForColumn(column.id).length }} task{{
                    tasksForColumn(column.id).length !== 1 ? 's' : ''
                  }}
                </span>
              </div>
            </div>
            <div class="mt-2 flex items-center gap-2">
              <label class="text-xs text-gray-500 dark:text-gray-400">
                Points:
              </label>
              <input
                v-if="isCreator"
                type="number"
                :value="column.point_value"
                @change="handlePointValueChange(column.id, $event.target.value)"
                class="w-20 px-2 py-1 text-sm border border-warm-400 dark:border-white/20 rounded bg-warm-50 dark:bg-dark-bg-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500 dark:focus:ring-accent-cyan"
                step="any"
              />
              <span
                v-else
                class="text-sm font-semibold text-blue-600 dark:accent-text-primary"
              >
                {{ column.point_value ?? '—' }}
              </span>
            </div>
          </div>

          <!-- Tasks in Column -->
          <div class="p-3 space-y-2">
            <div
              v-for="task in tasksForColumn(column.id)"
              :key="task.id"
              class="p-3 bg-warm-100 dark:bg-dark-bg-700/50 rounded-lg border border-warm-200 dark:border-white/5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p
                    class="text-sm font-medium text-gray-800 dark:text-white truncate"
                  >
                    {{ task.title }}
                  </p>
                  <p
                    v-if="task.jira_key"
                    class="text-xs text-gray-500 dark:text-gray-400 font-mono"
                  >
                    {{ task.jira_key }}
                  </p>
                </div>
                <span
                  v-if="getTagForTask(task)"
                  :class="[
                    'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                    tagClasses(getTagForTask(task)),
                  ]"
                >
                  {{ getTagForTask(task).name }}
                </span>
              </div>
              <p
                v-if="task.description"
                class="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2"
              >
                {{ task.description }}
              </p>
              <!-- Comments -->
              <div
                v-if="task.comments && task.comments.length > 0"
                class="mt-2 space-y-1 border-t border-warm-300 dark:border-white/10 pt-2"
              >
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Comments ({{ task.comments.length }})
                </p>
                <div
                  v-for="comment in task.comments"
                  :key="comment.id"
                  class="text-xs text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-warm-400 dark:border-white/20"
                >
                  <span class="font-medium">{{ comment.user_name }}:</span>
                  {{ comment.content }}
                </div>
              </div>
            </div>
            <p
              v-if="tasksForColumn(column.id).length === 0"
              class="text-sm text-gray-400 dark:text-gray-500 text-center py-2"
            >
              No tasks
            </p>
          </div>
        </div>
      </div>

      <!-- Unsorted Tasks -->
      <div
        v-if="unsortedTasks.length > 0"
        class="bg-warm-50 dark:bg-dark-bg-800/60 rounded-xl border border-warm-300 dark:border-white/10 overflow-hidden"
      >
        <div
          class="px-4 py-3 border-b border-warm-300 dark:border-white/10 bg-warm-100 dark:bg-dark-bg-700/50"
        >
          <h3 class="font-semibold text-gray-800 dark:text-white">
            Unsorted Tasks
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ unsortedTasks.length }} task{{
              unsortedTasks.length !== 1 ? 's' : ''
            }}
            not assigned to a column
          </p>
        </div>
        <div class="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div
            v-for="task in unsortedTasks"
            :key="task.id"
            class="p-3 bg-warm-100 dark:bg-dark-bg-700/50 rounded-lg border border-warm-200 dark:border-white/5"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-medium text-gray-800 dark:text-white truncate"
                >
                  {{ task.title }}
                </p>
                <p
                  v-if="task.jira_key"
                  class="text-xs text-gray-500 dark:text-gray-400 font-mono"
                >
                  {{ task.jira_key }}
                </p>
              </div>
              <span
                v-if="getTagForTask(task)"
                :class="[
                  'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                  tagClasses(getTagForTask(task)),
                ]"
              >
                {{ getTagForTask(task).name }}
              </span>
            </div>
            <!-- Comments -->
            <div
              v-if="task.comments && task.comments.length > 0"
              class="mt-2 space-y-1 border-t border-warm-300 dark:border-white/10 pt-2"
            >
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
                Comments ({{ task.comments.length }})
              </p>
              <div
                v-for="comment in task.comments"
                :key="comment.id"
                class="text-xs text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-warm-400 dark:border-white/20"
              >
                <span class="font-medium">{{ comment.user_name }}:</span>
                {{ comment.content }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div
        class="bg-warm-50 dark:bg-dark-bg-800/60 rounded-xl border border-warm-300 dark:border-white/10 p-4"
      >
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Summary
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <p
              class="text-2xl font-bold text-blue-600 dark:accent-text-primary"
            >
              {{ totalPoints }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Total Story Points
            </p>
          </div>
          <div class="text-center">
            <p
              class="text-2xl font-bold text-green-600 dark:accent-text-success"
            >
              {{ tasksPointed }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Tasks Pointed
            </p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ tasks.length }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Total Tasks</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {{ participants.length }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Participants</p>
          </div>
        </div>

        <!-- Participant List -->
        <div class="mt-4 pt-4 border-t border-warm-300 dark:border-white/10">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Participants
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="p in participants"
              :key="p.id"
              class="px-2 py-1 text-xs bg-warm-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full"
            >
              {{ p.user_name }}
              <span
                v-if="p.user_id === session?.creator_id"
                class="text-blue-500 dark:text-accent-cyan"
                title="Session leader"
              >
                ★
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
