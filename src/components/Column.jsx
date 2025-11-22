import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import TaskInfoModal from './TaskInfoModal';

function Column({ columnId, title, tasks = [], canDrag = false, variant = 'default', onDelete = null, onDeleteTask = null }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  // Styling based on variant
  const baseClasses = 'rounded-lg p-4 w-[300px] flex-shrink-0 transition-colors flex flex-col';
  const variantClasses = variant === 'tasks'
    ? `${isOver ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-400' : 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700'}`
    : `${isOver ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-400' : 'bg-gray-100 dark:bg-gray-800'}`;

  const titleClasses = variant === 'tasks'
    ? 'text-lg font-bold text-blue-900 dark:text-blue-200'
    : 'font-semibold text-gray-700 dark:text-gray-200';

  // Show delete button only if column has exactly 1 task and is not the tasks queue
  const canDelete = variant !== 'tasks' && tasks.length === 1 && onDelete;

  return (
    <>
      <div
        ref={setNodeRef}
        className={`${baseClasses} ${variantClasses}`}
        style={{ minHeight: '500px' }}
      >
        {variant === 'tasks' && (
          <div className="flex items-center justify-between mb-3">
            <h3 className={`${titleClasses}`}>{title}</h3>
          </div>
        )}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No tasks yet</p>
          ) : (
            tasks.map(task => (
              <TaskItem key={task.id} task={task} onDeleteTask={onDeleteTask} onShowInfo={setSelectedTask} />
            ))
          )}
        </div>
      </div>

      {/* Task Info Modal */}
      {selectedTask && (
        <TaskInfoModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}

function TaskItem({ task, onDeleteTask = null, onShowInfo = null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform,
  } = useDraggable({
    id: task?.id ? String(task.id) : 'invalid',
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Validate task before rendering
  if (!task || !task.id) {
    return null;
  }

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteTask) {
      onDeleteTask(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-gray-700 p-3 rounded shadow-sm cursor-grab active:cursor-grabbing transition-opacity group relative ${
        isDragging ? 'opacity-30 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{task.description}</p>
          )}
        </div>
      </div>
      {(onDeleteTask || onShowInfo) && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onShowInfo && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowInfo(task);
              }}
              className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="View task details"
              aria-label="View task details"
            >
              ℹ
            </button>
          )}
          {onDeleteTask && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleDelete}
              className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete task"
              aria-label="Delete task"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Column;
