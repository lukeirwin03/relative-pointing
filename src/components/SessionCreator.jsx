// src/components/SessionCreator.jsx
// Component for creating new pointing sessions

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { database } from '../services/firebase';
import { generateRoomCode } from '../utils/roomCodeGenerator';

function SessionCreator() {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCreateSession = async (e) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate unique room code
      const roomCode = generateRoomCode();
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Initialize session in Firebase
      const sessionRef = ref(database, `sessions/${roomCode}`);
      await set(sessionRef, {
        metadata: {
          createdAt: Date.now(),
          createdBy: userId,
          status: 'active',
        },
        participants: {
          [userId]: {
            name: userName.trim(),
            joinedAt: Date.now(),
            color: '#3B82F6', // Blue for creator
            isCreator: true,
          },
        },
        currentTurn: userId,
        turnOrder: [userId],
        tasks: {},
        columns: {
          unsorted: {
            id: 'unsorted',
            name: 'Unsorted',
            order: 0,
          },
        },
        chat: {},
      });

      // Store user info in localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('userName', userName);

      // Navigate to session
      navigate(`/session/${roomCode}`);
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Relative Pointing
        </h1>
        <p className="text-gray-600 mb-6">
          Collaborative story pointing for Scrum teams
        </p>

        <form onSubmit={handleCreateSession}>
          <div className="mb-4">
            <label 
              htmlFor="userName" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              maxLength={50}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Session...' : 'Create New Session'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-2">
            Have a room code?
          </p>
          <button
            onClick={() => {
              const code = prompt('Enter room code:');
              if (code) {
                navigate(`/session/${code.toUpperCase()}`);
              }
            }}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Join Existing Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionCreator;
