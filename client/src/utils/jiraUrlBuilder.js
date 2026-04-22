// src/utils/jiraUrlBuilder.js
// Build Jira URLs for bulk tab opening

const CACHED_JIRA_BASE_URL_KEY = 'cachedJiraBaseUrl';
const MAX_URL_LENGTH = 2048;

/**
 * Validate a Jira base URL. Only http/https are allowed — this blocks
 * `javascript:`, `data:`, etc. which would otherwise become an XSS sink
 * when interpolated into an `href` via buildJiraUrl().
 */
export function isValidJiraBaseUrl(url) {
  if (typeof url !== 'string') return false;
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:';
}

/**
 * Read the cached Jira base URL from localStorage. Re-validates on read so
 * tampered storage can't bypass the protocol allowlist.
 */
export function getCachedJiraBaseUrl() {
  let raw;
  try {
    raw = localStorage.getItem(CACHED_JIRA_BASE_URL_KEY);
  } catch {
    return null;
  }
  if (!isValidJiraBaseUrl(raw)) {
    if (raw !== null) {
      try {
        localStorage.removeItem(CACHED_JIRA_BASE_URL_KEY);
      } catch {
        // ignore
      }
    }
    return null;
  }
  return raw;
}

/**
 * Persist the Jira base URL to localStorage if it passes validation.
 */
export function setCachedJiraBaseUrl(url) {
  if (!isValidJiraBaseUrl(url)) return;
  try {
    localStorage.setItem(CACHED_JIRA_BASE_URL_KEY, url);
  } catch {
    // quota or disabled storage — silent no-op
  }
}

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
