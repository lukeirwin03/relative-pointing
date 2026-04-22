<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { parseCSV, validateCSV } from '../utils/csvParser';
import APIService from '../services/api';
import {
  getCachedJiraBaseUrl,
  setCachedJiraBaseUrl,
} from '../utils/jiraUrlBuilder';
import CsvImportModal from './CsvImportModal.vue';

const props = defineProps({
  roomCode: {
    type: String,
    required: true,
  },
  isCreator: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['tasksImported']);

const isDragging = ref(false);
const isUploading = ref(false);
const error = ref(null);
const pendingImport = ref(null);
const fileInputRef = ref(null);

function openFilePicker() {
  fileInputRef.value?.click();
}

function handleFileInput(e) {
  const file = e.target.files?.[0];
  if (file) {
    processFile(file);
  }
  // Reset so the same file can be re-selected
  e.target.value = '';
}

defineExpose({ openFilePicker });

async function processFile(file) {
  error.value = null;

  try {
    const validation = await validateCSV(file);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const result = await parseCSV(file);

    if (result.tasks.length === 0) {
      throw new Error('No valid tasks found in CSV file');
    }

    if (!result.jiraBaseUrl) {
      result.jiraBaseUrl = getCachedJiraBaseUrl();
    }

    // Show confirmation modal instead of uploading immediately
    pendingImport.value = result;
  } catch (err) {
    console.error('CSV parse error:', err);
    error.value = err.message;
    setTimeout(() => (error.value = null), 5000);
  }
}

async function handleConfirmImport(selectedTasks, jiraBaseUrl) {
  isUploading.value = true;
  error.value = null;

  try {
    await APIService.uploadTasks(props.roomCode, selectedTasks, jiraBaseUrl);
    setCachedJiraBaseUrl(jiraBaseUrl);
    emit('tasksImported', selectedTasks.length);
    pendingImport.value = null;
  } catch (err) {
    console.error('CSV upload error:', err);
    error.value = err.message;
    setTimeout(() => (error.value = null), 5000);
    pendingImport.value = null;
  } finally {
    isUploading.value = false;
  }
}

function handleCancelImport() {
  pendingImport.value = null;
}

// Only react to external file drags, not internal SortableJS drags.
// External file drags have "Files" in dataTransfer.types;
// SortableJS internal drags do not.
function isFileDrag(e) {
  return e.dataTransfer && e.dataTransfer.types.includes('Files');
}

function handleDragOver(e) {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
}

function handleDragLeave(e) {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.clientX === 0 && e.clientY === 0) {
    isDragging.value = false;
  }
}

async function handleDrop(e) {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      await processFile(file);
    } else {
      error.value = 'Please drop a CSV file';
      setTimeout(() => (error.value = null), 3000);
    }
  }
}

onMounted(() => {
  if (!props.isCreator) return;
  document.addEventListener('dragover', handleDragOver, false);
  document.addEventListener('dragleave', handleDragLeave, false);
  document.addEventListener('drop', handleDrop, false);
});

onUnmounted(() => {
  document.removeEventListener('dragover', handleDragOver);
  document.removeEventListener('dragleave', handleDragLeave);
  document.removeEventListener('drop', handleDrop);
});
</script>

<template>
  <template v-if="isCreator">
    <!-- Hidden file input for button-triggered import -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".csv,text/csv"
      class="hidden"
      @change="handleFileInput"
    />

    <!-- Dragging overlay -->
    <div
      v-if="isDragging"
      class="fixed inset-0 bg-blue-500/20 dark:bg-accent-cyan/10 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none"
    >
      <div
        class="bg-warm-50 dark:glass-panel-solid p-8 rounded-lg shadow-2xl dark:shadow-glow-primary text-center"
      >
        <svg
          class="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-accent-cyan animate-bounce"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p class="text-lg font-semibold text-gray-800 dark:text-white">
          Drop CSV to import tasks
        </p>
      </div>
    </div>

    <!-- CSV Import Confirmation Modal -->
    <CsvImportModal
      v-if="pendingImport"
      :tasks="pendingImport.tasks"
      :file-name="pendingImport.fileName"
      :skipped-rows="pendingImport.skippedRows"
      :jira-base-url="pendingImport.jiraBaseUrl"
      @confirm="handleConfirmImport"
      @close="handleCancelImport"
    />

    <!-- Error message -->
    <div
      v-if="error"
      class="fixed top-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4 shadow-lg z-50 max-w-sm"
    >
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Loading indicator -->
    <div
      v-if="isUploading"
      class="fixed bottom-4 right-4 bg-warm-200 dark:bg-dark-bg-700 border border-warm-300 dark:border-accent-cyan/30 rounded-lg p-4 shadow-lg dark:shadow-glow-primary-sm z-50 flex items-center gap-3"
    >
      <div
        class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-accent-cyan"
      ></div>
      <p class="text-sm text-blue-600 dark:accent-text-primary">
        Importing tasks...
      </p>
    </div>
  </template>
</template>
