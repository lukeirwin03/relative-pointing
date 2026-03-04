<script setup>
import { ref, computed } from 'vue';
import { buildJiraUrl, detectJiraBaseUrl } from '../utils/jiraUrlBuilder';
import { getColorClasses } from './taskColors';
import ColorPicker from './ColorPicker.vue';

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  jiraBaseUrl: {
    type: String,
    default: null,
  },
  showDelete: {
    type: Boolean,
    default: false,
  },
  showColor: {
    type: Boolean,
    default: false,
  },
  showInfo: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['deleteTask', 'updateColor', 'showInfo']);

const showColorPicker = ref(false);

const colorClasses = computed(() => getColorClasses(props.task.color_tag));

const jiraUrl = computed(() => {
  const baseUrl = props.jiraBaseUrl || detectJiraBaseUrl(props.task.id);
  return buildJiraUrl(baseUrl, props.task.id);
});

function handleDelete() {
  emit('deleteTask', props.task.id);
}

function handleColorSelect(colorId) {
  emit('updateColor', props.task.id, colorId);
}

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
      colorClasses.bg,
      'p-3 rounded shadow-sm cursor-grab active:cursor-grabbing transition-opacity group relative',
      'hover:shadow-md',
      task.color_tag ? `border-l-4 ${colorClasses.border}` : '',
    ]"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <a
          v-if="jiraUrl"
          :href="jiraUrl"
          class="no-drag text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-words"
          :title="`Open ${task.id} in Jira`"
          target="_blank"
          rel="noopener noreferrer"
          @click="openJira"
          @pointerdown.stop
          @mousedown.stop
        >
          {{ task.id }}
        </a>
        <p
          v-else
          class="text-sm font-medium text-gray-800 dark:text-gray-100 break-words"
        >
          {{ task.id }}
        </p>
        <p
          v-if="task.title"
          class="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words line-clamp-2"
        >
          {{ task.title }}
        </p>
      </div>
    </div>
    <div
      v-if="showDelete"
      class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <button
        class="no-drag flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
        title="Delete task"
        aria-label="Delete task"
        @pointerdown.stop
        @click.stop="handleDelete"
      >
        ✕
      </button>
    </div>
    <div class="flex items-center gap-2 mt-2">
      <div v-if="showColor" class="relative">
        <button
          class="no-drag text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
          title="Set color tag"
          @pointerdown.stop
          @click.prevent.stop="showColorPicker = !showColorPicker"
        >
          <span
            class="w-3 h-3 rounded-full"
            :class="colorClasses.dot || 'bg-gray-300 dark:bg-gray-500'"
          ></span>
          color
        </button>
        <ColorPicker
          v-if="showColorPicker"
          :current-color="task.color_tag"
          @select-color="handleColorSelect"
          @close="showColorPicker = false"
        />
      </div>
      <button
        v-if="showInfo"
        class="no-drag text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        title="View task details"
        @pointerdown.stop
        @click.prevent.stop="emit('showInfo', task)"
      >
        details
      </button>
    </div>
  </div>
</template>
