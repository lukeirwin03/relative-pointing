import { useState } from 'react';
import APIService from '../services/api';

function CreateTaskModal({ roomCode, onTaskCreated, onClose }) {
  const [issueKey, setIssueKey] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!issueKey.trim()) {
      setError('Issue key is required');
      return;
    }

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await APIService.createTask(roomCode, issueKey, title);

      if (result.success && result.task) {
        // Call the callback with the new task
        onTaskCreated(result.task);

        // Reset form
        setIssueKey('');
        setTitle('');

        // Close modal
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create task');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Create New Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Issue Key Field */}
          <div>
            <label
              htmlFor="issue-key"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Issue Key
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="issue-key"
              value={issueKey}
              onChange={(e) => setIssueKey(e.target.value.toUpperCase())}
              placeholder="e.g., PROJ-1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
              maxLength={20}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {issueKey.length}/20
            </p>
          </div>

          {/* Title Field */}
          <div>
            <label
              htmlFor="task-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Task Title
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={200}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {title.length}/200
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !issueKey.trim() || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;
