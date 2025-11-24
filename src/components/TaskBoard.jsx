// src/components/TaskBoard.jsx
// Main board component for displaying and managing tasks

import React, { useState, useEffect } from 'react';
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
import APIService from '../services/api';
import Column from './Column';
import ParticipantList from './ParticipantList';
import CreateTaskModal from './CreateTaskModal';
import DropZoneOverlay from './DropZoneOverlay';
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

function TaskBoard({ user, onLogout }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { session, participants, tasks, columns, loading } = useSession(roomCode);

  const { isDark, toggleTheme } = useTheme();

   const [showCreateTask, setShowCreateTask] = useState(false);
   const [copied, setCopied] = useState(false);
   const [activeId, setActiveId] = useState(null);
   const [optimisticTasks, setOptimisticTasks] = useState({});
   const [deletedTaskIds, setDeletedTaskIds] = useState(new Set());
   const [jiraBaseUrl, setJiraBaseUrl] = useState(session?.jira_base_url || '');
   const [jiraUrlInput, setJiraUrlInput] = useState(session?.jira_base_url || '');
   const [showJiraUrlInput, setShowJiraUrlInput] = useState(false);

   // Update Jira URL when session changes
   useEffect(() => {
     if (session?.jira_base_url) {
       setJiraBaseUrl(session.jira_base_url);
       setJiraUrlInput(session.jira_base_url);
     }
   }, [session?.jira_base_url]);

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

   const handleSaveJiraUrl = async () => {
     try {
       await APIService.updateSessionJiraUrl(roomCode, jiraUrlInput);
       setJiraBaseUrl(jiraUrlInput);
       setShowJiraUrlInput(false);
     } catch (err) {
       console.error('Error saving Jira URL:', err);
       alert('Failed to save Jira URL: ' + err.message);
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

   const handleDeleteTask = async (taskId) => {
     // Optimistic update - remove from UI immediately
     const deletedTask = tasks.find((t) => String(t.id) === String(taskId));
     if (!deletedTask) return;

     // Mark task as deleted in optimistic UI state
     setDeletedTaskIds((prev) => new Set([...prev, String(taskId)]));

     try {
       // Delete from backend in background
       await APIService.deleteTask(roomCode, taskId);
     } catch (err) {
       console.error('Error deleting task:', err);
       alert('Failed to delete task: ' + err.message);
       // On error, revert the deletion by removing from deleted set
       setDeletedTaskIds((prev) => {
         const updated = new Set(prev);
         updated.delete(String(taskId));
         return updated;
       });
     }
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

  const isCreator = user?.id === session?.creator_id;

  // Merge optimistic updates with actual tasks, filtering out deleted ones
  const displayTasks = tasks
    .filter((task) => !deletedTaskIds.has(String(task.id)))
    .map((task) =>
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
               {isCreator && (
                 <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                   Jira Base URL:{' '}
                   {showJiraUrlInput ? (
                     <span className="inline-flex gap-2">
                       <input
                         type="text"
                         value={jiraUrlInput}
                         onChange={(e) => setJiraUrlInput(e.target.value)}
                         placeholder="https://company.atlassian.net"
                         className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                         autoFocus
                       />
                       <button
                         onClick={handleSaveJiraUrl}
                         className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                       >
                         Save
                       </button>
                       <button
                         onClick={() => setShowJiraUrlInput(false)}
                         className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded text-sm hover:bg-gray-400"
                       >
                         Cancel
                       </button>
                     </span>
                   ) : (
                     <span
                       onClick={() => {
                         setJiraUrlInput(jiraBaseUrl);
                         setShowJiraUrlInput(true);
                       }}
                       className="font-mono font-semibold cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                       title="Click to edit"
                     >
                       {jiraBaseUrl || 'Not set'} {jiraBaseUrl && '✎'}
                     </span>
                   )}
                 </p>
               )}
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
              {onLogout && (
                <button
                  onClick={() => {
                    navigate('/');
                    if (onLogout) onLogout();
                  }}
                  className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Logout"
                >
                  Logout
                </button>
              )}
              <ParticipantList participants={participants} currentUser={user} />
            </div>
          </div>
        </div>
      </header>

      {/* Complexity Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="flex items-center justify-center gap-2 px-4">
          <div className="text-3xl text-gray-500 dark:text-gray-400">◀</div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-1 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-600 rounded"></div>
            <div className="text-center whitespace-nowrap">
              <div className="text-gray-600 dark:text-gray-300 font-semibold text-sm">Complexity</div>
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
                                canDrag={true}
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto">
              <Column
                columnId="unsorted"
                title="Tasks"
                tasks={displayTasks.filter((t) => t.column_id === 'unsorted')}
                canDrag={true}
                variant="tasks"
                onDeleteTask={handleDeleteTask}
              />
            </div>
            {/* Create Task Button */}
            {isCreator && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="w-full px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium text-sm"
                  title="Add a new task manually"
                >
                  + Create Task
                </button>
              </div>
            )}
          </div>
        </div>

         <DragOverlay>
            {activeId ? (
              <div className="bg-white dark:bg-gray-800 dark:text-gray-200 p-2 rounded shadow-lg opacity-75 max-w-xs">
                {(() => {
                  const task = displayTasks.find((t) => String(t.id) === String(activeId));
                  return (
                    <>
                      <p className="text-sm font-medium">{task?.id}</p>
                      {task?.title && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{task.title}</p>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : null}
          </DragOverlay>
      </DndContext>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          roomCode={roomCode}
          onTaskCreated={handleTaskCreated}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {/* Drop Zone Overlay for CSV import */}
      <DropZoneOverlay
        roomCode={roomCode}
        isCreator={isCreator}
        onTasksImported={() => {
          // Task list will refresh automatically via useSession hook
        }}
      />
    </div>
  );
}

export default TaskBoard;
