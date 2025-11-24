import React from 'react';

export function TaskCard({ task, isDragging = false }) {
  return (
    <div className={`bg-white p-2 rounded shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      <p className="text-sm font-medium text-gray-800">{task.id}</p>
    </div>
  );
}

export default TaskCard;
