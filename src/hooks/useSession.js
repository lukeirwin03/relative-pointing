// src/hooks/useSession.js
// Custom hook for managing session state with Firebase

import { useState, useEffect } from 'react';
import { ref, onValue, set, update, get } from 'firebase/database';
import { database } from '../services/firebase';

/**
 * Hook to manage session data
 * @param {string} roomCode - Session room code
 * @returns {Object} Session data and methods
 */
export function useSession(roomCode) {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const sessionRef = ref(database, `sessions/${roomCode}`);

    // Listen for session changes
    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
          setSession(data);
          
          // Convert participants object to array
          const participantsList = data.participants 
            ? Object.entries(data.participants).map(([id, data]) => ({
                id,
                ...data,
              }))
            : [];
          
          setParticipants(participantsList);
          setError(null);
        } else {
          setError('Session not found');
        }
        
        setLoading(false);
      },
      (err) => {
        console.error('Session listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
   * @param {string} userName - User's name
   * @returns {Promise<void>}
   */
  const joinSession = async (userName) => {
    if (!roomCode) throw new Error('No room code provided');
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const participantRef = ref(database, `sessions/${roomCode}/participants/${userId}`);
    
    await set(participantRef, {
      name: userName,
      joinedAt: Date.now(),
      color: generateUserColor(),
      isCreator: false,
    });

    return userId;
  };

  /**
   * Update session metadata
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  const updateSession = async (updates) => {
    if (!roomCode) throw new Error('No room code provided');
    
    const sessionRef = ref(database, `sessions/${roomCode}/metadata`);
    await update(sessionRef, updates);
  };

  /**
   * Check if session exists
   * @param {string} code - Room code to check
   * @returns {Promise<boolean>}
   */
  const sessionExists = async (code) => {
    const sessionRef = ref(database, `sessions/${code}`);
    const snapshot = await get(sessionRef);
    return snapshot.exists();
  };

  return {
    session,
    participants,
    loading,
    error,
    createSession,
    joinSession,
    updateSession,
    sessionExists,
  };
}

/**
 * Generate random color for user avatar
 * @returns {string} Hex color code
 */
function generateUserColor() {
  const colors = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}
