function TaskInfoModal({ task, onClose }) {
  if (!task) return null;

  const metadata = task?.metadata;
  const originalRow = metadata?.originalRow;

  // Get all available metadata fields, safely handling missing values
  const fields = originalRow
    ? Object.keys(originalRow)
        .filter((key) => {
          const value = originalRow[key];
          // Safely check if value exists and is non-empty
          return value && (typeof value === 'string' ? value.trim() : value);
        })
        .sort()
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {task.title || 'Untitled Task'}
            </h3>
            {task.id && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: <span className="font-mono">{String(task.id)}</span>
              </p>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Key Metadata */}
          {metadata &&
            (metadata.issueType || metadata.priority || metadata.status) && (
              <div className="grid grid-cols-3 gap-4">
                {metadata.issueType && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase">
                      Type
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {String(metadata.issueType)}
                    </p>
                  </div>
                )}
                {metadata.priority && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase">
                      Priority
                    </h4>
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          String(metadata.priority)
                            .toLowerCase()
                            .includes('high')
                            ? 'bg-red-500'
                            : String(metadata.priority)
                                  .toLowerCase()
                                  .includes('medium')
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                      ></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {String(metadata.priority)}
                      </p>
                    </div>
                  </div>
                )}
                {metadata.status && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase">
                      Status
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {String(metadata.status)}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Additional Fields */}
          {fields.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Additional Metadata
              </h4>
              <div className="space-y-3">
                {fields.map((key) => {
                  const value = originalRow?.[key];
                  // Skip if value is missing
                  if (!value) return null;

                  return (
                    <div
                      key={key}
                      className="flex gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
                    >
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[120px] break-words">
                        {String(key)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex-1 break-words">
                        {String(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No metadata message */}
          {fields.length === 0 &&
            (!metadata ||
              (!metadata.issueType &&
                !metadata.priority &&
                !metadata.status)) && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No additional metadata available for this task
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskInfoModal;
