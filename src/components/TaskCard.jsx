import React from 'react';

export function TaskCard({ task, isDragging = false }) {
  return (
    <div className={`bg-white p-2 rounded shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      <p className="text-sm font-medium text-gray-800">{task.id}</p>
      {task.title && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.title}</p>
      )}
    </div>
  );
}

export default TaskCard;
