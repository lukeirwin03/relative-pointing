/**
 * API Service for Relative Pointing App
 * Communicates with the local Express backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class APIService {
  /**
   * Create a new session
   */
  static async createSession(creatorId, creatorName) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, creatorName })
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
   */
  static async getSession(roomCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}`);

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
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName })
      });

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
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, jiraBaseUrl })
      });

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
       const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/tasks`);

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
   static async createTask(roomCode, title, description = '') {
     try {
       const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/tasks/create-task`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ title, description })
       });

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
   * Move a task to a column
   */
  static async moveTask(roomCode, taskId, columnId, assignedBy) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, assignedBy })
      });

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
   * Get chat messages for a session
   */
  static async getChatMessages(roomCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/chat`);

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  static async sendChatMessage(roomCode, userId, userName, message) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, message })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get current turn information
   */
  static async getTurn(roomCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/turns`);

      if (!response.ok) {
        throw new Error('Failed to fetch turn information');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching turn:', error);
      throw error;
    }
  }

  /**
   * Advance to the next turn
   */
  static async advanceTurn(roomCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/turns/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to advance turn');
      }

      return await response.json();
    } catch (error) {
      console.error('Error advancing turn:', error);
      throw error;
    }
  }

  /**
   * Create a new column
   */
  static async createColumn(roomCode, columnId, name, order) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, name, order })
      });

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
      const response = await fetch(`${API_BASE_URL}/sessions/${roomCode}/columns/${columnId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

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
