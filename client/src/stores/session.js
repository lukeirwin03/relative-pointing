import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import APIService from '../services/api';
import { useUserStore } from './user';

export const useSessionStore = defineStore('session', () => {
  // Core state from backend
  const session = ref(null);
  const participants = ref([]);
  const tasks = ref([]);
  const columns = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const roomCode = ref(null);

  // Optimistic state
  const optimisticTasks = ref({});
  const optimisticColumns = ref([]);
  const deletedTaskIds = ref(new Set());
  const deletedColumnIds = ref(new Set());

  // Polling
  let pollInterval = null;

  // Computed: merge optimistic state with backend state
  const displayColumns = computed(() => {
    const backendCols = (columns.value || []).filter(
      (col) => !deletedColumnIds.value.has(col.id)
    );
    const optimisticOnly = optimisticColumns.value.filter(
      (col) => !columns.value?.some((c) => c.id === col.id)
    );
    return [...backendCols, ...optimisticOnly];
  });

  const displayTasks = computed(() => {
    return tasks.value
      .filter((task) => !deletedTaskIds.value.has(String(task.id)))
      .map((task) => optimisticTasks.value[String(task.id)] || task);
  });

  // Reconcile optimistic tasks when backend state updates
  watch(tasks, (newTasks) => {
    const updated = { ...optimisticTasks.value };
    let hasChanges = false;

    Object.keys(updated).forEach((taskId) => {
      const optimisticTask = updated[taskId];
      const backendTask = newTasks.find((t) => String(t.id) === String(taskId));

      if (
        backendTask &&
        backendTask.column_id === optimisticTask.column_id &&
        backendTask.color_tag === optimisticTask.color_tag
      ) {
        delete updated[taskId];
        hasChanges = true;
      }
    });

    if (hasChanges) optimisticTasks.value = updated;
  });

  // Reconcile optimistic columns when backend state updates
  watch(columns, (newColumns) => {
    if (newColumns && newColumns.length > 0) {
      const backendColumnIds = new Set(newColumns.map((c) => c.id));
      const remaining = optimisticColumns.value.filter(
        (c) => !backendColumnIds.has(c.id)
      );
      if (remaining.length !== optimisticColumns.value.length) {
        optimisticColumns.value = remaining;
      }
      // Clear deleted column ids that no longer exist
      const newDeleted = new Set(
        [...deletedColumnIds.value].filter((id) => backendColumnIds.has(id))
      );
      if (newDeleted.size !== deletedColumnIds.value.size) {
        deletedColumnIds.value = newDeleted;
      }
    }
  });

  async function fetchSession() {
    if (!roomCode.value) return;
    try {
      const userStore = useUserStore();
      const data = await APIService.getSession(
        roomCode.value,
        userStore.userId
      );
      session.value = data.session;
      participants.value = data.participants || [];
      tasks.value = data.tasks || [];
      columns.value = data.columns || [];
      error.value = null;
    } catch (err) {
      console.error('Session fetch error:', err);
      error.value = err.message || 'Session not found';
    } finally {
      loading.value = false;
    }
  }

  function startPolling(code) {
    stopPolling();
    roomCode.value = code;
    loading.value = true;
    fetchSession();
    pollInterval = setInterval(fetchSession, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function resetState() {
    session.value = null;
    participants.value = [];
    tasks.value = [];
    columns.value = [];
    loading.value = true;
    error.value = null;
    optimisticTasks.value = {};
    optimisticColumns.value = [];
    deletedTaskIds.value = new Set();
    deletedColumnIds.value = new Set();
  }

  // Turn-based computed properties
  const currentTurnUserId = computed(
    () => session.value?.current_turn_user_id || null
  );

  const turnStartedAt = computed(() => session.value?.turn_started_at || null);

  const stackMode = computed(() => !!session.value?.stack_mode);

  const currentTurnParticipant = computed(() => {
    if (!currentTurnUserId.value) return null;
    return participants.value.find(
      (p) => p.user_id === currentTurnUserId.value
    );
  });

  const topUnsortedTask = computed(() => {
    const unsorted = displayTasks.value
      .filter((t) => t.column_id === 'unsorted')
      .sort((a, b) => (a.task_order || 0) - (b.task_order || 0));
    return unsorted.length > 0 ? unsorted[0] : null;
  });

  const isMyTurn = computed(() => {
    const userStore = useUserStore();
    return currentTurnUserId.value === userStore.userId;
  });

  const isCurrentUserDisabled = computed(() => {
    const userStore = useUserStore();
    const skipped = session.value?.skipped_participants || [];
    return skipped.includes(userStore.userId);
  });

  // Turn-based actions
  async function endTurn() {
    if (!roomCode.value) return;
    const userStore = useUserStore();
    try {
      await APIService.endTurn(roomCode.value, userStore.userId);
    } catch (err) {
      console.error('Error ending turn:', err);
    }
  }

  async function toggleStackMode() {
    if (!roomCode.value) return;
    try {
      await APIService.updateStackMode(roomCode.value, !stackMode.value);
    } catch (err) {
      console.error('Error toggling stack mode:', err);
    }
  }

  async function skipTopTask() {
    if (!roomCode.value) return;
    try {
      await APIService.skipTopTask(roomCode.value);
    } catch (err) {
      console.error('Error skipping top task:', err);
    }
  }

  async function transferOwnership(newOwnerId) {
    if (!roomCode.value) return;
    const userStore = useUserStore();
    try {
      await APIService.transferOwnership(
        roomCode.value,
        userStore.userId,
        newOwnerId
      );
      // Immediately fetch to reflect the change
      await fetchSession();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      throw err;
    }
  }

  // Actions
  async function moveTaskToColumn(taskId, targetColumnId, userId) {
    if (!isMyTurn.value || isCurrentUserDisabled.value) return;

    const taskIdStr = String(taskId);
    const draggedTask = tasks.value.find((t) => String(t.id) === taskIdStr);
    if (!draggedTask) return;
    if (draggedTask.column_id === targetColumnId) return;

    let newColumnData = null;
    let actualTargetColumnId = targetColumnId;

    // Handle "create new column" zones
    if (
      targetColumnId === 'new-column' ||
      targetColumnId === 'new-column-left' ||
      String(targetColumnId).startsWith('new-column-between')
    ) {
      let newColumnOrder;
      const isLeftZone = targetColumnId === 'new-column-left';
      const isBetweenZone =
        String(targetColumnId).startsWith('new-column-between');
      const allColumns = [...(columns.value || []), ...optimisticColumns.value];
      const sortedCols = [...allColumns].sort(
        (a, b) => (a.column_order || 0) - (b.column_order || 0)
      );

      if (isLeftZone) {
        const minOrder =
          sortedCols.length > 0
            ? Math.min(...sortedCols.map((c) => c.column_order || 0))
            : 0;
        newColumnOrder = minOrder - 1;
      } else if (isBetweenZone) {
        // Extract the left column ID from "new-column-between-<columnId>"
        const leftColumnId = targetColumnId.replace('new-column-between-', '');
        const leftIndex = sortedCols.findIndex((c) => c.id === leftColumnId);
        if (leftIndex !== -1 && leftIndex < sortedCols.length - 1) {
          const leftOrder = sortedCols[leftIndex].column_order || 0;
          const rightOrder = sortedCols[leftIndex + 1].column_order || 0;
          newColumnOrder = (leftOrder + rightOrder) / 2;
        } else {
          // Fallback: place at end
          const maxOrder =
            sortedCols.length > 0
              ? Math.max(...sortedCols.map((c) => c.column_order || 0))
              : 0;
          newColumnOrder = maxOrder + 1;
        }
      } else {
        const maxOrder =
          sortedCols.length > 0
            ? Math.max(...sortedCols.map((c) => c.column_order || 0))
            : 0;
        newColumnOrder = maxOrder + 1;
      }

      actualTargetColumnId = `column-${Date.now()}`;
      newColumnData = {
        id: actualTargetColumnId,
        name: 'New Column',
        column_order: newColumnOrder,
      };

      optimisticColumns.value = [...optimisticColumns.value, newColumnData];
    }

    // Optimistic update
    const existingOptimistic = optimisticTasks.value[taskIdStr] || {};
    optimisticTasks.value = {
      ...optimisticTasks.value,
      [taskIdStr]: {
        ...draggedTask,
        ...existingOptimistic,
        column_id: actualTargetColumnId,
      },
    };

    const sourceColumnId = draggedTask.column_id;

    // Backend operations (non-blocking)
    try {
      if (newColumnData) {
        await APIService.createColumn(
          roomCode.value,
          newColumnData.id,
          newColumnData.name,
          newColumnData.column_order
        );
      }
      await APIService.moveTask(
        roomCode.value,
        taskIdStr,
        actualTargetColumnId,
        userId
      );

      // Clean up empty source column
      if (sourceColumnId && sourceColumnId !== 'unsorted') {
        const tasksInSource = tasks.value.filter(
          (t) => t.column_id === sourceColumnId && String(t.id) !== taskIdStr
        );
        if (tasksInSource.length === 0) {
          APIService.deleteColumn(roomCode.value, sourceColumnId).catch(
            () => {}
          );
        }
      }
    } catch (err) {
      console.error('Error moving task:', err);
      // Revert
      const updated = { ...optimisticTasks.value };
      delete updated[taskIdStr];
      optimisticTasks.value = updated;
      if (newColumnData) {
        optimisticColumns.value = optimisticColumns.value.filter(
          (c) => c.id !== newColumnData.id
        );
      }
    }
  }

  async function deleteTask(taskId) {
    const taskIdStr = String(taskId);
    const deletedTask = tasks.value.find((t) => String(t.id) === taskIdStr);
    if (!deletedTask) return;

    deletedTaskIds.value = new Set([...deletedTaskIds.value, taskIdStr]);

    try {
      await APIService.deleteTask(roomCode.value, taskId);

      const taskColumnId = deletedTask.column_id;
      if (taskColumnId && taskColumnId !== 'unsorted') {
        const tasksInColumn = displayTasks.value.filter(
          (t) => t.column_id === taskColumnId && String(t.id) !== taskIdStr
        );
        if (tasksInColumn.length === 0) {
          await APIService.deleteColumn(roomCode.value, taskColumnId).catch(
            (err) => console.error('Error deleting empty column:', err)
          );
        }
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task: ' + err.message);
      const updated = new Set(deletedTaskIds.value);
      updated.delete(taskIdStr);
      deletedTaskIds.value = updated;
    }
  }

  async function deleteColumn(columnId, task) {
    // Optimistic: move task to unsorted, mark column deleted
    optimisticTasks.value = {
      ...optimisticTasks.value,
      [String(task.id)]: { ...task, column_id: 'unsorted' },
    };
    deletedColumnIds.value = new Set([...deletedColumnIds.value, columnId]);
    optimisticColumns.value = optimisticColumns.value.filter(
      (c) => c.id !== columnId
    );

    try {
      await APIService.moveTask(
        roomCode.value,
        String(task.id),
        'unsorted',
        null
      );
      await APIService.deleteColumn(roomCode.value, columnId);
    } catch (err) {
      console.error('Error deleting column:', err);
      // Revert
      const updatedTasks = { ...optimisticTasks.value };
      delete updatedTasks[String(task.id)];
      optimisticTasks.value = updatedTasks;
      const updatedDeleted = new Set(deletedColumnIds.value);
      updatedDeleted.delete(columnId);
      deletedColumnIds.value = updatedDeleted;
    }
  }

  function updateTaskColor(taskId, colorTag) {
    const taskIdStr = String(taskId);
    const existingOptimistic = optimisticTasks.value[taskIdStr];
    const serverTask = tasks.value.find((t) => String(t.id) === taskIdStr);
    const task = existingOptimistic || serverTask;
    if (!task) return;

    optimisticTasks.value = {
      ...optimisticTasks.value,
      [taskIdStr]: { ...task, color_tag: colorTag },
    };

    APIService.updateTaskColor(roomCode.value, taskId, colorTag).catch(
      (err) => {
        console.error('Error updating task color:', err);
        const updated = { ...optimisticTasks.value };
        delete updated[taskIdStr];
        optimisticTasks.value = updated;
      }
    );
  }

  return {
    // State
    session,
    participants,
    tasks,
    columns,
    loading,
    error,
    roomCode,
    // Computed
    displayColumns,
    displayTasks,
    currentTurnUserId,
    turnStartedAt,
    stackMode,
    currentTurnParticipant,
    topUnsortedTask,
    isMyTurn,
    isCurrentUserDisabled,
    // Actions
    startPolling,
    stopPolling,
    resetState,
    moveTaskToColumn,
    deleteTask,
    deleteColumn,
    updateTaskColor,
    endTurn,
    toggleStackMode,
    skipTopTask,
    transferOwnership,
  };
});
