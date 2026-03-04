<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSessionStore } from '../stores/session';
import { useUserStore } from '../stores/user';
import APIService from '../services/api';
import { TAG_COLOR_PALETTE, getTagColorClasses } from './taskTags';

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  tags: {
    type: Array,
    default: () => [],
  },
  initialTab: {
    type: String,
    default: 'tags',
  },
});

const emit = defineEmits(['close', 'updateTag', 'deleteTask']);

const sessionStore = useSessionStore();
const userStore = useUserStore();

const activeTab = ref(props.initialTab);
const confirmDelete = ref(false);
const comments = ref([]);
const loadingComments = ref(false);
const commentText = ref('');
const submittingComment = ref(false);

// Create tag form
const showCreateTag = ref(false);
const newTagName = ref('');
const newTagColor = ref('blue');

const currentTagId = computed(() => props.task.tag_id || null);

const BUILTIN_ORDER = ['Ready for Dev', 'Needs Updates', 'Blocked'];
const orderedTags = computed(() => {
  const sorted = [...props.tags];
  sorted.sort((a, b) => {
    const aIdx = BUILTIN_ORDER.indexOf(a.name);
    const bIdx = BUILTIN_ORDER.indexOf(b.name);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });
  return sorted;
});

onMounted(() => {
  loadComments();
});

async function loadComments() {
  if (!sessionStore.roomCode) return;
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

function selectTag(tagId) {
  const newTagId = tagId === currentTagId.value ? null : tagId;
  emit('updateTag', props.task.id, newTagId);
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return;
  try {
    const tag = await sessionStore.createTag(
      newTagName.value.trim(),
      newTagColor.value
    );
    showCreateTag.value = false;
    newTagName.value = '';
    newTagColor.value = 'blue';
    // Auto-select the new tag
    if (tag) {
      emit('updateTag', props.task.id, tag.id);
    }
  } catch (err) {
    console.error('Error creating tag:', err);
  }
}

async function handleDeleteTag(tagId) {
  try {
    await sessionStore.deleteTag(tagId);
  } catch (err) {
    console.error('Error deleting tag:', err);
  }
}

async function handleAddComment() {
  if (!commentText.value.trim() || submittingComment.value) return;
  submittingComment.value = true;
  try {
    const comment = await APIService.addTaskComment(
      sessionStore.roomCode,
      props.task.id,
      userStore.userId,
      userStore.userName,
      commentText.value.trim()
    );
    comments.value = [...comments.value, comment];
    commentText.value = '';
  } catch (err) {
    console.error('Error adding comment:', err);
  } finally {
    submittingComment.value = false;
  }
}

function handleDeleteTask() {
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  emit('deleteTask', props.task.id);
  emit('close');
}

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
      class="bg-white dark:glass-panel-solid rounded-lg shadow-xl dark:shadow-card w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0"
      >
        <h3
          class="font-semibold text-gray-800 dark:text-white text-sm truncate"
        >
          {{ task.display_id || task.id }} - {{ task.title || 'Untitled' }}
        </h3>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-white ml-2 text-lg leading-none"
        >
          x
        </button>
      </div>

      <!-- Tabs -->
      <div
        class="flex border-b border-gray-200 dark:border-white/10 flex-shrink-0"
      >
        <button
          :class="[
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'tags'
              ? 'text-blue-600 dark:text-neon-cyan border-b-2 border-blue-600 dark:border-neon-cyan'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          ]"
          @click="activeTab = 'tags'"
        >
          Tags
        </button>
        <button
          :class="[
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'comments'
              ? 'text-blue-600 dark:text-neon-cyan border-b-2 border-blue-600 dark:border-neon-cyan'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          ]"
          @click="activeTab = 'comments'"
        >
          Comments
          <span
            v-if="comments.length > 0"
            class="ml-1 text-xs bg-gray-200 dark:bg-white/10 rounded-full px-1.5"
          >
            {{ comments.length }}
          </span>
        </button>
        <button
          :class="[
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-neon-cyan border-b-2 border-blue-600 dark:border-neon-cyan'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          ]"
          @click="activeTab = 'settings'"
        >
          Settings
        </button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Tags Tab -->
        <div v-if="activeTab === 'tags'" class="space-y-3">
          <div class="flex flex-col gap-2">
            <button
              v-for="tag in orderedTags"
              :key="tag.id"
              :class="[
                'px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 border-2',
                currentTagId === tag.id
                  ? getTagColorClasses(tag.color).pillActive +
                    ' border-current shadow-md scale-[1.02]'
                  : getTagColorClasses(tag.color).pill +
                    ' border-transparent hover:border-gray-300 dark:hover:border-white/20',
              ]"
              @click="selectTag(tag.id)"
            >
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="getTagColorClasses(tag.color).dot"
              ></span>
              <span class="flex-1 text-left">{{ tag.name }}</span>
              <span v-if="currentTagId === tag.id" class="text-xs font-bold"
                >✓</span
              >
              <button
                v-if="!tag.is_builtin"
                class="ml-1 text-current opacity-50 hover:opacity-100 text-xs"
                title="Delete tag"
                @click.stop="handleDeleteTag(tag.id)"
              >
                ✕
              </button>
            </button>
          </div>

          <!-- Clear tag -->
          <button
            v-if="currentTagId"
            class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            @click="selectTag(null)"
          >
            Clear tag
          </button>

          <!-- Create tag -->
          <div
            v-if="showCreateTag"
            class="space-y-2 pt-2 border-t border-gray-200 dark:border-white/10"
          >
            <input
              v-model="newTagName"
              type="text"
              placeholder="Tag name"
              class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-white/20 rounded-lg dark:bg-neon-bg-700 dark:text-white focus:ring-1 focus:ring-blue-500 dark:focus:ring-neon-cyan"
              @keyup.enter="handleCreateTag"
            />
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="color in TAG_COLOR_PALETTE"
                :key="color.id"
                :class="[
                  'w-6 h-6 rounded-full border-2 transition-all',
                  getTagColorClasses(color.id).dot,
                  newTagColor === color.id
                    ? 'border-gray-800 dark:border-white scale-110'
                    : 'border-transparent hover:border-gray-400 dark:hover:border-gray-500',
                ]"
                :title="color.name"
                @click="newTagColor = color.id"
              ></button>
            </div>
            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-xs bg-blue-600 dark:bg-neon-cyan/80 text-white dark:text-neon-bg-900 rounded-lg hover:bg-blue-700 dark:hover:bg-neon-cyan transition-colors font-medium"
                @click="handleCreateTag"
              >
                Save
              </button>
              <button
                class="px-3 py-1 text-xs bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                @click="showCreateTag = false"
              >
                Cancel
              </button>
            </div>
          </div>
          <button
            v-else
            class="text-xs text-blue-600 dark:text-neon-cyan hover:underline"
            @click="showCreateTag = true"
          >
            + Create Tag
          </button>
        </div>

        <!-- Comments Tab -->
        <div v-if="activeTab === 'comments'" class="space-y-3">
          <!-- Comment input -->
          <div class="flex gap-2">
            <input
              v-model="commentText"
              type="text"
              placeholder="Add a comment..."
              class="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-white/20 rounded-lg dark:bg-neon-bg-700 dark:text-white focus:ring-1 focus:ring-blue-500 dark:focus:ring-neon-cyan"
              @keyup.enter="handleAddComment"
            />
            <button
              class="px-3 py-1.5 text-xs bg-blue-600 dark:bg-neon-cyan/80 text-white dark:text-neon-bg-900 rounded-lg hover:bg-blue-700 dark:hover:bg-neon-cyan transition-colors font-medium disabled:opacity-50"
              :disabled="!commentText.trim() || submittingComment"
              @click="handleAddComment"
            >
              Add
            </button>
          </div>

          <!-- Comments list -->
          <div v-if="loadingComments" class="text-center py-4">
            <p class="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
          </div>
          <div v-else-if="comments.length === 0" class="text-center py-4">
            <p class="text-sm text-gray-400 dark:text-gray-500">
              No comments yet
            </p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="bg-gray-50 dark:bg-neon-bg-700/50 rounded-lg px-3 py-2"
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

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="space-y-4">
          <div
            class="border border-red-200 dark:border-red-800/50 rounded-lg p-4"
          >
            <h4 class="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
              Danger Zone
            </h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Permanently delete this task. This action cannot be undone.
            </p>
            <button
              :class="[
                'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50',
              ]"
              @click="handleDeleteTask"
            >
              {{
                confirmDelete ? 'Click again to confirm delete' : 'Delete Task'
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
