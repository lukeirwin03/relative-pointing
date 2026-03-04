<script setup>
import { ref, computed } from 'vue';
import APIService from '../services/api';
import { useSessionStore } from '../stores/session';

const OFFLINE_THRESHOLD_MS = 15 * 1000; // Must match server OFFLINE_THRESHOLD_S

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
  creatorId: {
    type: String,
    default: null,
  },
});

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

const hoveredId = ref(null);
const showTurnList = ref(false);
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
  return Date.now() - lastSeen < OFFLINE_THRESHOLD_MS;
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

function handleTransferClick(participantUserId) {
  if (confirmTransferId.value === participantUserId) {
    // Second click — confirm transfer
    const sessionStore = useSessionStore();
    sessionStore.transferOwnership(participantUserId).catch((err) => {
      console.error('Failed to transfer ownership:', err);
    });
    confirmTransferId.value = null;
  } else {
    // First click — show confirmation
    confirmTransferId.value = participantUserId;
  }
}

function cancelTransfer() {
  confirmTransferId.value = null;
}
</script>

<template>
  <div class="relative">
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        Participants ({{ participants.length }}):
      </span>
      <div class="flex gap-1 relative">
        <template v-if="participants.length > 0">
          <div
            v-for="(participant, index) in participants"
            :key="participant.id"
            class="relative"
            @mouseenter="hoveredId = participant.id"
            @mouseleave="hoveredId = null"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:scale-110 transition-transform"
              :class="[
                participant.user_id === currentTurnUserId
                  ? 'ring-4 ring-green-400'
                  : 'ring-2 ring-white dark:ring-gray-800',
                {
                  'opacity-40': disabledParticipants.has(participant.user_id),
                  grayscale: !isOnline(participant),
                },
              ]"
              :style="{ backgroundColor: getColorForParticipant(index) }"
            >
              {{ participant.user_name?.[0]?.toUpperCase() || '?' }}
            </div>

            <!-- Offline dot -->
            <div
              v-if="!isOnline(participant)"
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-400 border-2 border-white dark:border-gray-800"
              title="Offline"
            />

            <!-- Tooltip -->
            <div
              v-if="hoveredId === participant.id"
              class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10"
            >
              {{ participant.user_name }}
              <template v-if="participant.user_id === creatorId">
                (owner)
              </template>
              <template v-if="!isOnline(participant)"> (offline) </template>
              <template v-if="disabledParticipants.has(participant.user_id)">
                (skipped)
              </template>
              <div
                class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700"
              />
            </div>
          </div>
        </template>
        <span v-else class="text-xs text-gray-500 dark:text-gray-400">
          None
        </span>
      </div>
      <button
        v-if="participants.length > 0"
        @click="showTurnList = !showTurnList"
        class="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
      >
        {{ showTurnList ? 'hide turns' : 'whose turn?' }}
      </button>
    </div>

    <!-- Whose Turn List -->
    <div
      v-if="showTurnList && participants.length > 0"
      class="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-20 min-w-[240px]"
      @click.stop
    >
      <div
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide"
      >
        Whose turn is it anyways?
      </div>
      <ul class="space-y-1">
        <li
          v-for="(participant, index) in participants"
          :key="participant.id"
          class="flex items-center gap-2 text-sm"
          :class="
            disabledParticipants.has(participant.user_id)
              ? 'text-gray-400 dark:text-gray-500 line-through'
              : 'text-gray-700 dark:text-gray-300'
          "
        >
          <button
            v-if="isCreator"
            @click.prevent.stop="toggleParticipant(participant.user_id)"
            class="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            :class="
              disabledParticipants.has(participant.user_id)
                ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 hover:border-green-400'
                : 'border-green-500 bg-green-500 text-white hover:bg-green-600'
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
          <span
            v-else
            class="w-3 h-3 rounded-full flex-shrink-0"
            :class="{
              'opacity-40': disabledParticipants.has(participant.user_id),
            }"
            :style="{ backgroundColor: getColorForParticipant(index) }"
          />
          <span
            class="flex-1"
            :class="{
              'font-semibold': participant.user_id === currentUser?.id,
            }"
          >
            {{ participant.user_name }}
            <template v-if="participant.user_id === currentUser?.id">
              (you)
            </template>
            <template v-if="participant.user_id === creatorId">
              <span
                class="text-amber-500 dark:text-amber-400"
                title="Session owner"
                >&#9733;</span
              >
            </template>
            <template v-if="participant.user_id === currentTurnUserId">
              <span class="text-green-600 dark:text-green-400"
                >(current turn)</span
              >
            </template>
            <template v-if="!isOnline(participant)">
              <span class="text-gray-400 dark:text-gray-500 text-xs"
                >(offline)</span
              >
            </template>
          </span>
          <!-- Transfer ownership button (creator only, not for self) -->
          <button
            v-if="
              isCreator &&
              participant.user_id !== creatorId &&
              isOnline(participant) &&
              !disabledParticipants.has(participant.user_id)
            "
            @click.prevent.stop="handleTransferClick(participant.user_id)"
            class="ml-auto text-xs px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
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
              confirm?
            </template>
            <template v-else>
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </template>
          </button>
        </li>
      </ul>
      <!-- Cancel transfer confirmation if clicking away -->
      <div
        v-if="confirmTransferId"
        class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
        @click="cancelTransfer"
      >
        Cancel transfer
      </div>
      <div
        v-if="activeParticipants.length < participants.length"
        class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400"
      >
        {{ activeParticipants.length }} of {{ participants.length }} active
      </div>
    </div>
  </div>
</template>
