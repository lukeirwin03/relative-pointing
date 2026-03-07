<script setup>
import { computed } from 'vue';
import { buildJiraUrl, detectJiraBaseUrl } from '../utils/jiraUrlBuilder';
import { getTagColorClasses, getTagForTask } from './taskTags';

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  jiraBaseUrl: {
    type: String,
    default: null,
  },
  tags: {
    type: Array,
    default: () => [],
  },
  showInfo: {
    type: Boolean,
    default: false,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
  dragDisabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['openActionModal', 'showInfo']);

const taskTag = computed(() => getTagForTask(props.task, props.tags));
const tagColors = computed(() =>
  taskTag.value ? getTagColorClasses(taskTag.value.color) : null
);

const displayId = computed(() => props.task.display_id || props.task.id);

const truncatedTagName = computed(() => {
  if (!taskTag.value) return '';
  const name = taskTag.value.name;
  return name.length > 10 ? name.slice(0, 9) + '…' : name;
});

const jiraUrl = computed(() => {
  const baseUrl = props.jiraBaseUrl || detectJiraBaseUrl(displayId.value);
  return buildJiraUrl(baseUrl, displayId.value);
});

function openJira(e) {
  e.preventDefault();
  e.stopPropagation();
  if (jiraUrl.value) {
    window.open(jiraUrl.value, '_blank', 'noopener,noreferrer');
  }
}
</script>

<template>
  <div
    :class="[
      'p-3 rounded-lg shadow-sm transition-all group relative warm-glow-border',
      'bg-warm-50 dark:glass-card',
      dragDisabled
        ? 'cursor-default no-drag'
        : 'cursor-grab active:cursor-grabbing',
      !dragDisabled && 'hover:shadow-md dark:hover:shadow-card-hover',
      highlighted &&
        'ring-2 ring-blue-400/60 dark:ring-accent-cyan/50 shadow-[0_0_12px_rgba(59,130,246,0.3)] dark:shadow-[0_0_16px_rgba(86,214,224,0.25)]',
      taskTag
        ? `border-l-4 ${tagColors.border}`
        : 'border-l-4 border-transparent',
    ]"
  >
    <!-- Icons (top-right, hover-visible) -->
    <div
      class="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <!-- Add tag button (shown when no tag) -->
      <button
        v-if="!taskTag"
        class="no-drag text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-accent-cyan transition-colors relative -left-0.5"
        title="Add tag"
        @pointerdown.stop
        @click.prevent.stop="emit('openActionModal', { task, tab: 'tags' })"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      </button>
      <!-- Comment icon (opens comments tab) -->
      <button
        class="no-drag text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-accent-cyan transition-colors flex items-center gap-0.5"
        title="Comments"
        @pointerdown.stop
        @click.prevent.stop="emit('openActionModal', { task, tab: 'comments' })"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span v-if="task.comment_count > 0" class="text-[11px]">{{
          task.comment_count
        }}</span>
      </button>
      <!-- Gear icon (opens modal settings/delete) -->
      <button
        class="no-drag text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-accent-cyan transition-colors"
        title="Task settings"
        @pointerdown.stop
        @click.prevent.stop="emit('openActionModal', { task, tab: 'settings' })"
      >
        <span class="text-2xl leading-none relative -top-0.5">⚙</span>
      </button>
    </div>

    <!-- ID row -->
    <div class="flex items-start gap-2 pr-6">
      <div class="flex-1 min-w-0">
        <a
          v-if="jiraUrl"
          :href="jiraUrl"
          class="no-drag text-sm font-medium text-blue-600 dark:accent-text-primary hover:text-blue-800 dark:hover:text-cyan-200 hover:underline break-words"
          :title="`Open ${displayId} in Jira`"
          target="_blank"
          rel="noopener noreferrer"
          @click="openJira"
          @pointerdown.stop
          @mousedown.stop
        >
          {{ displayId }}
        </a>
        <p
          v-else
          class="text-sm font-medium text-gray-800 dark:text-gray-100 break-words"
        >
          {{ displayId }}
        </p>
      </div>
    </div>
    <!-- Title -->
    <p
      v-if="task.title"
      class="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words line-clamp-2"
    >
      {{ task.title }}
    </p>
    <!-- Bottom row: details (left) | tag badge (right) -->
    <div class="flex items-center gap-2 mt-2">
      <!-- Details link (bottom-left) -->
      <button
        v-if="showInfo"
        class="no-drag text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-accent-cyan transition-colors"
        title="View task details"
        @pointerdown.stop
        @click.prevent.stop="emit('showInfo', task)"
      >
        details
      </button>
      <!-- Tag badge (bottom-right, clickable, truncated) -->
      <button
        v-if="taskTag"
        class="no-drag ml-auto"
        :class="[
          'px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity max-w-[90px] truncate',
          tagColors.pill,
          'dark:' + tagColors.glow,
        ]"
        :title="taskTag.name"
        @pointerdown.stop
        @click.prevent.stop="emit('openActionModal', { task, tab: 'tags' })"
      >
        <span
          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="tagColors.dot"
        ></span>
        {{ truncatedTagName }}
      </button>
    </div>
  </div>
</template>
