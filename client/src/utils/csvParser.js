// src/utils/csvParser.js
// Parse Jira CSV exports into task objects

import Papa from 'papaparse';

/**
 * Parse Jira CSV file and extract task information
 * @param {File} file - CSV file object
 * @returns {Promise<Object>} Parsed tasks and metadata
 */
export function parseJiraCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const tasks = results.data.map((row, index) => {
            // Extract common Jira fields (case-insensitive for issue key)
            const issueKey =
              row['Issue key'] ||
              row['Issue Key'] ||
              row['Key'] ||
              `TASK-${index + 1}`;
            const summary = row['Summary'] || row['Title'] || 'Untitled Task';
            const description = row['Description'] || '';
            const issueType = row['Issue Type'] || row['Type'] || '';
            const priority = row['Priority'] || '';
            const status = row['Status'] || '';

            return {
              jiraKey: issueKey,
              title: summary,
              description: description,
              issueType,
              priority,
              status,
              metadata: {
                issueType,
                priority,
                status,
                // Only store essential fields, not the entire row (which can be huge with Jira exports)
              },
            };
          });

          // Try to extract Jira base URL from issue keys
          const jiraBaseUrl = extractJiraBaseUrl(tasks);

          resolve({
            tasks,
            jiraBaseUrl,
            totalCount: tasks.length,
            fileName: file.name,
          });
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

/**
 * Extract Jira base URL from issue keys
 * This is a best-guess approach
 * @param {Array} tasks - Array of task objects
 * @returns {string|null} Base URL or null
 */
function extractJiraBaseUrl(tasks) {
  // Check if any task has a URL field
  const taskWithUrl = tasks.find((t) => t.metadata?.originalRow?.URL);
  if (taskWithUrl) {
    const url = taskWithUrl.metadata.originalRow.URL;
    // Extract base URL (e.g., "https://company.atlassian.net")
    const match = url.match(/(https?:\/\/[^/]+)/);
    return match ? match[1] : null;
  }

  // Default to null - user can configure later
  return null;
}

/**
 * Validate CSV has required columns
 * @param {File} file - CSV file
 * @returns {Promise<Object>} Validation result
 */
export function validateJiraCSV(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: 1, // Only parse first row for validation
      complete: (results) => {
        const headers = results.meta.fields || [];

        // Check for required columns (flexible matching)
        const hasIssueKey = headers.some(
          (h) =>
            (h.toLowerCase().includes('issue') &&
              h.toLowerCase().includes('key')) ||
            h.toLowerCase() === 'key'
        );

        const hasSummary = headers.some(
          (h) =>
            h.toLowerCase().includes('summary') ||
            h.toLowerCase().includes('title')
        );

        const isValid = hasIssueKey && hasSummary;

        resolve({
          isValid,
          headers,
          message: isValid
            ? 'Valid Jira CSV format'
            : 'CSV must contain "Issue Key" and "Summary" columns',
        });
      },
    });
  });
}

/**
 * Generate sample CSV for testing
 * @returns {string} CSV content
 */
export function generateSampleCSV() {
  return `Issue Key,Summary,Issue Type,Status,Priority,Description
PROJ-123,Implement user authentication,Story,To Do,High,Add login and signup functionality
PROJ-124,Design homepage mockup,Story,To Do,Medium,Create visual design for landing page
PROJ-125,Set up CI/CD pipeline,Task,To Do,High,Configure automated deployment
PROJ-126,Write API documentation,Task,To Do,Low,Document all REST endpoints
PROJ-127,Add error logging,Story,To Do,Medium,Implement error tracking system
PROJ-128,Optimize database queries,Task,In Progress,High,Improve query performance
PROJ-129,Create user onboarding flow,Story,To Do,Medium,Guide new users through app
PROJ-130,Fix mobile responsive issues,Bug,To Do,High,Resolve layout problems on mobile`;
}
