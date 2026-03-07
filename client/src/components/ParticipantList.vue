<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import APIService from '../services/api';
import SandTimer from './SandTimer.vue';
import { useSessionStore } from '../stores/session';

const sessionStore = useSessionStore();

const props = defineProps({
  participants: {
    type: Array,
    default: () => [],
  },
  currentUser: {
    type: Object,
    default: null,
  },
  isCreator: {
    type: Boolean,
    default: false,
  },
  skippedParticipants: {
    type: Array,
    default: () => [],
  },
  roomCode: {
    type: String,
    default: '',
  },
  currentTurnUserId: {
    type: String,
    default: null,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  isMyTurn: {
    type: Boolean,
    default: false,
  },
  turnActive: {
    type: Boolean,
    default: false,
  },
  currentTurnColor: {
    type: String,
    default: '#4ECDC4',
  },
  turnStartedAt: {
    type: String,
    default: null,
  },
  accumulatedSand: {
    type: Array,
    default: () => [],
  },
  draining: {
    type: Boolean,
    default: false,
  },
  creatorId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['toggleCollapse']);

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

const confirmTransferId = ref(null);

function getColorForParticipant(index) {
  return COLORS[index % COLORS.length];
}

const disabledParticipants = computed(() => new Set(props.skippedParticipants));

const activeParticipants = computed(() =>
  props.participants.filter((p) => !disabledParticipants.value.has(p.user_id))
);

function isOnline(participant) {
  if (!participant.last_seen_at) return false;
  const lastSeen = new Date(participant.last_seen_at + 'Z').getTime();
  const thresholdMs = sessionStore.serverConfig.offlineThresholdSeconds * 1000;
  return Date.now() - lastSeen < thresholdMs;
}

function toggleParticipant(participantId) {
  const newSkipped = disabledParticipants.value.has(participantId)
    ? props.skippedParticipants.filter((id) => id !== participantId)
    : [...props.skippedParticipants, participantId];

  APIService.updateSkippedParticipants(props.roomCode, newSkipped).catch(
    (err) => {
      console.error('Failed to update skipped participants:', err);
    }
  );
}

// Track sidebar inner height for full-height canvas
const sidebarInnerRef = ref(null);
const sidebarHeight = ref(400);
let resizeObserver = null;

onMounted(() => {
  if (sidebarInnerRef.value) {
    sidebarHeight.value = sidebarInnerRef.value.clientHeight;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        sidebarHeight.value = entry.contentRect.height;
      }
    });
    resizeObserver.observe(sidebarInnerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

function handleTransferClick(participantUserId) {
  if (confirmTransferId.value === participantUserId) {
    sessionStore.transferOwnership(participantUserId).catch((err) => {
      console.error('Failed to transfer ownership:', err);
    });
    confirmTransferId.value = null;
  } else {
    confirmTransferId.value = participantUserId;
  }
}

function cancelTransfer() {
  confirmTransferId.value = null;
}
</script>

<template>
  <aside
    :class="[
      'h-full flex-shrink-0 transition-all duration-300 border-r',
      'bg-warm-50 dark:glass-panel-solid dark:border-white/10 border-warm-300 z-20',
      collapsed ? 'w-16' : 'w-64',
    ]"
  >
    <div
      ref="sidebarInnerRef"
      class="relative flex flex-col h-full overflow-hidden"
    >
      <!-- Full-height background sand canvas (everyone sees it) -->
      <SandTimer
        v-if="!collapsed && turnActive"
        :is-host="true"
        :is-my-turn="isMyTurn"
        :turn-active="turnActive"
        :current-color="currentTurnColor"
        :turn-started-at="turnStartedAt"
        :accumulated-sand="accumulatedSand"
        :draining="draining"
        :canvas-height="sidebarHeight"
        class="absolute inset-0 z-0 pointer-events-none"
      />

      <!-- Header -->
      <div
        class="relative z-10 p-3 border-b border-warm-300 dark:border-white/10 flex items-center"
        :class="collapsed ? 'justify-center' : 'justify-between'"
      >
        <span
          v-if="!collapsed"
          class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
        >
          Participants ({{ activeParticipants.length }}/{{
            participants.length
          }})
        </span>
        <button
          @click="emit('toggleCollapse')"
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-accent-cyan transition-colors text-sm"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ collapsed ? '▶' : '◀' }}
        </button>
      </div>

      <!-- Participant list -->
      <div class="relative z-10 flex-1 overflow-y-auto p-2 space-y-1">
        <template v-if="participants.length > 0">
          <div
            v-for="(participant, index) in participants"
            :key="participant.id"
            :class="[
              'flex items-center gap-3 rounded-lg transition-all',
              collapsed ? 'justify-center p-2' : 'px-3 py-2',
              disabledParticipants.has(participant.user_id) ? 'opacity-40' : '',
            ]"
          >
            <!-- Avatar -->
            <div class="relative flex-shrink-0">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all"
                :class="[
                  participant.user_id === currentTurnUserId
                    ? 'ring-2 ring-accent-green shadow-glow-success-sm animate-glow-pulse'
                    : 'ring-2 ring-white/20',
                  { grayscale: !isOnline(participant) },
                ]"
                :style="{ backgroundColor: getColorForParticipant(index) }"
                :title="collapsed ? participant.user_name : undefined"
              >
                {{ participant.user_name?.[0]?.toUpperCase() || '?' }}
              </div>
              <!-- Offline dot -->
              <div
                v-if="!isOnline(participant)"
                class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-400 border-2 border-white dark:border-dark-bg-800"
                title="Offline"
              />
            </div>

            <!-- Name & status (expanded only) -->
            <template v-if="!collapsed">
              <div class="flex-1 min-w-0">
                <div
                  class="text-sm font-medium truncate"
                  :class="
                    participant.user_id === currentTurnUserId
                      ? 'text-gray-800 dark:accent-text-success'
                      : 'text-gray-700 dark:text-gray-300'
                  "
                >
                  {{ participant.user_name }}
                  <span
                    v-if="participant.user_id === currentUser?.id"
                    class="text-xs text-gray-400 dark:text-gray-500"
                    >(you)</span
                  >
                  <span
                    v-if="!isOnline(participant)"
                    class="text-xs text-gray-400 dark:text-gray-500"
                    >(offline)</span
                  >
                </div>
                <div
                  v-if="participant.user_id === currentTurnUserId"
                  class="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-accent-green"
                >
                  Current turn
                </div>
                <div
                  v-else-if="disabledParticipants.has(participant.user_id)"
                  class="text-[10px] text-gray-400 dark:text-gray-500 line-through"
                >
                  Skipped
                </div>
              </div>

              <!-- Crown for session owner -->
              <span
                v-if="participant.user_id === creatorId"
                class="text-amber-500 dark:text-amber-400 flex-shrink-0 w-5 h-5 flex items-center justify-center"
                title="Session owner"
                >★</span
              >
              <!-- Transfer ownership button (creator only, not for self, online only) -->
              <button
                v-else-if="
                  isCreator &&
                  isOnline(participant) &&
                  !disabledParticipants.has(participant.user_id)
                "
                @click.prevent.stop="handleTransferClick(participant.user_id)"
                class="text-xs px-1.5 py-0.5 rounded transition-colors flex-shrink-0 w-5 h-5 flex items-center justify-center"
                :class="
                  confirmTransferId === participant.user_id
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                "
                :title="
                  confirmTransferId === participant.user_id
                    ? 'Click again to confirm'
                    : 'Transfer ownership'
                "
              >
                <template v-if="confirmTransferId === participant.user_id">
                  <span class="text-[10px]">ok?</span>
                </template>
                <template v-else>
                  <span class="text-xs leading-none">★</span>
                </template>
              </button>
              <!-- Spacer to keep alignment when no crown/transfer shown -->
              <span v-else class="w-5 h-5 flex-shrink-0"></span>

              <!-- Skip toggle (creator only) -->
              <button
                v-if="isCreator"
                @click.prevent.stop="toggleParticipant(participant.user_id)"
                class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                :class="
                  disabledParticipants.has(participant.user_id)
                    ? 'border-warm-400 dark:border-gray-600 bg-warm-200 dark:bg-dark-bg-600 hover:border-green-400 dark:hover:border-accent-green'
                    : 'border-green-500 dark:border-accent-green bg-green-500 dark:bg-accent-green/80 text-white hover:bg-green-600'
                "
                :title="
                  disabledParticipants.has(participant.user_id)
                    ? 'Include in turn order'
                    : 'Skip this participant'
                "
              >
                <svg
                  v-if="!disabledParticipants.has(participant.user_id)"
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :stroke-width="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </template>
          </div>
        </template>
        <p
          v-else
          class="text-xs text-gray-400 dark:text-gray-500 text-center py-4"
        >
          {{ collapsed ? '—' : 'No participants' }}
        </p>
      </div>

      <!-- Cancel transfer confirmation -->
      <div
        v-if="confirmTransferId && !collapsed"
        class="relative z-10 px-3 pb-2 text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
        @click="cancelTransfer"
      >
        Cancel transfer
      </div>

      <!-- Footer -->
      <div
        v-if="!collapsed && activeParticipants.length < participants.length"
        class="relative z-10 p-3 border-t border-warm-300 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 text-center"
      >
        {{ activeParticipants.length }} of {{ participants.length }} active
      </div>
    </div>
  </aside>
</template>
