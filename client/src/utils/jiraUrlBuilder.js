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
