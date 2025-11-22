// src/hooks/useChat.js
// Custom hook for managing chat functionality

import { useState, useEffect } from 'react';
import APIService from '../services/api';

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

    let mounted = true;
    let pollInterval = null;

    const fetchMessages = async () => {
      try {
        const msgs = await APIService.getChatMessages(roomCode);
        if (mounted) {
          setMessages(msgs);
          setError(null);
        }
      } catch (err) {
        console.error('Chat fetch error:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchMessages();

    // Poll for new messages every 2 seconds
    pollInterval = setInterval(fetchMessages, 2000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
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

    try {
      await APIService.sendChatMessage(roomCode, userId, userName, text.trim());
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
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
