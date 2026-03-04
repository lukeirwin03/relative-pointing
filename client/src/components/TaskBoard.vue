<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { useUserStore } from '../stores/user';
import { useThemeStore } from '../stores/theme';
import APIService from '../services/api';
import Column from './Column.vue';
import CreateColumnDropZone from './CreateColumnDropZone.vue';
import ParticipantList from './ParticipantList.vue';
import CreateTaskModal from './CreateTaskModal.vue';
import DropZoneOverlay from './DropZoneOverlay.vue';
import Version from './Version.vue';
import Snowflakes from './Snowflakes.vue';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const userStore = useUserStore();
const themeStore = useThemeStore();

const roomCode = computed(() => route.params.roomCode);

const showCreateTask = ref(false);
const copied = ref(false);
const isDragging = ref(false);
const jiraBaseUrl = ref('');
const jiraUrlInput = ref('');
const showJiraUrlInput = ref(false);

const isCreator = computed(
  () => userStore.userId === sessionStore.session?.creator_id
);

// Update Jira URL when session changes
watch(
  () => sessionStore.session?.jira_base_url,
  (val) => {
    if (val) {
      jiraBaseUrl.value = val;
      jiraUrlInput.value = val;
    }
  }
);

// Start/stop polling
onMounted(() => {
  sessionStore.startPolling(roomCode.value);
});

onUnmounted(() => {
  sessionStore.stopPolling();
  sessionStore.resetState();
});

const sortedColumns = computed(() =>
  [...sessionStore.displayColumns].sort(
    (a, b) => (a.column_order || 0) - (b.column_order || 0)
  )
);

const unsortedTasks = computed(() =>
  sessionStore.displayTasks.filter((t) => t.column_id === 'unsorted')
);

function tasksForColumn(columnId) {
  return sessionStore.displayTasks.filter((t) => t.column_id === columnId);
}

async function handleCopyRoomCode() {
  try {
    await navigator.clipboard.writeText(roomCode.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch (err) {
    console.error('Failed to copy room code:', err);
  }
}

async function handleSaveJiraUrl() {
  try {
    await APIService.updateSessionJiraUrl(roomCode.value, jiraUrlInput.value);
    jiraBaseUrl.value = jiraUrlInput.value;
    showJiraUrlInput.value = false;
  } catch (err) {
    console.error('Error saving Jira URL:', err);
    alert('Failed to save Jira URL: ' + err.message);
  }
}

function handleTaskMoved({ task, toColumnId }) {
  sessionStore.moveTaskToColumn(String(task.id), toColumnId, userStore.userId);
}

function handleDropZoneTask({ task, zoneId }) {
  sessionStore.moveTaskToColumn(String(task.id), zoneId, userStore.userId);
}

function handleDeleteTask(taskId) {
  sessionStore.deleteTask(taskId);
}

function handleUpdateTaskColor(taskId, colorTag) {
  sessionStore.updateTaskColor(taskId, colorTag);
}

function handleDeleteColumn(columnId, task) {
  sessionStore.deleteColumn(columnId, task);
}

function handleTaskCreated() {
  showCreateTask.value = false;
}

function handleLogout() {
  router.push('/');
  userStore.logout();
}

// Track drag state across the whole board
function onDragStart() {
  isDragging.value = true;
}

function onDragEnd() {
  isDragging.value = false;
}

// Add/remove document-level listeners for drag detection
onMounted(() => {
  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragend', onDragEnd);
});

onUnmounted(() => {
  document.removeEventListener('dragstart', onDragStart);
  document.removeEventListener('dragend', onDragEnd);
});
</script>

<template>
  <!-- Loading state -->
  <div
    v-if="sessionStore.loading"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
      ></div>
      <p class="text-gray-600">Loading session...</p>
    </div>
  </div>

  <!-- Session not found -->
  <div
    v-else-if="!sessionStore.session"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-center">
      <p class="text-xl text-gray-600">Session not found</p>
      <router-link
        to="/"
        class="text-blue-600 hover:underline mt-4 inline-block"
      >
        Create New Session
      </router-link>
    </div>
  </div>

  <!-- Main board -->
  <div
    v-else
    class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors"
  >
    <!-- Christmas Snowflakes -->
    <Snowflakes v-if="themeStore.isChristmas" :count="50" />

    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
    >
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="router.push('/')"
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              title="Go to home"
            >
              ←
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
                Relative Pointing <Version class="ml-2" />
              </h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Room Code:
                <span
                  @click="handleCopyRoomCode"
                  class="font-mono font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                  title="Click to copy"
                >
                  {{ roomCode }}
                  <template v-if="copied"> ✓</template>
                </span>
              </p>
              <p
                v-if="isCreator"
                class="text-sm text-gray-600 dark:text-gray-400 mt-2"
              >
                Jira Base URL:
                <template v-if="showJiraUrlInput">
                  <span class="inline-flex gap-2">
                    <input
                      type="text"
                      v-model="jiraUrlInput"
                      placeholder="https://company.atlassian.net"
                      class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      autofocus
                    />
                    <button
                      @click="handleSaveJiraUrl"
                      class="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      @click="showJiraUrlInput = false"
                      class="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </span>
                </template>
                <template v-else>
                  <span
                    @click="
                      jiraUrlInput = jiraBaseUrl;
                      showJiraUrlInput = true;
                    "
                    class="font-mono font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                    title="Click to edit"
                  >
                    {{ jiraBaseUrl || 'Not set' }}
                    <template v-if="jiraBaseUrl"> ✎</template>
                  </span>
                </template>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <button
              @click="themeStore.toggleChristmas()"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :title="themeStore.isChristmas ? 'Disable snow' : 'Let it snow!'"
            >
              {{ themeStore.isChristmas ? '🎄' : '❄️' }}
            </button>
            <button
              @click="themeStore.toggleTheme()"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :title="
                themeStore.isDark
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              "
            >
              {{ themeStore.isDark ? '☀️' : '🌙' }}
            </button>
            <button
              @click="handleLogout"
              class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Logout"
            >
              Logout
            </button>
            <ParticipantList
              :participants="sessionStore.participants"
              :current-user="userStore.currentUser"
              :is-creator="isCreator"
              :skipped-participants="
                sessionStore.session?.skipped_participants || []
              "
              :room-code="roomCode"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Complexity Header -->
    <div
      class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4"
    >
      <div class="flex items-center justify-center gap-2 px-4">
        <div class="text-3xl text-gray-500 dark:text-gray-400">◀</div>
        <div class="flex-1 flex items-center gap-3">
          <div
            class="flex-1 h-1 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-600 rounded"
          ></div>
          <div class="text-center whitespace-nowrap">
            <div class="text-gray-600 dark:text-gray-300 font-semibold text-sm">
              Complexity
            </div>
          </div>
          <div
            class="flex-1 h-1 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded"
          ></div>
        </div>
        <div class="text-3xl text-gray-500 dark:text-gray-400">▶</div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Task Board Area -->
      <div
        class="flex-1 overflow-x-hidden overflow-y-auto p-4 flex justify-center"
      >
        <div class="flex gap-4 min-h-full transition-all duration-200">
          <template
            v-if="
              sessionStore.displayTasks && sessionStore.displayTasks.length > 0
            "
          >
            <!-- No columns yet, show single drop zone when dragging -->
            <template v-if="sortedColumns.length === 0 && isDragging">
              <CreateColumnDropZone
                zone-id="new-column"
                :is-first="true"
                @task-dropped="handleDropZoneTask"
              />
            </template>

            <template v-else>
              <!-- Left drop zone -->
              <CreateColumnDropZone
                v-if="sortedColumns.length > 0 && isDragging"
                zone-id="new-column-left"
                @task-dropped="handleDropZoneTask"
              />

              <!-- Columns -->
              <template
                v-for="(column, index) in sortedColumns"
                :key="`col-${column.id}`"
              >
                <div class="transition-all duration-200">
                  <Column
                    :column-id="column.id"
                    :title="column.name"
                    :tasks="tasksForColumn(column.id)"
                    :jira-base-url="jiraBaseUrl"
                    @delete-task="handleDeleteTask"
                    @update-task-color="handleUpdateTaskColor"
                    @task-moved="handleTaskMoved"
                  />
                </div>
                <!-- Between columns drop zone -->
                <CreateColumnDropZone
                  v-if="
                    isDragging &&
                    sortedColumns.length > 1 &&
                    index < sortedColumns.length - 1
                  "
                  :zone-id="`new-column-between-${column.id}`"
                  @task-dropped="handleDropZoneTask"
                />
              </template>

              <!-- Right drop zone -->
              <CreateColumnDropZone
                v-if="sortedColumns.length > 0 && isDragging"
                zone-id="new-column"
                @task-dropped="handleDropZoneTask"
              />
            </template>
          </template>

          <div v-else class="text-gray-400 text-center py-8 w-full">
            <p class="mb-2">No tasks yet</p>
            <p class="text-sm">
              Upload a CSV or use the sample data to get started
            </p>
          </div>
        </div>
      </div>

      <!-- Tasks Queue Panel - Right Sidebar -->
      <div
        class="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
      >
        <div
          class="p-4 border-b border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto"
        >
          <Column
            column-id="unsorted"
            title="Tasks"
            :tasks="unsortedTasks"
            variant="tasks"
            :jira-base-url="jiraBaseUrl"
            @delete-task="handleDeleteTask"
            @update-task-color="handleUpdateTaskColor"
            @task-moved="handleTaskMoved"
          />
        </div>
        <!-- Create Task Button -->
        <div
          v-if="isCreator"
          class="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
        >
          <button
            @click="showCreateTask = true"
            class="w-full px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium text-sm"
            title="Add a new task manually"
          >
            + Create Task
          </button>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <CreateTaskModal
      v-if="showCreateTask"
      :room-code="roomCode"
      @task-created="handleTaskCreated"
      @close="showCreateTask = false"
    />

    <!-- Drop Zone Overlay for CSV import -->
    <DropZoneOverlay :room-code="roomCode" :is-creator="isCreator" />
  </div>
</template>
