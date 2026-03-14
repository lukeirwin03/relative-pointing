import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import APIService from '../services/api';
import { useUserStore } from './user';

const LOG_PREFIX = '[BOARD]';

export const useSessionStore = defineStore('session', () => {
  // ---------------------------------------------------------------------------
  // Core state (synced from backend via polling every 2s)
  // ---------------------------------------------------------------------------
  const session = ref(null);
  const participants = ref([]);
  const tasks = ref([]);
  const columns = ref([]);
  const tags = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const roomCode = ref(null);
  const serverConfig = ref({ offlineThresholdSeconds: 15 });

  // ---------------------------------------------------------------------------
  // Optimistic state
  //
  // These overlay backend state to give instant UI feedback while API calls
  // are in-flight. Reconciliation watchers clean them up once backend catches up.
  //
  //   optimisticTasks   — task overrides keyed by ID (column_id, tag_id changes)
  //   optimisticColumns — columns that exist locally but aren't confirmed by backend yet
  //   deletedTaskIds    — tasks hidden from display while delete API is in-flight
  //   deletedColumnIds  — columns hidden from display while delete API is in-flight
  //   pendingMoves      — task IDs with in-flight move API calls; reconciliation
  //                        skips these to prevent polling from reverting the UI
  // ---------------------------------------------------------------------------
  const optimisticTasks = ref({});
  const optimisticColumns = ref([]);
  const deletedTaskIds = ref(new Set());
  const deletedColumnIds = ref(new Set());
  const pendingMoves = ref(new Set());

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------
  let pollInterval = null;

  // ---------------------------------------------------------------------------
  // Display state — merge optimistic + backend for the UI
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Reconciliation — clean up optimistic state once backend catches up
  // ---------------------------------------------------------------------------

  // Tasks: clear optimistic overlay when backend matches.
  // Skip tasks with in-flight operations (pendingMoves) to prevent flicker.
  watch(tasks, (newTasks) => {
    const updated = { ...optimisticTasks.value };
    let hasChanges = false;

    Object.keys(updated).forEach((taskId) => {
      if (pendingMoves.value.has(taskId)) return;

      const optimisticTask = updated[taskId];
      const backendTask = newTasks.find((t) => String(t.id) === String(taskId));

      if (
        backendTask &&
        backendTask.column_id === optimisticTask.column_id &&
        backendTask.tag_id === optimisticTask.tag_id
      ) {
        delete updated[taskId];
        hasChanges = true;
      }
    });

    if (hasChanges) optimisticTasks.value = updated;
  });

  // Columns: clear optimistic columns once backend confirms them.
  // Clear deletedColumnIds for columns that no longer exist in backend.
  watch(columns, (newColumns) => {
    if (newColumns && newColumns.length > 0) {
      const backendColumnIds = new Set(newColumns.map((c) => c.id));

      // Remove optimistic columns that now exist in backend
      const remaining = optimisticColumns.value.filter(
        (c) => !backendColumnIds.has(c.id)
      );
      if (remaining.length !== optimisticColumns.value.length) {
        optimisticColumns.value = remaining;
      }

      // Stop hiding columns that the backend already deleted
      const newDeleted = new Set(
        [...deletedColumnIds.value].filter((id) => backendColumnIds.has(id))
      );
      if (newDeleted.size !== deletedColumnIds.value.size) {
        deletedColumnIds.value = newDeleted;
      }
    } else {
      // Backend has no columns — clear all optimistic deletions
      if (deletedColumnIds.value.size > 0) {
        deletedColumnIds.value = new Set();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Session fetching & polling
  // ---------------------------------------------------------------------------
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
      tags.value = data.tags || [];
      if (data.config) serverConfig.value = data.config;
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
    tags.value = [];
    loading.value = true;
    error.value = null;
    optimisticTasks.value = {};
    optimisticColumns.value = [];
    deletedTaskIds.value = new Set();
    deletedColumnIds.value = new Set();
    pendingMoves.value = new Set();
  }

  // ---------------------------------------------------------------------------
  // Turn-based computed properties
  // ---------------------------------------------------------------------------
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

  const isStarted = computed(() => !!session.value?.started_at);
  const isEnded = computed(() => !!session.value?.ended_at);

  // ---------------------------------------------------------------------------
  // Turn-based actions
  // ---------------------------------------------------------------------------
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

  async function startSession({ autoMoveTopTask = false } = {}) {
    if (!roomCode.value) return;
    const userStore = useUserStore();
    try {
      await APIService.startSession(roomCode.value, userStore.userId);
      await fetchSession(); // sync started_at + turn assignment

      if (autoMoveTopTask && topUnsortedTask.value) {
        const taskId = String(topUnsortedTask.value.id);
        const columnId = `column-${Date.now()}`;
        await APIService.createColumn(
          roomCode.value,
          columnId,
          'New Column',
          1
        );
        await APIService.moveTask(
          roomCode.value,
          taskId,
          columnId,
          userStore.userId
        );
        await fetchSession(); // sync the new column + task position
      }
    } catch (err) {
      console.error('Error starting session:', err);
      throw err;
    }
  }

  async function endSession() {
    if (!roomCode.value) return;
    const userStore = useUserStore();
    try {
      await APIService.endSession(roomCode.value, userStore.userId);
      await fetchSession();
    } catch (err) {
      console.error('Error ending session:', err);
      throw err;
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
      await fetchSession();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Column ordering helpers
  // ---------------------------------------------------------------------------

  /**
   * Compute the column_order value for a new column based on the drop zone ID.
   *
   * Zone ID conventions:
   *   "new-column"                → append to the right (after last column)
   *   "new-column-left"           → prepend to the left (before first column)
   *   "new-column-between-<id>"   → insert between <id> and its right neighbor
   */
  function computeColumnOrder(zoneId) {
    const allColumns = [...(columns.value || []), ...optimisticColumns.value];
    const sorted = [...allColumns].sort(
      (a, b) => (a.column_order || 0) - (b.column_order || 0)
    );

    if (zoneId === 'new-column-left') {
      const min =
        sorted.length > 0
          ? Math.min(...sorted.map((c) => c.column_order || 0))
          : 0;
      return min - 1;
    }

    if (zoneId.startsWith('new-column-between-')) {
      const leftColumnId = zoneId.replace('new-column-between-', '');
      const leftIndex = sorted.findIndex((c) => c.id === leftColumnId);
      if (leftIndex !== -1 && leftIndex < sorted.length - 1) {
        const leftOrder = sorted[leftIndex].column_order || 0;
        const rightOrder = sorted[leftIndex + 1].column_order || 0;
        return (leftOrder + rightOrder) / 2;
      }
      // Fallthrough: left column is rightmost → treat as append-right
    }

    // Default: append to the right
    const max =
      sorted.length > 0
        ? Math.max(...sorted.map((c) => c.column_order || 0))
        : 0;
    return max + 1;
  }

  /** Returns true if zoneId is a "create new column" drop zone. */
  function isNewColumnZone(zoneId) {
    return (
      zoneId === 'new-column' ||
      zoneId === 'new-column-left' ||
      String(zoneId).startsWith('new-column-between')
    );
  }

  // ---------------------------------------------------------------------------
  // Helper: get a task's effective column_id (optimistic state over backend)
  // ---------------------------------------------------------------------------
  function getEffectiveColumnId(taskIdStr) {
    const optimistic = optimisticTasks.value[taskIdStr];
    if (optimistic) return optimistic.column_id;
    const backend = tasks.value.find((t) => String(t.id) === taskIdStr);
    return backend ? backend.column_id : null;
  }

  // ---------------------------------------------------------------------------
  // Helper: hide an empty column immediately and delete it on the server
  //
  // Called after a task is successfully moved out of a column. Checks whether
  // the source column is now empty (using displayTasks to account for other
  // optimistic moves) and if so, hides it instantly via deletedColumnIds
  // before the async server delete.
  // ---------------------------------------------------------------------------
  function cleanupEmptyColumn(columnId, excludeTaskId) {
    if (!columnId || columnId === 'unsorted') return;

    const remaining = displayTasks.value.filter(
      (t) => t.column_id === columnId && String(t.id) !== excludeTaskId
    );

    if (remaining.length > 0) return;

    console.log(LOG_PREFIX, 'Column empty, removing:', columnId);

    // Hide immediately so the UI doesn't show an empty column
    deletedColumnIds.value = new Set([...deletedColumnIds.value, columnId]);

    // Also remove from optimistic columns if it was a preview column
    optimisticColumns.value = optimisticColumns.value.filter(
      (c) => c.id !== columnId
    );

    // Delete on server (best-effort — column is already hidden)
    APIService.deleteColumn(roomCode.value, columnId).catch((err) => {
      console.warn(
        LOG_PREFIX,
        'Failed to delete empty column on server:',
        columnId,
        err.message
      );
      // Don't revert deletedColumnIds — the column is genuinely empty.
      // Polling reconciliation will clean up the deletedColumnIds entry
      // once the backend no longer returns this column.
    });
  }

  // ---------------------------------------------------------------------------
  // Core action: move a task to a column (or create a new column via drop zone)
  //
  // Operations handled:
  //   1. MOVE unsorted → existing column
  //   2. MOVE column A → column B
  //   3. MOVE column → unsorted (return to queue)
  //   4. CREATE new column + move task into it (via drop zone)
  //   5. DESTROY empty source column (auto-cleanup after move)
  //
  // Guards:
  //   - Must be current turn user and not disabled
  //   - Task must not already have an in-flight move (prevents race conditions)
  //   - Task must not already be in the target column
  //
  // Sequence:
  //   1. Validate guards
  //   2. If drop zone → create optimistic preview column
  //   3. Apply optimistic task move (instant UI)
  //   4. Mark task as pending (protects from polling reconciliation)
  //   5. Server: create column if needed (bail on failure)
  //   6. Server: move task
  //   7. Clean up empty source column (hide + delete)
  //   8. On failure: revert all optimistic state
  //   9. Always: clear pending flag
  // ---------------------------------------------------------------------------
  async function moveTaskToColumn(taskId, targetColumnId, userId) {
    const taskIdStr = String(taskId);

    // --- Guard: turn check ---
    if (!isMyTurn.value || isCurrentUserDisabled.value) {
      console.warn(
        LOG_PREFIX,
        'Move rejected: not your turn or disabled',
        taskIdStr
      );
      return;
    }

    // --- Guard: task already has an in-flight move ---
    if (pendingMoves.value.has(taskIdStr)) {
      console.warn(
        LOG_PREFIX,
        'Move rejected: task already in-flight',
        taskIdStr
      );
      return;
    }

    // --- Guard: task exists ---
    const backendTask = tasks.value.find((t) => String(t.id) === taskIdStr);
    if (!backendTask) {
      console.warn(
        LOG_PREFIX,
        'Move rejected: task not found in backend state',
        taskIdStr
      );
      return;
    }

    // --- Guard: not a no-op (check effective column, not stale backend) ---
    const effectiveColumnId = getEffectiveColumnId(taskIdStr);
    if (effectiveColumnId === targetColumnId) {
      console.log(
        LOG_PREFIX,
        'Move skipped: task already in target column',
        taskIdStr,
        targetColumnId
      );
      return;
    }

    const sourceColumnId = effectiveColumnId || backendTask.column_id;

    // --- Step 2: If dropping on a drop zone, create a preview column ---
    let newColumnData = null;
    let actualTargetColumnId = targetColumnId;

    if (isNewColumnZone(targetColumnId)) {
      actualTargetColumnId = `column-${Date.now()}`;
      const order = computeColumnOrder(targetColumnId);
      newColumnData = {
        id: actualTargetColumnId,
        name: 'New Column',
        column_order: order,
      };
      optimisticColumns.value = [...optimisticColumns.value, newColumnData];
      console.log(
        LOG_PREFIX,
        'Preview column created:',
        actualTargetColumnId,
        'order:',
        order,
        'zone:',
        targetColumnId
      );
    }

    // --- Step 3: Optimistic task update ---
    const existingOptimistic = optimisticTasks.value[taskIdStr];
    optimisticTasks.value = {
      ...optimisticTasks.value,
      [taskIdStr]: {
        ...backendTask,
        column_id: actualTargetColumnId,
        // Preserve any in-flight tag change
        ...(existingOptimistic?.tag_id != null
          ? { tag_id: existingOptimistic.tag_id }
          : {}),
      },
    };

    console.log(
      LOG_PREFIX,
      'Move:',
      taskIdStr,
      sourceColumnId,
      '→',
      actualTargetColumnId
    );

    // --- Step 4: Mark pending ---
    pendingMoves.value = new Set([...pendingMoves.value, taskIdStr]);

    // --- Steps 5-7: Server calls ---
    try {
      // 5a. Create column on server (if needed)
      if (newColumnData) {
        await APIService.createColumn(
          roomCode.value,
          newColumnData.id,
          newColumnData.name,
          newColumnData.column_order
        );
        console.log(LOG_PREFIX, 'Column created on server:', newColumnData.id);
      }

      // 6. Move task on server
      await APIService.moveTask(
        roomCode.value,
        taskIdStr,
        actualTargetColumnId,
        userId
      );
      console.log(
        LOG_PREFIX,
        'Task moved on server:',
        taskIdStr,
        '→',
        actualTargetColumnId
      );

      // 7. Clean up empty source column
      cleanupEmptyColumn(sourceColumnId, taskIdStr);
    } catch (err) {
      // 8. Revert all optimistic state on failure
      console.error(
        LOG_PREFIX,
        'Move failed, reverting:',
        taskIdStr,
        err.message
      );

      const updated = { ...optimisticTasks.value };
      delete updated[taskIdStr];
      optimisticTasks.value = updated;

      if (newColumnData) {
        optimisticColumns.value = optimisticColumns.value.filter(
          (c) => c.id !== newColumnData.id
        );
      }
    } finally {
      // 9. Clear pending flag — allows polling to reconcile this task
      const remaining = new Set(pendingMoves.value);
      remaining.delete(taskIdStr);
      pendingMoves.value = remaining;
    }
  }

  // ---------------------------------------------------------------------------
  // Delete a task (and clean up its column if it was the last one)
  // ---------------------------------------------------------------------------
  async function deleteTask(taskId) {
    const taskIdStr = String(taskId);
    const deletedTask = tasks.value.find((t) => String(t.id) === taskIdStr);
    if (!deletedTask) {
      console.warn(LOG_PREFIX, 'Delete rejected: task not found', taskIdStr);
      return;
    }

    console.log(LOG_PREFIX, 'Deleting task:', taskIdStr);
    deletedTaskIds.value = new Set([...deletedTaskIds.value, taskIdStr]);

    try {
      await APIService.deleteTask(roomCode.value, taskId);
      console.log(LOG_PREFIX, 'Task deleted on server:', taskIdStr);

      // Clean up the column if it's now empty
      cleanupEmptyColumn(deletedTask.column_id, taskIdStr);
    } catch (err) {
      console.error(
        LOG_PREFIX,
        'Delete failed, reverting:',
        taskIdStr,
        err.message
      );
      console.error('Failed to delete task:', err.message);
      const updated = new Set(deletedTaskIds.value);
      updated.delete(taskIdStr);
      deletedTaskIds.value = updated;
    }
  }

  // ---------------------------------------------------------------------------
  // Tag management
  // ---------------------------------------------------------------------------
  function updateTaskTag(taskId, tagId) {
    const taskIdStr = String(taskId);
    const existingOptimistic = optimisticTasks.value[taskIdStr];
    const serverTask = tasks.value.find((t) => String(t.id) === taskIdStr);
    const task = existingOptimistic || serverTask;
    if (!task) return;

    optimisticTasks.value = {
      ...optimisticTasks.value,
      [taskIdStr]: { ...task, tag_id: tagId },
    };

    APIService.updateTaskTag(roomCode.value, taskId, tagId).catch((err) => {
      console.error('Error updating task tag:', err);
      const updated = { ...optimisticTasks.value };
      delete updated[taskIdStr];
      optimisticTasks.value = updated;
    });
  }

  async function createTag(name, color) {
    if (!roomCode.value) return;
    try {
      const newTag = await APIService.createTag(roomCode.value, name, color);
      tags.value = [...tags.value, newTag];
      return newTag;
    } catch (err) {
      console.error('Error creating tag:', err);
      throw err;
    }
  }

  async function deleteTag(tagId) {
    if (!roomCode.value) return;
    try {
      await APIService.deleteTag(roomCode.value, tagId);
      tags.value = tags.value.filter((t) => t.id !== tagId);
    } catch (err) {
      console.error('Error deleting tag:', err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    // State
    session,
    participants,
    tasks,
    columns,
    tags,
    loading,
    error,
    roomCode,
    serverConfig,
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
    isStarted,
    isEnded,
    // Actions
    startPolling,
    stopPolling,
    resetState,
    moveTaskToColumn,
    deleteTask,
    updateTaskTag,
    createTag,
    deleteTag,
    endTurn,
    startSession,
    endSession,
    toggleStackMode,
    skipTopTask,
    transferOwnership,
  };
});
