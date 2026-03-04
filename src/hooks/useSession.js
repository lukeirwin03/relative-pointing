// src/hooks/useSession.js
// Custom hook for managing session state with API

import { useState, useEffect } from 'react';
import APIService from '../services/api';

/**
 * Hook to manage session data
 * @param {string} roomCode - Session room code
 * @returns {Object} Session data and methods
 */
export function useSession(roomCode) {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let pollInterval = null;

    const fetchSession = async () => {
      try {
        const data = await APIService.getSession(roomCode);
        console.log(
          `[useSession] Fetched session ${roomCode}: ${data.participants?.length || 0} participants`
        );

        if (mounted) {
          console.log(
            `[useSession] Fetched session ${roomCode}: ${data.participants?.length || 0} participants`
          );
          setSession(data.session);
          setParticipants(data.participants || []);
          setTasks(data.tasks || []);
          setColumns(data.columns || []);
          setError(null);
        }
      } catch (err) {
        console.error('Session fetch error:', err);
        if (mounted) {
          setError(err.message || 'Session not found');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchSession();

    // Poll for updates every 2 seconds
    pollInterval = setInterval(fetchSession, 2000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [roomCode]);

  /**
   * Create new session
   * @param {string} userName - Creator's name
   * @returns {Promise<string>} Room code
   */
  const createSession = async (userName) => {
    // Implementation will generate room code and initialize session
    // TODO: Implement in full version
    throw new Error('Not implemented');
  };

  /**
   * Join existing session
   * @param {string} userId - User ID
   * @param {string} userName - User's name
   * @returns {Promise<void>}
   */
  const joinSession = async (userId, userName) => {
    if (!roomCode) throw new Error('No room code provided');

    await APIService.joinSession(roomCode, userId, userName);

    // Refresh session data
    const data = await APIService.getSession(roomCode);
    console.log(
      `[useSession] Fetched session ${roomCode}: ${data.participants?.length || 0} participants`
    );
    setSession(data.session);
    setParticipants(data.participants || []);
  };

  /**
   * Update session metadata
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  const updateSession = async (updates) => {
    if (!roomCode) throw new Error('No room code provided');

    // TODO: Implement session metadata update via API
    console.warn('updateSession not yet implemented for API backend');
  };

  /**
   * Check if session exists
   * @param {string} code - Room code to check
   * @returns {Promise<boolean>}
   */
  const sessionExists = async (code) => {
    try {
      await APIService.getSession(code);
      return true;
    } catch (err) {
      return false;
    }
  };

  return {
    session,
    participants,
    tasks,
    columns,
    loading,
    error,
    createSession,
    joinSession,
    updateSession,
    sessionExists,
  };
}
