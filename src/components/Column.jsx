import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import TaskInfoModal from './TaskInfoModal';
import { buildJiraUrl, detectJiraBaseUrl } from '../utils/jiraUrlBuilder';

// Available color options for task tags
const COLOR_OPTIONS = [
  {
    id: null,
    name: 'None',
    bg: 'bg-white dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-500',
  },
  {
    id: 'red',
    name: 'Red',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-400',
    dot: 'bg-red-500',
  },
  {
    id: 'orange',
    name: 'Orange',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-400',
    dot: 'bg-orange-500',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-400',
    dot: 'bg-yellow-500',
  },
  {
    id: 'green',
    name: 'Green',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-400',
    dot: 'bg-green-500',
  },
  {
    id: 'blue',
    name: 'Blue',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400',
    dot: 'bg-blue-500',
  },
  {
    id: 'purple',
    name: 'Purple',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400',
    dot: 'bg-purple-500',
  },
  {
    id: 'pink',
    name: 'Pink',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-400',
    dot: 'bg-pink-500',
  },
];

function getColorClasses(colorTag) {
  const color = COLOR_OPTIONS.find((c) => c.id === colorTag);
  return color || COLOR_OPTIONS[0];
}

function Column({
  columnId,
  title,
  tasks = [],
  canDrag = false,
  variant = 'default',
  onDelete = null,
  onDeleteTask = null,
  onUpdateTaskColor = null,
  jiraBaseUrl = null,
}) {
  const [selectedTask, setSelectedTask] = useState(null);
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  // Styling based on variant
  const baseClasses =
    'rounded-lg p-4 w-[300px] flex-shrink-0 transition-colors flex flex-col';
  const variantClasses =
    variant === 'tasks'
      ? `${isOver ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-400' : 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700'}`
      : `${isOver ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-400' : 'bg-gray-100 dark:bg-gray-800'}`;

  const titleClasses =
    variant === 'tasks'
      ? 'text-lg font-bold text-blue-900 dark:text-blue-200'
      : 'font-semibold text-gray-700 dark:text-gray-200';

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
          {!tasks || tasks.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No tasks yet
            </p>
          ) : (
            tasks
              .filter((task) => task && task.id) // Filter out invalid tasks
              .map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDeleteTask={onDeleteTask}
                  onUpdateColor={onUpdateTaskColor}
                  onShowInfo={setSelectedTask}
                  jiraBaseUrl={jiraBaseUrl}
                />
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

function ColorPicker({ currentColor, onSelectColor, onClose }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-2 z-50"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.id || 'none'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectColor(color.id);
              onClose();
            }}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              color.dot || 'bg-gray-200 dark:bg-gray-600'
            } ${currentColor === color.id ? 'ring-2 ring-offset-1 ring-gray-400' : ''} ${
              color.id === null
                ? 'border-gray-400 dark:border-gray-500'
                : 'border-transparent'
            }`}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onDeleteTask = null,
  onUpdateColor = null,
  onShowInfo = null,
  jiraBaseUrl = null,
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging, transform } =
    useDraggable({
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

  const handleColorSelect = (colorId) => {
    if (onUpdateColor) {
      onUpdateColor(task.id, colorId);
    }
  };

  const colorClasses = getColorClasses(task.color_tag);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${colorClasses.bg} p-3 rounded shadow-sm cursor-grab active:cursor-grabbing transition-opacity group relative ${
        isDragging ? 'opacity-30 shadow-lg' : 'hover:shadow-md'
      } ${task.color_tag ? `border-l-4 ${colorClasses.border}` : ''}`}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {(() => {
            const baseUrl = jiraBaseUrl || detectJiraBaseUrl(task.id);
            const jiraUrl = buildJiraUrl(baseUrl, task.id);

            return jiraUrl ? (
              <a
                href={jiraUrl}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(jiraUrl, '_blank', 'noopener,noreferrer');
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-words"
                title={`Open ${task.id} in Jira`}
              >
                {task.id}
              </a>
            ) : (
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                {task.id}
              </p>
            );
          })()}
          {task.title && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words line-clamp-2">
              {task.title}
            </p>
          )}
        </div>
      </div>
      {onDeleteTask && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        {onUpdateColor && (
          <div className="relative">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
              title="Set color tag"
            >
              <span
                className={`w-3 h-3 rounded-full ${colorClasses.dot || 'bg-gray-300 dark:bg-gray-500'}`}
              ></span>
              color
            </button>
            {showColorPicker && (
              <ColorPicker
                currentColor={task.color_tag}
                onSelectColor={handleColorSelect}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>
        )}
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
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View task details"
          >
            details
          </button>
        )}
      </div>
    </div>
  );
}

export default Column;
