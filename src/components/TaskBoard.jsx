// src/components/TaskBoard.jsx
// Main board component for displaying and managing tasks

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useTurnManager } from '../hooks/useTurnManager';
import CSVUploader from './CSVUploader';
import Column from './Column';
import Chat from './Chat';
import ParticipantList from './ParticipantList';
import SessionComplete from './SessionComplete';

function TaskBoard({ user }) {
  const { roomCode } = useParams();
  const { session, participants, loading } = useSession(roomCode);
  const { currentTurn, isMyTurn, getCurrentTurnUser } = useTurnManager(
    roomCode,
    participants,
    user?.id
  );
  
  const [showComplete, setShowComplete] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Session not found</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Create New Session
          </a>
        </div>
      </div>
    );
  }

  const isCreator = user?.id === session.metadata?.createdBy;
  const currentTurnUser = getCurrentTurnUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Relative Pointing
              </h1>
              <p className="text-sm text-gray-600">
                Room Code: <span className="font-mono font-semibold">{roomCode}</span>
              </p>
            </div>
            
            <ParticipantList participants={participants} currentUser={user} />
          </div>
        </div>
      </header>

      {/* Turn Indicator */}
      {currentTurnUser && (
        <div className={`py-3 text-center ${isMyTurn ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <p className="text-sm font-medium">
            {isMyTurn ? (
              <span className="text-blue-700">🎯 Your Turn!</span>
            ) : (
              <span className="text-gray-700">
                Waiting for <strong>{currentTurnUser.name}</strong>
              </span>
            )}
          </p>
        </div>
      )}

      {/* CSV Uploader (Creator Only) */}
      {isCreator && (
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <CSVUploader roomCode={roomCode} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task Board Area */}
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 min-h-full">
            {/* TODO: Render columns dynamically */}
            <Column 
              columnId="unsorted" 
              title="Unsorted Tasks"
              tasks={[]}
              canDrag={isMyTurn}
            />
            
            {/* Additional columns will be rendered here */}
            
            <div className="text-gray-400 text-sm p-4">
              Drag tasks to create columns →
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <Chat 
            roomCode={roomCode} 
            userId={user?.id} 
            userName={user?.name} 
          />
        </div>
      </div>

      {/* Complete Session Button */}
      {isCreator && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex justify-end">
            <button
              onClick={() => setShowComplete(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Complete Session
            </button>
          </div>
        </div>
      )}

      {/* Session Complete Modal */}
      {showComplete && (
        <SessionComplete
          roomCode={roomCode}
          onClose={() => setShowComplete(false)}
        />
      )}
    </div>
  );
}

export default TaskBoard;
