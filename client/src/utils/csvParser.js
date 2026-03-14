// src/utils/csvParser.js
// Parse Jira or Linear CSV exports into task objects

import Papa from 'papaparse';

/**
 * Detect CSV source format from headers
 * @param {string[]} headers - Column headers
 * @returns {'jira'|'linear'|'unknown'}
 */
function detectFormat(headers) {
  const lower = headers.map((h) => h.toLowerCase());

  // Linear exports have "ID" (e.g. "LIN-123") and "Title" columns
  const hasLinearId = lower.includes('id') || lower.includes('identifier');
  const hasTitle = lower.includes('title');
  const hasLabels = lower.includes('labels');
  const hasEstimate = lower.includes('estimate');
  // Linear-specific columns
  const hasProject = lower.includes('project');
  const hasCycle = lower.some((h) => h.includes('cycle'));

  if (
    hasLinearId &&
    hasTitle &&
    (hasLabels || hasEstimate || hasProject || hasCycle)
  ) {
    return 'linear';
  }

  // Jira exports have "Issue key"/"Key" and "Summary"
  const hasIssueKey = lower.some(
    (h) => (h.includes('issue') && h.includes('key')) || h === 'key'
  );
  const hasSummary = lower.some(
    (h) => h.includes('summary') || h.includes('title')
  );

  if (hasIssueKey && hasSummary) {
    return 'jira';
  }

  // Fallback: if it has Title, treat it as generic/Linear-like
  if (hasTitle) {
    return 'linear';
  }

  return 'unknown';
}

/**
 * Parse a row from Jira CSV format
 */
function parseJiraRow(row, index) {
  const issueKey =
    row['Issue key'] || row['Issue Key'] || row['Key'] || `TASK-${index + 1}`;
  const summary = row['Summary'] || row['Title'] || '';
  const description = row['Description'] || '';
  const issueType = row['Issue Type'] || row['Type'] || '';
  const priority = row['Priority'] || '';
  const status = row['Status'] || '';

  if (!summary.trim()) return null;

  return {
    jiraKey: issueKey,
    title: summary,
    description,
    issueType,
    priority,
    status,
    metadata: { issueType, priority, status },
  };
}

/**
 * Parse a row from Linear CSV format
 */
function parseLinearRow(row, index) {
  const id = row['ID'] || row['Identifier'] || row['Id'] || `TASK-${index + 1}`;
  const title = row['Title'] || '';
  const description = row['Description'] || '';
  const status = row['Status'] || '';
  const priority = row['Priority'] || '';
  const estimate = row['Estimate'] || '';
  const labels = row['Labels'] || '';
  const project = row['Project'] || '';
  const assignee = row['Assignee'] || '';

  if (!title.trim()) return null;

  return {
    jiraKey: id,
    title,
    description,
    issueType: labels || '',
    priority,
    status,
    metadata: {
      issueType: labels,
      priority,
      status,
      estimate,
      project,
      assignee,
    },
  };
}

/**
 * Parse CSV file (auto-detects Jira or Linear format) and extract task information
 * @param {File} file - CSV file object
 * @returns {Promise<Object>} Parsed tasks and metadata
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const format = detectFormat(headers);
          const tasks = [];
          let skippedRows = 0;

          results.data.forEach((row, index) => {
            const task =
              format === 'linear'
                ? parseLinearRow(row, index)
                : parseJiraRow(row, index);

            if (task) {
              tasks.push(task);
            } else {
              skippedRows++;
            }
          });

          const jiraBaseUrl =
            format === 'jira' ? extractJiraBaseUrl(tasks) : null;

          resolve({
            tasks,
            jiraBaseUrl,
            totalCount: tasks.length,
            skippedRows,
            fileName: file.name,
            format,
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
 * @param {Array} tasks - Array of task objects
 * @returns {string|null} Base URL or null
 */
function extractJiraBaseUrl(tasks) {
  const taskWithUrl = tasks.find((t) => t.metadata?.originalRow?.URL);
  if (taskWithUrl) {
    const url = taskWithUrl.metadata.originalRow.URL;
    const match = url.match(/(https?:\/\/[^/]+)/);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Validate CSV has required columns (supports Jira and Linear formats)
 * @param {File} file - CSV file
 * @returns {Promise<Object>} Validation result
 */
export function validateCSV(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const format = detectFormat(headers);

        const isValid = format !== 'unknown';

        resolve({
          isValid,
          headers,
          format,
          message: isValid
            ? `Valid ${format === 'linear' ? 'Linear' : 'Jira'} CSV format`
            : 'CSV must contain task ID and title columns (Jira or Linear format)',
        });
      },
    });
  });
}
