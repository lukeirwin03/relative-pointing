// src/hooks/useTurnManager.js
// Custom hook for managing turn-based gameplay

import { useState, useEffect } from 'react';
import APIService from '../services/api';

/**
 * Hook to manage turn rotation
 * @param {string} roomCode - Session room code
 * @param {Array} participants - List of participants
 * @param {string} currentUserId - Current user's ID
 * @returns {Object} Turn data and methods
 */
export function useTurnManager(roomCode, participants, currentUserId) {
  const [currentTurn, setCurrentTurn] = useState(null);
  const [turnOrder, setTurnOrder] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // Poll for turn changes
  useEffect(() => {
    if (!roomCode) return;

    let mounted = true;
    let pollInterval = null;

    const fetchTurnData = async () => {
      try {
        const turnData = await APIService.getTurn(roomCode);
        if (mounted) {
          setCurrentTurn(turnData.currentTurnUserId);
          setTurnOrder(turnData.turnOrder || []);
          setIsMyTurn(turnData.currentTurnUserId === currentUserId);
        }
      } catch (err) {
        console.error('Error fetching turn data:', err);
      }
    };

    // Fetch immediately
    fetchTurnData();

    // Note: Polling disabled for now - can be re-enabled if needed for real-time turn updates
    // pollInterval = setInterval(fetchTurnData, 1000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [roomCode, currentUserId]);

  /**
   * Initialize turn order when session starts
   * @returns {Promise<void>}
   */
  const initializeTurnOrder = async () => {
    if (!roomCode || participants.length === 0) return;

    // Turn order is initialized when session is created
    // This is a placeholder for future implementation
    console.log('Turn order already initialized on session creation');
  };

  /**
   * Advance to next player's turn
   * @returns {Promise<void>}
   */
  const nextTurn = async () => {
    if (!roomCode || turnOrder.length === 0) return;

    try {
      const turnData = await APIService.advanceTurn(roomCode);
      // Update local state
      setCurrentTurn(turnData.currentTurnUserId);
      setIsMyTurn(turnData.currentTurnUserId === currentUserId);
    } catch (err) {
      console.error('Error advancing turn:', err);
    }
  };

  /**
   * Skip current turn (if player is inactive)
   * @returns {Promise<void>}
   */
  const skipTurn = async () => {
    await nextTurn();
  };

  /**
   * Get current turn user info
   * @returns {Object|null} Current turn user
   */
  const getCurrentTurnUser = () => {
    if (!currentTurn || !participants) return null;
    return participants.find(p => p.id === currentTurn);
  };

  /**
   * Get next turn user info
   * @returns {Object|null} Next turn user
   */
  const getNextTurnUser = () => {
    if (!currentTurn || !participants || turnOrder.length === 0) return null;
    
    const currentIndex = turnOrder.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    const nextUserId = turnOrder[nextIndex];
    
    return participants.find(p => p.id === nextUserId);
  };

  return {
    currentTurn,
    turnOrder,
    isMyTurn,
    initializeTurnOrder,
    nextTurn,
    skipTurn,
    getCurrentTurnUser,
    getNextTurnUser,
  };
}
