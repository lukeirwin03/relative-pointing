import React from 'react';
import { buildJiraUrl, detectJiraBaseUrl } from '../utils/jiraUrlBuilder';

export function TaskCard({ task, isDragging = false, jiraBaseUrl = null }) {
  const getJiraUrl = () => {
    // Try to build URL with provided baseUrl, or detect it from issue key
    const baseUrl = jiraBaseUrl || detectJiraBaseUrl(task.id);
    return buildJiraUrl(baseUrl, task.id);
  };

  const jiraUrl = getJiraUrl();

  const handleClick = (e) => {
    if (jiraUrl) {
      e.stopPropagation();
      window.open(jiraUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`bg-white p-2 rounded shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      {jiraUrl ? (
        <a
          href={jiraUrl}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block"
          title={`Open ${task.id} in Jira`}
        >
          {task.id}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-800">{task.id}</p>
      )}
      {task.title && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.title}</p>
      )}
    </div>
  );
}

export default TaskCard;
