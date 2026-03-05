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
import TaskActionModal from './TaskActionModal.vue';
import Version from './Version.vue';
import Snowflakes from './Snowflakes.vue';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const userStore = useUserStore();
const themeStore = useThemeStore();

const roomCode = computed(() => route.params.roomCode);

const showCreateTask = ref(false);
const showEndSessionConfirm = ref(false);
const actionModalTask = ref(null);
const actionModalTab = ref('tags');
const copied = ref(false);
const isDragging = ref(false);
const jiraBaseUrl = ref('');
const jiraUrlInput = ref('');
const showJiraUrlInput = ref(false);
const sidebarCollapsed = ref(false);
const boardAreaRef = ref(null);

// Auto-collapse sidebar on narrow viewports
const COLLAPSE_BREAKPOINT = 1024;
function checkViewportWidth() {
  if (window.innerWidth < COLLAPSE_BREAKPOINT) {
    sidebarCollapsed.value = true;
  }
}
onMounted(() => {
  checkViewportWidth();
  window.addEventListener('resize', checkViewportWidth);
});
onUnmounted(() => {
  window.removeEventListener('resize', checkViewportWidth);
});

// Sand timer turn history tracking
const turnHistory = ref([]);
const draining = ref(false);
let previousTurnUserId = null;
let previousTurnStartedAt = null;

const isCreator = computed(
  () => userStore.userId === sessionStore.session?.creator_id
);

const dragDisabled = computed(
  () => !sessionStore.isMyTurn || sessionStore.isCurrentUserDisabled
);
const topTaskId = computed(() =>
  sessionStore.topUnsortedTask ? String(sessionStore.topUnsortedTask.id) : null
);

// Participant colors (same as ParticipantList)
const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

function getColorForUserId(userId) {
  const idx = sessionStore.participants.findIndex((p) => p.user_id === userId);
  return idx >= 0 ? COLORS[idx % COLORS.length] : '#4ECDC4';
}

const currentTurnColor = computed(() => {
  if (!sessionStore.currentTurnUserId) return '#4ECDC4';
  return getColorForUserId(sessionStore.currentTurnUserId);
});

const turnActive = computed(() => !!sessionStore.currentTurnParticipant);

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

// Track turn changes for sand timer
watch(
  () => sessionStore.currentTurnUserId,
  (newUserId, oldUserId) => {
    // Record the previous turn's sand if there was one
    if (oldUserId && previousTurnStartedAt) {
      const elapsed = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(previousTurnStartedAt).getTime()) / 1000
        )
      );
      // Convert seconds to particle count (matches spawn rate: ~1/sec base)
      const particleCount = Math.floor(elapsed * 1);
      const color = getColorForUserId(oldUserId);
      turnHistory.value = [
        ...turnHistory.value,
        { userId: oldUserId, color, particleCount },
      ];

      // Sand accumulates for everyone — no drain between turns
    }

    previousTurnUserId = newUserId;
    previousTurnStartedAt = newUserId ? sessionStore.turnStartedAt : null;
  }
);

// Keep previousTurnStartedAt in sync when turnStartedAt updates
watch(
  () => sessionStore.turnStartedAt,
  (val) => {
    if (sessionStore.currentTurnUserId) {
      previousTurnStartedAt = val;
    }
  }
);

// Watch for session ending → redirect all participants to report
watch(
  () => sessionStore.session?.ended_at,
  (endedAt) => {
    if (endedAt) {
      sessionStore.stopPolling();
      router.push(`/session/${roomCode.value}/report`);
    }
  },
  { immediate: true }
);

// Ensure current user is a participant, then start polling
onMounted(async () => {
  try {
    await APIService.joinSession(
      roomCode.value,
      userStore.userId,
      userStore.userName
    );
  } catch {
    // Already a participant or other non-fatal error
  }
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

// Complexity header scroll navigation
function getColumnElements() {
  if (!boardAreaRef.value) return [];
  return Array.from(boardAreaRef.value.querySelectorAll('[data-column-index]'));
}

function scrollToColumnIndex(index) {
  const cols = getColumnElements();
  if (index < 0 || index >= cols.length || !boardAreaRef.value) return;
  const col = cols[index];
  const container = boardAreaRef.value;
  const colRect = col.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const scrollLeft =
    container.scrollLeft +
    (colRect.left - containerRect.left) -
    (containerRect.width / 2 - colRect.width / 2);
  container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
}

function getCurrentColumnIndex() {
  const cols = getColumnElements();
  if (!cols.length || !boardAreaRef.value) return 0;
  const containerCenter =
    boardAreaRef.value.getBoundingClientRect().left +
    boardAreaRef.value.clientWidth / 2;
  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < cols.length; i++) {
    const rect = cols[i].getBoundingClientRect();
    const colCenter = rect.left + rect.width / 2;
    const dist = Math.abs(colCenter - containerCenter);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

function scrollColumnLeft() {
  const idx = getCurrentColumnIndex();
  scrollToColumnIndex(idx - 1);
}

function scrollColumnRight() {
  const idx = getCurrentColumnIndex();
  scrollToColumnIndex(idx + 1);
}

function handleComplexityBarClick(e) {
  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  const fraction = (e.clientX - rect.left) / rect.width;
  const cols = getColumnElements();
  if (!cols.length) return;
  const targetIndex = Math.round(fraction * (cols.length - 1));
  scrollToColumnIndex(targetIndex);
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

function handleUpdateTaskTag(taskId, tagId) {
  sessionStore.updateTaskTag(taskId, tagId);
}

function handleOpenActionModal({ task, tab }) {
  actionModalTask.value = task;
  actionModalTab.value = tab || 'tags';
}

function handleDeleteColumn(columnId, task) {
  sessionStore.deleteColumn(columnId, task);
}

function handleTaskCreated() {
  showCreateTask.value = false;
}

async function handleEndSession() {
  try {
    await sessionStore.endSession();
    showEndSessionConfirm.value = false;
    router.push(`/session/${roomCode.value}/report`);
  } catch (err) {
    alert('Failed to end session: ' + err.message);
  }
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
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-neon-cyan mx-auto mb-4"
      ></div>
      <p class="text-gray-600 dark:text-gray-400">Loading session...</p>
    </div>
  </div>

  <!-- Session not found -->
  <div
    v-else-if="!sessionStore.session"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-center">
      <p class="text-xl text-gray-600 dark:text-gray-400">Session not found</p>
      <router-link
        to="/"
        class="text-blue-600 dark:neon-text-cyan hover:underline mt-4 inline-block"
      >
        Create New Session
      </router-link>
    </div>
  </div>

  <!-- Main board -->
  <div
    v-else
    class="h-screen bg-gray-50 dark:bg-neon-bg-900 flex transition-colors neon-grid-bg"
  >
    <!-- Christmas Snowflakes -->
    <Snowflakes v-if="themeStore.isChristmas" :count="50" />

    <!-- Participant Sidebar -->
    <ParticipantList
      :participants="sessionStore.participants"
      :current-user="userStore.currentUser"
      :is-creator="isCreator"
      :skipped-participants="sessionStore.session?.skipped_participants || []"
      :room-code="roomCode"
      :current-turn-user-id="sessionStore.currentTurnUserId"
      :collapsed="sidebarCollapsed"
      :is-my-turn="sessionStore.isMyTurn"
      :turn-active="turnActive"
      :current-turn-color="currentTurnColor"
      :turn-started-at="sessionStore.turnStartedAt"
      :accumulated-sand="turnHistory"
      :draining="draining"
      :creator-id="sessionStore.session?.creator_id"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
    />

    <!-- Main content area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header
        class="bg-white dark:glass-panel-solid shadow-sm border-b border-gray-200 dark:border-white/10"
      >
        <div class="px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button
                @click="router.push('/')"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-neon-cyan text-2xl transition-colors"
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
                    class="font-mono font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-white/5 transition-colors text-gray-800 dark:neon-text-cyan"
                    title="Click to copy"
                  >
                    {{ roomCode }}
                    <template v-if="copied"> ✓</template>
                  </span>
                </p>
                <p
                  v-if="isCreator"
                  class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                >
                  Jira Base URL:
                  <template v-if="showJiraUrlInput">
                    <span class="inline-flex gap-2">
                      <input
                        type="text"
                        v-model="jiraUrlInput"
                        placeholder="https://company.atlassian.net"
                        class="px-2 py-1 border border-gray-300 dark:border-white/20 rounded text-sm dark:bg-neon-bg-700 dark:text-white focus:ring-1 focus:ring-neon-cyan dark:focus:border-neon-cyan/50"
                        autofocus
                      />
                      <button
                        @click="handleSaveJiraUrl"
                        class="px-2 py-1 bg-blue-600 dark:bg-neon-green/80 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-neon-green transition-colors"
                      >
                        Save
                      </button>
                      <button
                        @click="showJiraUrlInput = false"
                        class="px-2 py-1 bg-gray-300 dark:bg-white/10 text-gray-800 dark:text-white rounded text-sm hover:bg-gray-400 dark:hover:bg-white/20 transition-colors"
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
                      class="font-mono font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
                      title="Click to edit"
                    >
                      {{ jiraBaseUrl || 'Not set' }}
                      <template v-if="jiraBaseUrl"> ✎</template>
                    </span>
                  </template>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                v-if="isCreator"
                @click="showEndSessionConfirm = true"
                class="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                title="End this session and generate a report"
              >
                End Session
              </button>
              <button
                @click="themeStore.toggleChristmas()"
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                :title="
                  themeStore.isChristmas ? 'Disable snow' : 'Let it snow!'
                "
              >
                {{ themeStore.isChristmas ? '🎄' : '❄️' }}
              </button>
              <button
                @click="themeStore.toggleTheme()"
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
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
                class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- All participants disabled banner -->
      <div
        v-if="
          !sessionStore.currentTurnParticipant &&
          sessionStore.participants.length > 0 &&
          !sessionStore.loading
        "
        class="px-4 py-3 flex items-center justify-between border-b bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800"
      >
        <span class="font-semibold text-red-800 dark:text-red-200">
          All participants are disabled. Enable a participant to continue.
        </span>
      </div>

      <!-- Turn Banner -->
      <div
        v-if="sessionStore.currentTurnParticipant"
        :class="[
          'px-4 py-3 flex items-center justify-between border-b h-[52px]',
          sessionStore.isMyTurn
            ? 'bg-green-100 dark:bg-transparent border-green-200 dark:border-white/10 dark:turn-glow-active'
            : 'bg-yellow-100 dark:bg-transparent border-yellow-200 dark:border-white/10 dark:turn-glow-waiting',
        ]"
      >
        <div class="flex items-center gap-3">
          <span
            :class="[
              'font-semibold',
              sessionStore.isMyTurn
                ? 'text-green-800 dark:neon-text-green'
                : 'text-yellow-800 dark:text-neon-yellow',
            ]"
          >
            <template v-if="sessionStore.isMyTurn"> It's your turn! </template>
            <template v-else>
              It's {{ sessionStore.currentTurnParticipant.user_name }}'s turn
            </template>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="sessionStore.isMyTurn"
            @click="sessionStore.endTurn()"
            class="px-3 py-1.5 bg-green-600 dark:bg-neon-green/80 text-white dark:text-neon-bg-900 text-sm rounded-lg hover:bg-green-700 dark:hover:bg-neon-green transition-colors font-medium dark:shadow-glow-green-sm"
          >
            End My Turn
          </button>
          <button
            v-if="isCreator && !sessionStore.isMyTurn"
            @click="sessionStore.endTurn()"
            class="px-3 py-1.5 bg-yellow-600 dark:bg-neon-yellow/80 text-white dark:text-neon-bg-900 text-sm rounded-lg hover:bg-yellow-700 dark:hover:bg-neon-yellow transition-colors font-medium dark:shadow-glow-yellow-sm"
          >
            Skip Turn
          </button>
        </div>
      </div>

      <!-- Complexity Header (interactive scroll nav) -->
      <div
        class="bg-white dark:bg-neon-bg-800/60 border-b border-gray-200 dark:border-white/10 py-4"
      >
        <div
          class="flex items-center justify-center gap-2 px-4 pr-[calc(1rem+16rem)]"
        >
          <button
            class="text-3xl text-gray-500 dark:text-neon-cyan/40 hover:text-gray-800 dark:hover:text-neon-cyan transition-colors cursor-pointer select-none"
            title="Scroll left one column"
            @click="scrollColumnLeft"
          >
            ◀
          </button>
          <div
            class="flex-1 flex items-center gap-3 cursor-pointer"
            title="Click to scroll to relative position"
            @click="handleComplexityBarClick"
          >
            <div
              class="flex-1 h-1 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-neon-cyan/30 dark:to-transparent rounded hover:h-1.5 transition-all"
            ></div>
            <div class="text-center whitespace-nowrap pointer-events-none">
              <div
                class="text-gray-600 dark:text-gray-300 font-semibold text-sm"
              >
                Complexity
              </div>
            </div>
            <div
              class="flex-1 h-1 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-transparent dark:to-neon-cyan/30 rounded hover:h-1.5 transition-all"
            ></div>
          </div>
          <button
            class="text-3xl text-gray-500 dark:text-neon-cyan/40 hover:text-gray-800 dark:hover:text-neon-cyan transition-colors cursor-pointer select-none"
            title="Scroll right one column"
            @click="scrollColumnRight"
          >
            ▶
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Task Board Area -->
        <div
          ref="boardAreaRef"
          class="flex-1 overflow-x-auto overflow-y-auto p-4 relative z-10"
        >
          <div
            class="flex gap-4 min-h-full transition-all duration-200 px-4 mx-auto w-fit"
          >
            <template
              v-if="
                sessionStore.displayTasks &&
                sessionStore.displayTasks.length > 0
              "
            >
              <!-- No columns yet, show single drop zone when dragging -->
              <template
                v-if="
                  sortedColumns.length === 0 &&
                  isDragging &&
                  sessionStore.isMyTurn
                "
              >
                <CreateColumnDropZone
                  zone-id="new-column"
                  :is-first="true"
                  @task-dropped="handleDropZoneTask"
                />
              </template>

              <template v-else>
                <!-- Left drop zone -->
                <CreateColumnDropZone
                  v-if="
                    sortedColumns.length > 0 &&
                    isDragging &&
                    sessionStore.isMyTurn
                  "
                  zone-id="new-column-left"
                  @task-dropped="handleDropZoneTask"
                />

                <!-- Columns -->
                <template
                  v-for="(column, index) in sortedColumns"
                  :key="`col-${column.id}`"
                >
                  <div
                    class="transition-all duration-200"
                    :data-column-index="index"
                  >
                    <Column
                      :column-id="column.id"
                      :title="column.name"
                      :tasks="tasksForColumn(column.id)"
                      :tags="sessionStore.tags"
                      :jira-base-url="jiraBaseUrl"
                      :drag-disabled="dragDisabled"
                      @open-action-modal="handleOpenActionModal"
                      @task-moved="handleTaskMoved"
                    />
                  </div>
                  <!-- Between columns drop zone -->
                  <CreateColumnDropZone
                    v-if="
                      isDragging &&
                      sessionStore.isMyTurn &&
                      sortedColumns.length > 1 &&
                      index < sortedColumns.length - 1
                    "
                    :zone-id="`new-column-between-${column.id}`"
                    @task-dropped="handleDropZoneTask"
                  />
                </template>

                <!-- Right drop zone -->
                <CreateColumnDropZone
                  v-if="
                    sortedColumns.length > 0 &&
                    isDragging &&
                    sessionStore.isMyTurn
                  "
                  zone-id="new-column"
                  @task-dropped="handleDropZoneTask"
                />
              </template>
            </template>

            <div
              v-else
              class="text-gray-400 dark:text-gray-500 text-center py-8 w-full"
            >
              <p class="mb-2">No tasks yet</p>
              <p class="text-sm">
                Upload a CSV or use the sample data to get started
              </p>
            </div>
          </div>
        </div>

        <!-- Tasks Queue Panel - Right Sidebar -->
        <div
          class="w-64 bg-white dark:bg-neon-bg-800/60 border-l border-gray-200 dark:border-white/10 flex flex-col overflow-hidden relative z-20"
        >
          <div
            class="p-4 border-b border-gray-200 dark:border-white/10 flex-1 overflow-y-auto"
          >
            <Column
              column-id="unsorted"
              title="Tasks"
              :tasks="unsortedTasks"
              :tags="sessionStore.tags"
              variant="tasks"
              :jira-base-url="jiraBaseUrl"
              :drag-disabled="dragDisabled"
              :stack-mode="sessionStore.stackMode"
              :top-task-id="topTaskId"
              @open-action-modal="handleOpenActionModal"
              @task-moved="handleTaskMoved"
            />
          </div>
          <!-- Sidebar Footer -->
          <div
            class="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-neon-bg-700/50 space-y-2"
          >
            <!-- Stack Mode Toggle (creator only) -->
            <label
              v-if="isCreator"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="sessionStore.stackMode"
                @change="sessionStore.toggleStackMode()"
                class="rounded border-gray-300 dark:border-white/20"
              />
              Stack mode (one task at a time)
            </label>
            <!-- Skip Task Button -->
            <button
              v-if="
                sessionStore.stackMode &&
                sessionStore.isMyTurn &&
                sessionStore.topUnsortedTask
              "
              @click="sessionStore.skipTopTask()"
              class="w-full px-3 py-2 bg-orange-500 dark:bg-neon-yellow/80 text-white dark:text-neon-bg-900 rounded-lg hover:bg-orange-600 dark:hover:bg-neon-yellow transition-colors font-medium text-sm dark:shadow-glow-yellow-sm"
            >
              Skip Task
            </button>
            <!-- Create Task Button -->
            <button
              v-if="isCreator"
              @click="showCreateTask = true"
              class="w-full px-3 py-2 bg-green-600 dark:bg-neon-green/80 text-white dark:text-neon-bg-900 rounded-lg hover:bg-green-700 dark:hover:bg-neon-green transition-colors font-medium text-sm dark:shadow-glow-green-sm"
              title="Add a new task manually"
            >
              + Create Task
            </button>
          </div>
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

    <!-- Task Action Modal (Tags & Comments) -->
    <TaskActionModal
      v-if="actionModalTask"
      :task="actionModalTask"
      :tags="sessionStore.tags"
      :initial-tab="actionModalTab"
      @update-tag="handleUpdateTaskTag"
      @delete-task="handleDeleteTask"
      @close="actionModalTask = null"
    />

    <!-- Drop Zone Overlay for CSV import -->
    <DropZoneOverlay :room-code="roomCode" :is-creator="isCreator" />

    <!-- End Session Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showEndSessionConfirm"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showEndSessionConfirm = false"
      >
        <div
          class="bg-white dark:bg-neon-bg-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-white/10"
        >
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-2">
            End Session?
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            This will end the pointing session for all participants and generate
            a report. This action cannot be undone.
          </p>
          <div class="flex gap-3 justify-end">
            <button
              @click="showEndSessionConfirm = false"
              class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleEndSession"
              class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
