import { useState, useEffect, useCallback } from 'react';
import { parseJiraCSV, validateJiraCSV } from '../utils/csvParser';
import APIService from '../services/api';

function DropZoneOverlay({ roomCode, isCreator, onTasksImported }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const processFile = useCallback(
    async (file) => {
      setIsUploading(true);
      setError(null);

      try {
        // Validate CSV
        const validation = await validateJiraCSV(file);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        // Parse CSV
        const result = await parseJiraCSV(file);

        // Upload tasks to backend
        await APIService.uploadTasks(
          roomCode,
          result.tasks,
          result.jiraBaseUrl
        );

        // Notify parent component
        if (onTasksImported) {
          onTasksImported(result.totalCount);
        }

        // Show success message
        setError(null);
      } catch (err) {
        console.error('CSV upload error:', err);
        setError(err.message);
        setTimeout(() => setError(null), 5000);
      } finally {
        setIsUploading(false);
      }
    },
    [roomCode, onTasksImported]
  );

  useEffect(() => {
    // Only add drag listeners if user is creator
    if (!isCreator) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set to false if leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          await processFile(file);
        } else {
          setError('Please drop a CSV file');
          setTimeout(() => setError(null), 3000);
        }
      }
    };

    // Add listeners to document
    document.addEventListener('dragover', handleDragOver, false);
    document.addEventListener('dragleave', handleDragLeave, false);
    document.addEventListener('drop', handleDrop, false);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isCreator, processFile]);

  if (!isCreator) return null;

  return (
    <>
      {/* Dragging overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg font-semibold text-gray-800 dark:text-white">
              Drop CSV to import tasks
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg z-50 max-w-sm">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg z-50 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Importing tasks...
          </p>
        </div>
      )}
    </>
  );
}

export default DropZoneOverlay;
