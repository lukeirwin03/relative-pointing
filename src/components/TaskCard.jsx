import React from 'react';

export function TaskCard({ task, isDragging = false }) {
  return (
    <div className={`bg-white p-3 rounded shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      <div className="text-xs text-gray-500 mb-1">{task.title}</div>
      <p className="text-sm font-medium text-gray-800">{task.id}</p>
      {task.description && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}

export default TaskCard;
