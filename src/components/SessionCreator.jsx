// src/components/SessionCreator.jsx
// Component for creating or joining pointing sessions

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import APIService from '../services/api';
import Version from './Version';

function SessionCreator({ onSessionCreated }) {
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState('create'); // 'create' or 'join'
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
      const userId = uuidv4();

      // Create session via API
      const result = await APIService.createSession(userId, userName.trim());

      // Store user info in localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('userName', userName);

      // Set current user (this auto-logs them in)
      if (onSessionCreated) {
        onSessionCreated({
          id: userId,
          name: userName.trim(),
        });
      }

      // Navigate to session
      navigate(`/session/${result.roomCode}`);
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Please try again.');
      setLoading(false);
    }
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = uuidv4();

      // Join session via API
      await APIService.joinSession(
        roomCode.toLowerCase(),
        userId,
        userName.trim()
      );

      // Store user info in localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('userName', userName);

      // Set current user (this auto-logs them in)
      if (onSessionCreated) {
        onSessionCreated({
          id: userId,
          name: userName.trim(),
        });
      }

      // Navigate to session
      navigate(`/session/${roomCode.toLowerCase()}`);
    } catch (err) {
      console.error('Error joining session:', err);
      setError(err.message || 'Failed to join session. Check the room code.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      <div className="absolute bottom-4 right-4">
        <Version />
      </div>
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Relative Pointing
        </h1>
        <p className="text-gray-600 mb-6">
          Collaborative story pointing for Scrum teams
        </p>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Create Session
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'join'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Join Session
          </button>
        </div>

        {mode === 'create' ? (
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
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !userName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
            >
              {loading ? 'Creating Session...' : 'Create New Session'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSession}>
            <div className="mb-4">
              <label
                htmlFor="userName-join"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="userName-join"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
                maxLength={50}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="roomCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter room code"
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
              disabled={loading || !userName.trim() || !roomCode.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default SessionCreator;
