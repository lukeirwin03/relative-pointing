// src/components/TaskBoard.jsx
// Main board component for displaying and managing tasks

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { useSession } from '../hooks/useSession';
import { useTurnManager } from '../hooks/useTurnManager';
import APIService from '../services/api';
import CSVUploader from './CSVUploader';
import Column from './Column';
import ParticipantList from './ParticipantList';
import SessionComplete from './SessionComplete';
import CreateTaskModal from './CreateTaskModal';
import { useTheme } from '../hooks/useTheme';

function CreateColumnDropZone({ zoneId = 'new-column', isFirst = false }) {
  const { setNodeRef, isOver } = useDroppable({
    id: zoneId,
  });

  const widthClass = isFirst ? 'min-w-[50px]' : 'min-w-[20px]';

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg ${widthClass} flex-shrink-0 min-h-[500px] border-2 border-dashed flex items-center justify-center text-center transition-all duration-300 ease-out transform ${
        isOver
          ? 'border-green-400 bg-green-50 shadow-md'
          : 'border-gray-300 bg-gray-50'
      }`}
    />
  );
}

function TaskBoard({ user }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { session, participants, tasks, columns, loading } = useSession(roomCode);
  const { isMyTurn, getCurrentTurnUser, nextTurn } = useTurnManager(
    roomCode,
    participants,
    user?.id
  );

  const { isDark, toggleTheme } = useTheme();

  const [showComplete, setShowComplete] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [optimisticTasks, setOptimisticTasks] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = String(active.id);
    let targetColumnId = over.id;
    const draggedTask = tasks.find((t) => String(t.id) === taskId);

    if (!draggedTask) return;

    // Prevent dragging to the same column
    if (draggedTask.column_id === targetColumnId) return;

    // If dragging to "create new column" zone
    if (targetColumnId === 'new-column' || targetColumnId === 'new-column-left' || String(targetColumnId).startsWith('new-column-between')) {
      try {
        let newColumnOrder;
        const isLeftZone = targetColumnId === 'new-column-left';

        // Calculate order: left columns get negative order, right columns get positive
        if (isLeftZone) {
          // Insert to the left - get the minimum order and go lower
          const minOrder = columns?.length > 0
            ? Math.min(...columns.map(c => c.column_order || 0))
            : 0;
          newColumnOrder = minOrder - 1;
        } else {
          // Insert to the right or between - get the maximum order and go higher
          const maxOrder = columns?.length > 0
            ? Math.max(...columns.map(c => c.column_order || 0))
            : 0;
          newColumnOrder = maxOrder + 1;
        }

        targetColumnId = `column-${Date.now()}`;

        // Create the column in database
        await APIService.createColumn(roomCode, targetColumnId, 'New Column', newColumnOrder);
      } catch (err) {
        console.error('Error creating column:', err);
        return;
      }
    }

    // Optimistic update - update UI immediately
    setOptimisticTasks((prev) => ({
      ...prev,
      [taskId]: { ...draggedTask, column_id: targetColumnId },
    }));

    // Update database in background
    try {
      await APIService.moveTask(roomCode, taskId, targetColumnId, user?.id);

      // Check if the source column is now empty and delete it
      const sourceColumnId = draggedTask.column_id;
      if (sourceColumnId && sourceColumnId !== 'unsorted' && sourceColumnId !== targetColumnId) {
        // Use the raw tasks array (not displayTasks) to check remaining tasks
        const tasksInSourceColumn = tasks.filter(
          (t) => String(t.id) !== taskId && t.column_id === sourceColumnId
        );

        // If source column is now empty, delete it
        if (tasksInSourceColumn.length === 0) {
          try {
            await APIService.deleteColumn(roomCode, sourceColumnId);
          } catch (deleteErr) {
            console.error('Error deleting empty column:', deleteErr);
            // Don't fail the whole operation if column deletion fails
          }
        }
      }

      // Advance to next player's turn after successful placement
      try {
        await nextTurn();
      } catch (turnErr) {
        console.error('Error advancing turn:', turnErr);
        // Don't fail the whole operation if turn advancement fails
      }
    } catch (err) {
      console.error('Error moving task:', err);
      // Revert optimistic update on error
      setOptimisticTasks((prev) => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
    }
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      // Reset copied message after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const handleDeleteColumn = async (columnId, task) => {
    try {
      // Move task back to unsorted
      await APIService.moveTask(roomCode, String(task.id), 'unsorted', user?.id);
      // Delete the column from database
      await APIService.deleteColumn(roomCode, columnId);

      // Update optimistic tasks
      setOptimisticTasks((prev) => ({
        ...prev,
        [String(task.id)]: { ...task, column_id: 'unsorted' },
      }));
    } catch (err) {
      console.error('Error deleting column:', err);
    }
  };

  const handleTaskCreated = (newTask) => {
    // The task list will be automatically refreshed via the useSession hook
    // since it listens to the database for changes
    setShowCreateTask(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Session not found</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Create New Session
          </a>
        </div>
      </div>
    );
  }

  const isCreator = user?.id === session.metadata?.createdBy;
  const currentTurnUser = getCurrentTurnUser();

  // Merge optimistic updates with actual tasks
  const displayTasks = tasks.map((task) =>
    optimisticTasks[String(task.id)] || task
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
                title="Go to home"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Relative Pointing
                </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Room Code:{' '}
                <span
                  onClick={handleCopyRoomCode}
                  className="font-mono font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                  title="Click to copy"
                >
                  {roomCode}
                  {copied && ' ✓'}
                </span>
              </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <ParticipantList participants={participants} currentUser={user} currentTurnUser={currentTurnUser} />
            </div>
          </div>
        </div>
      </header>

      {/* Turn Indicator */}
      {currentTurnUser && (
        <div className={`py-4 px-4 text-center transition-colors border-b-2 ${isMyTurn ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600' : 'bg-amber-50 dark:bg-amber-900 border-amber-300 dark:border-amber-600'}`}>
          <p className="text-lg font-bold">
            {isMyTurn ? (
              <span className="text-blue-700 dark:text-blue-200">🎯 Your Turn! Place a task →</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-200">
                ⏳ Waiting for <strong>{currentTurnUser.name}</strong>
              </span>
            )}
          </p>
        </div>
      )}

      {/* CSV Uploader & Create Task (Creator Only) */}
      {isCreator && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <CSVUploader roomCode={roomCode} />
              </div>
              <button
                onClick={() => setShowCreateTask(true)}
                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors whitespace-nowrap"
                title="Add a new task manually"
              >
                + Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complexity Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="flex items-center justify-center gap-2 px-4">
          <div className="text-3xl text-gray-500 dark:text-gray-400">◀</div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-1 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-600 rounded"></div>
            <div className="text-center whitespace-nowrap">
              <div className="text-gray-600 dark:text-gray-300 font-semibold text-sm">Complexity</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Less ───→ More</div>
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded"></div>
          </div>
          <div className="text-3xl text-gray-500 dark:text-gray-400">▶</div>
        </div>
      </div>

      {/* Main Content - DndContext wraps everything for drag-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Task Board Area */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 flex justify-center">
            <div className="flex gap-4 min-h-full transition-all duration-200">
            {displayTasks && displayTasks.length > 0 ? (
              <>
                {/* If no columns exist yet, show only a single centered drop zone for the first task */}
                {columns && columns.length === 0 && activeId ? (
                  <CreateColumnDropZone key="create-first" zoneId="new-column" isFirst={true} />
                ) : (
                  <>
                    {/* Multiple columns exist - show left drop zone for creating simpler columns */}
                    {columns && columns.length > 0 && activeId && (
                      <CreateColumnDropZone key="create-left" zoneId="new-column-left" />
                    )}

                    {/* Complexity columns that were created, sorted by order */}
                    {columns && columns.length > 0 && (
                      [...columns].sort((a, b) => (a.column_order || 0) - (b.column_order || 0)).map((column, index, sortedColumns) => {
                        const columnTasks = displayTasks?.filter(
                          (task) => task.column_id === column.id
                        ) || [];
                        const isLastColumn = index === sortedColumns.length - 1;
                        return (
                          <React.Fragment key={`col-${column.id}`}>
                            <div className="transition-all duration-200">
                              <Column
                                columnId={column.id}
                                title={column.name}
                                tasks={columnTasks}
                                canDrag={isMyTurn}
                                onDelete={handleDeleteColumn}
                              />
                            </div>
                            {/* Create new column between existing columns - only show between columns, not after the last one */}
                            {activeId && columns.length > 1 && !isLastColumn && <CreateColumnDropZone key={`create-${index}`} zoneId={`new-column-between-${column.id}`} />}
                          </React.Fragment>
                        );
                      })
                    )}

                    {/* Right drop zone for creating more complex columns - only show when dragging and columns exist */}
                    {columns && columns.length > 0 && activeId && (
                      <CreateColumnDropZone key="create-right" zoneId="new-column" />
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="text-gray-400 text-center py-8 w-full">
                <p className="mb-2">No tasks yet</p>
                <p className="text-sm">Upload a CSV or use the sample data to get started</p>
              </div>
            )}
            </div>
          </div>

          {/* Tasks Queue Panel - Right Sidebar */}
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Column
                columnId="unsorted"
                title="Tasks"
                tasks={displayTasks.filter((t) => t.column_id === 'unsorted')}
                canDrag={isMyTurn}
                variant="tasks"
              />
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white dark:bg-gray-800 dark:text-gray-200 p-3 rounded shadow-lg opacity-50">
              {displayTasks.find((t) => String(t.id) === String(activeId))?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Complete Session Button */}
      {isCreator && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-7xl mx-auto flex justify-end">
            <button
              onClick={() => setShowComplete(true)}
              className="bg-green-600 dark:bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              Complete Session
            </button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          roomCode={roomCode}
          onTaskCreated={handleTaskCreated}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {/* Session Complete Modal */}
      {showComplete && (
        <SessionComplete
          roomCode={roomCode}
          onClose={() => setShowComplete(false)}
        />
      )}
    </div>
  );
}

export default TaskBoard;
