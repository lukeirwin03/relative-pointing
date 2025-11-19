// src/hooks/useTurnManager.js
// Custom hook for managing turn-based gameplay

import { useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { database } from '../services/firebase';

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

  // Listen for turn changes
  useEffect(() => {
    if (!roomCode) return;

    const turnRef = ref(database, `sessions/${roomCode}/currentTurn`);
    const orderRef = ref(database, `sessions/${roomCode}/turnOrder`);

    // Listen to current turn
    const unsubscribeTurn = onValue(turnRef, (snapshot) => {
      const turn = snapshot.val();
      setCurrentTurn(turn);
      setIsMyTurn(turn === currentUserId);
    });

    // Listen to turn order
    const unsubscribeOrder = onValue(orderRef, (snapshot) => {
      const order = snapshot.val() || [];
      setTurnOrder(order);
    });

    return () => {
      unsubscribeTurn();
      unsubscribeOrder();
    };
  }, [roomCode, currentUserId]);

  /**
   * Initialize turn order when session starts
   * @returns {Promise<void>}
   */
  const initializeTurnOrder = async () => {
    if (!roomCode || participants.length === 0) return;

    const orderRef = ref(database, `sessions/${roomCode}/turnOrder`);
    const turnRef = ref(database, `sessions/${roomCode}/currentTurn`);

    // Shuffle participants for random order
    const shuffled = [...participants]
      .map(p => p.id)
      .sort(() => Math.random() - 0.5);

    await set(orderRef, shuffled);
    await set(turnRef, shuffled[0]);
  };

  /**
   * Advance to next player's turn
   * @returns {Promise<void>}
   */
  const nextTurn = async () => {
    if (!roomCode || turnOrder.length === 0) return;

    const currentIndex = turnOrder.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    const nextUserId = turnOrder[nextIndex];

    const turnRef = ref(database, `sessions/${roomCode}/currentTurn`);
    await set(turnRef, nextUserId);
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
