// src/utils/jiraUrlBuilder.js
// Build Jira URLs for bulk tab opening

/**
 * Build Jira issue URL
 * @param {string} baseUrl - Jira base URL (e.g., "https://company.atlassian.net")
 * @param {string} issueKey - Issue key (e.g., "PROJ-123")
 * @returns {string} Full Jira URL
 */
export function buildJiraUrl(baseUrl, issueKey) {
  if (!baseUrl || !issueKey) return null;
  
  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Build URL
  return `${cleanBaseUrl}/browse/${issueKey}`;
}

/**
 * Open multiple Jira URLs in tabs
 * Note: Browsers may block multiple tabs - user must allow popups
 * @param {string} baseUrl - Jira base URL
 * @param {Array<string>} issueKeys - Array of issue keys
 * @param {number} delay - Delay between opening tabs (ms)
 */
export function openJiraTabs(baseUrl, issueKeys, delay = 100) {
  if (!baseUrl || !issueKeys || issueKeys.length === 0) {
    console.error('Invalid parameters for opening Jira tabs');
    return;
  }

  // Warn user about popup blocker
  if (issueKeys.length > 1) {
    const confirmed = window.confirm(
      `This will open ${issueKeys.length} tabs. Please allow popups for this site.`
    );
    if (!confirmed) return;
  }

  // Open tabs with delay to avoid browser throttling
  issueKeys.forEach((issueKey, index) => {
    setTimeout(() => {
      const url = buildJiraUrl(baseUrl, issueKey);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }, index * delay);
  });
}

/**
 * Group tasks by column and prepare for bulk opening
 * @param {Object} columns - Column objects from Firebase
 * @param {Object} tasks - Task objects from Firebase
 * @returns {Array<Object>} Grouped data for display
 */
export function groupTasksForBulkOpen(columns, tasks) {
  if (!columns || !tasks) return [];

  // Convert to arrays if needed
  const columnArray = Array.isArray(columns) ? columns : Object.values(columns);
  const taskArray = Array.isArray(tasks) ? tasks : Object.values(tasks);

  // Group tasks by column
  return columnArray
    .sort((a, b) => a.order - b.order)
    .map(column => {
      const columnTasks = taskArray.filter(task => task.columnId === column.id);
      
      return {
        columnId: column.id,
        columnName: column.name,
        suggestedPoints: column.suggestedPoints,
        taskCount: columnTasks.length,
        issueKeys: columnTasks.map(task => task.id),
      };
    })
    .filter(group => group.taskCount > 0); // Only include columns with tasks
}

/**
 * Detect Jira base URL from issue key (if possible)
 * This is a fallback if not extracted from CSV
 * @param {string} issueKey - Issue key
 * @returns {string|null} Guessed base URL or null
 */
export function detectJiraBaseUrl(issueKey) {
  // This is a best-guess approach
  // In production, user should configure this
  
  if (!issueKey || typeof issueKey !== 'string') return null;
  
  // Extract project key (letters before hyphen)
  const projectMatch = issueKey.match(/^([A-Z]+)-\d+$/);
  if (!projectMatch) return null;
  
  const projectKey = projectMatch[1].toLowerCase();
  
  // Common Jira cloud pattern
  return `https://${projectKey}.atlassian.net`;
}

/**
 * Validate Jira URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid Jira URL format
 */
export function isValidJiraUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a valid URL
  try {
    const urlObj = new URL(url);
    
    // Check if it looks like a Jira URL
    return (
      urlObj.protocol === 'https:' &&
      (urlObj.hostname.includes('atlassian.net') || 
       urlObj.hostname.includes('jira'))
    );
  } catch {
    return false;
  }
}
