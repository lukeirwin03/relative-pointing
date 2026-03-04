import React from 'react';
import { buildJiraUrl } from '../utils/jiraUrlBuilder';

function SessionComplete({ roomCode, sessionData, onClose }) {
  const handleOpenJiraTabs = (columnTasks) => {
    if (!sessionData?.jira_base_url || columnTasks.length === 0) {
      alert('No Jira base URL configured or no tasks in this column');
      return;
    }

    // Open Jira tabs for each task
    columnTasks.forEach((task, index) => {
      // Stagger the opens slightly to avoid blocking
      setTimeout(() => {
        const url = buildJiraUrl(sessionData.jira_base_url, task.jira_key);
        window.open(url, '_blank');
      }, index * 300);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Session Complete! 🎉</h2>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Great job! Your tasks have been organized. You can now open Jira
            tabs to assign points.
          </p>

          {sessionData?.columns && sessionData.columns.length > 0 ? (
            <div className="space-y-2">
              {sessionData.columns.map((column) => {
                const columnTasks =
                  sessionData.tasks?.filter((t) => t.column_id === column.id) ||
                  [];

                return (
                  <div key={column.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {column.name} ({columnTasks.length} tasks)
                      </span>
                      <button
                        onClick={() => handleOpenJiraTabs(columnTasks)}
                        disabled={columnTasks.length === 0}
                        className="text-blue-600 hover:underline text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Open {columnTasks.length} tab
                        {columnTasks.length !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No columns or tasks data available
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionComplete;
