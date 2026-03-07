<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import TaskItem from './TaskItem.vue';
import TaskInfoModal from './TaskInfoModal.vue';

const props = defineProps({
  columnId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  tasks: {
    type: Array,
    default: () => [],
  },
  tags: {
    type: Array,
    default: () => [],
  },
  variant: {
    type: String,
    default: 'default',
  },
  jiraBaseUrl: {
    type: String,
    default: null,
  },
  dragDisabled: {
    type: Boolean,
    default: false,
  },
  stackMode: {
    type: Boolean,
    default: false,
  },
  topTaskId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['openActionModal', 'deleteColumn', 'taskMoved']);

const selectedTask = ref(null);

// Local copy for vuedraggable v-model
const localTasks = computed({
  get: () => props.tasks.filter((t) => t && t.id),
  set: () => {
    // Changes handled by @change event
  },
});

const variantClasses = computed(() => {
  if (props.variant === 'tasks') {
    return 'bg-warm-200 dark:bg-dark-bg-700/60 border-2 border-warm-400 dark:border-accent-cyan/20 dark:accent-border-primary';
  }
  return 'bg-warm-50 border border-warm-400 shadow-md dark:glass-panel-solid dark:border-0 dark:shadow-none';
});

const titleClasses = computed(() => {
  if (props.variant === 'tasks') {
    return 'text-lg font-bold text-blue-900 dark:accent-text-primary';
  }
  return 'font-semibold text-gray-700 dark:text-gray-200';
});

function onDragChange(evt) {
  if (evt.added) {
    emit('taskMoved', {
      task: evt.added.element,
      toColumnId: props.columnId,
    });
  }
}
</script>

<template>
  <div>
    <div
      :class="[
        'rounded-lg p-3 w-[220px] flex-shrink-0 transition-colors flex flex-col warm-glow-border',
        variantClasses,
      ]"
      style="min-height: 400px"
    >
      <div
        v-if="variant === 'tasks'"
        class="flex items-center justify-between mb-3"
      >
        <h3 :class="titleClasses">{{ title }}</h3>
      </div>
      <draggable
        :model-value="localTasks"
        group="tasks"
        item-key="id"
        :filter="'.no-drag'"
        :prevent-on-filter="false"
        :disabled="dragDisabled"
        class="space-y-2 flex-1 overflow-y-auto"
        ghost-class="opacity-30"
        @change="onDragChange"
      >
        <template #item="{ element }">
          <TaskItem
            :task="element"
            :jira-base-url="jiraBaseUrl"
            :tags="tags"
            :show-info="true"
            :highlighted="
              stackMode &&
              variant === 'tasks' &&
              topTaskId &&
              String(element.id) === String(topTaskId)
            "
            :drag-disabled="
              dragDisabled ||
              (stackMode &&
                variant === 'tasks' &&
                topTaskId &&
                String(element.id) !== String(topTaskId))
            "
            @open-action-modal="emit('openActionModal', $event)"
            @show-info="selectedTask = $event"
          />
        </template>
        <template #footer>
          <p
            v-if="!localTasks || localTasks.length === 0"
            class="text-sm text-gray-400 dark:text-gray-500 text-center py-4"
          >
            No tasks yet
          </p>
        </template>
      </draggable>
    </div>

    <!-- Task Info Modal -->
    <TaskInfoModal
      v-if="selectedTask"
      :task="selectedTask"
      :tags="tags"
      @close="selectedTask = null"
    />
  </div>
</template>
