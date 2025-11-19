// src/hooks/useChat.js
// Custom hook for managing chat functionality

import { useState, useEffect } from 'react';
import { ref, onValue, push, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../services/firebase';

/**
 * Hook to manage chat messages
 * @param {string} roomCode - Session room code
 * @param {string} userId - Current user ID
 * @param {string} userName - Current user name
 * @returns {Object} Chat data and methods
 */
export function useChat(roomCode, userId, userName) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    const chatRef = ref(database, `sessions/${roomCode}/chat`);
    
    // Query last 50 messages, ordered by timestamp
    const chatQuery = query(
      chatRef,
      orderByChild('timestamp'),
      limitToLast(50)
    );

    // Listen for new messages
    const unsubscribe = onValue(
      chatQuery,
      (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
          // Convert to array and sort by timestamp
          const messagesList = Object.entries(data)
            .map(([id, msg]) => ({
              id,
              ...msg,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
          
          setMessages(messagesList);
        } else {
          setMessages([]);
        }
        
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Chat listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomCode]);

  /**
   * Send a chat message
   * @param {string} text - Message text
   * @returns {Promise<void>}
   */
  const sendMessage = async (text) => {
    if (!roomCode || !userId || !userName || !text.trim()) {
      throw new Error('Invalid message parameters');
    }

    const chatRef = ref(database, `sessions/${roomCode}/chat`);
    
    const message = {
      userId,
      userName,
      text: text.trim(),
      timestamp: Date.now(),
    };

    await push(chatRef, message);
  };

  /**
   * Load more messages (for pagination)
   * TODO: Implement pagination if needed
   */
  const loadMoreMessages = async () => {
    // Implementation for loading older messages
    console.log('Load more messages - not yet implemented');
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    loadMoreMessages,
  };
}
