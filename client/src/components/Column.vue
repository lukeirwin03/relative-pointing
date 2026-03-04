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
  variant: {
    type: String,
    default: 'default',
  },
  jiraBaseUrl: {
    type: String,
    default: null,
  },
});

const emit = defineEmits([
  'deleteTask',
  'updateTaskColor',
  'deleteColumn',
  'taskMoved',
]);

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
    return 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700';
  }
  return 'bg-gray-100 dark:bg-gray-800';
});

const titleClasses = computed(() => {
  if (props.variant === 'tasks') {
    return 'text-lg font-bold text-blue-900 dark:text-blue-200';
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
        'rounded-lg p-4 w-[300px] flex-shrink-0 transition-colors flex flex-col',
        variantClasses,
      ]"
      style="min-height: 500px"
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
        class="space-y-2 flex-1 overflow-y-auto"
        ghost-class="opacity-30"
        @change="onDragChange"
      >
        <template #item="{ element }">
          <TaskItem
            :task="element"
            :jira-base-url="jiraBaseUrl"
            :show-delete="true"
            :show-color="true"
            :show-info="true"
            @delete-task="emit('deleteTask', $event)"
            @update-color="
              (taskId, color) => emit('updateTaskColor', taskId, color)
            "
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
      @close="selectedTask = null"
    />
  </div>
</template>
