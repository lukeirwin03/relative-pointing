/**
 * API Service for Relative Pointing App
 * Communicates with the local Express backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class APIService {
  /**
   * Create a new session
   */
  static async createSession(creatorId, creatorName) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, creatorName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session details by room code
   * @param {string} roomCode
   * @param {string} [userId] - If provided, updates the caller's last_seen_at (heartbeat)
   */
  static async getSession(roomCode, userId) {
    try {
      const url = userId
        ? `${API_BASE_URL}/sessions/${roomCode}?userId=${encodeURIComponent(userId)}`
        : `${API_BASE_URL}/sessions/${roomCode}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found');
        }
        throw new Error('Failed to fetch session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  /**
   * Join a session
   */
  static async joinSession(roomCode, userId, userName) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userName }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Session not found');
        }
        if (response.status === 400) {
          throw new Error(errorData.error || 'Failed to join session');
        }
        throw new Error(errorData.error || 'Failed to join session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  }

  /**
   * Upload tasks to a session
   */
  static async uploadTasks(roomCode, tasks, jiraBaseUrl) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, jiraBaseUrl }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload tasks');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading tasks:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a session
   */
  static async getTasks(roomCode) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  static async createTask(roomCode, issueKey, title, description = '') {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/create-task`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issueKey, title, description }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(roomCode, taskId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Update task color tag (legacy)
   */
  static async updateTaskColor(roomCode, taskId, colorTag) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}/color`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colorTag }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update task color');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task color:', error);
      throw error;
    }
  }

  /**
   * Update task tag
   */
  static async updateTaskTag(roomCode, taskId, tagId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}/tag`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update task tag');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task tag:', error);
      throw error;
    }
  }

  /**
   * Get tags for a session
   */
  static async getSessionTags(roomCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/tags`);

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  }

  /**
   * Create a custom tag
   */
  static async createTag(roomCode, name, color) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tags`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create tag');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  }

  /**
   * Delete a custom tag
   */
  static async deleteTag(roomCode, tagId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tags/${tagId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }

  /**
   * Get comments for a task
   */
  static async getTaskComments(roomCode, taskId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}/comments`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a task
   */
  static async addTaskComment(roomCode, taskId, userId, userName, content) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userName, content }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Move a task to a column
   */
  static async moveTask(roomCode, taskId, columnId, assignedBy) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId, assignedBy }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to move task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error moving task:', error);
      throw error;
    }
  }

  /**
   * Create a new column
   */
  static async createColumn(roomCode, columnId, name, order) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/columns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId, name, order }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create column');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating column:', error);
      throw error;
    }
  }

  /**
   * Delete a column
   */
  static async deleteColumn(roomCode, columnId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/columns/${columnId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete column');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting column:', error);
      throw error;
    }
  }

  /**
   * Update session Jira base URL
   */
  static async updateSessionJiraUrl(roomCode, jiraBaseUrl) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jira_base_url: jiraBaseUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to update Jira URL');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Jira URL:', error);
      throw error;
    }
  }

  /**
   * Update skipped participants list
   */
  static async updateSkippedParticipants(roomCode, skippedParticipants) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped_participants: skippedParticipants }),
      });

      if (!response.ok) {
        throw new Error('Failed to update skipped participants');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating skipped participants:', error);
      throw error;
    }
  }

  /**
   * End current turn and advance to next participant
   */
  static async endTurn(roomCode, userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/end-turn`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to end turn');
      }

      return await response.json();
    } catch (error) {
      console.error('Error ending turn:', error);
      throw error;
    }
  }

  /**
   * Update stack mode setting
   */
  static async updateStackMode(roomCode, stackMode) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stack_mode: stackMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stack mode');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating stack mode:', error);
      throw error;
    }
  }

  /**
   * Skip top unsorted task (move to bottom)
   */
  static async skipTopTask(roomCode) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/tasks/skip-top`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to skip task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error skipping top task:', error);
      throw error;
    }
  }

  /**
   * Transfer session ownership to another participant
   */
  static async transferOwnership(roomCode, userId, newOwnerId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${roomCode}/transfer-ownership`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, newOwnerId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transfer ownership');
      }

      return await response.json();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }

  /**
   * Health check - verify backend is running
   */
  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

export default APIService;
