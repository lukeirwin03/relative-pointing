import React, { useState } from 'react';
import APIService from '../services/api';

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

function ParticipantList({
  participants = [],
  currentUser,
  isCreator = false,
  skippedParticipants = [],
  roomCode,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [showTurnList, setShowTurnList] = useState(false);

  const getColorForParticipant = (index) => {
    return COLORS[index % COLORS.length];
  };

  // Convert skippedParticipants array to Set for easier lookup
  const disabledParticipants = new Set(skippedParticipants);

  const toggleParticipant = (participantId) => {
    const newSkipped = disabledParticipants.has(participantId)
      ? skippedParticipants.filter((id) => id !== participantId)
      : [...skippedParticipants, participantId];

    // Fire and forget - optimistic since polling will sync state
    APIService.updateSkippedParticipants(roomCode, newSkipped).catch((err) => {
      console.error('Failed to update skipped participants:', err);
    });
  };

  // Filter active participants for display
  const activeParticipants = participants.filter(
    (p) => !disabledParticipants.has(p.user_id)
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Participants ({participants.length}):
        </span>
        <div className="flex gap-1 relative">
          {participants.length > 0 ? (
            participants.map((participant, index) => {
              const isDisabled = disabledParticipants.has(participant.user_id);
              return (
                <div
                  key={participant.id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(participant.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white dark:ring-gray-800 cursor-pointer hover:scale-110 transition-transform ${
                      isDisabled ? 'opacity-40' : ''
                    }`}
                    style={{ backgroundColor: getColorForParticipant(index) }}
                  >
                    {participant.user_name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Tooltip */}
                  {hoveredId === participant.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10">
                      {participant.user_name}
                      {isDisabled && ' (skipped)'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              None
            </span>
          )}
        </div>
        {participants.length > 0 && (
          <button
            onClick={() => setShowTurnList(!showTurnList)}
            className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
          >
            {showTurnList ? 'hide turns' : 'whose turn?'}
          </button>
        )}
      </div>

      {/* Whose Turn List */}
      {showTurnList && participants.length > 0 && (
        <div
          className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-20 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Whose turn is it anyways?
          </div>
          <ul className="space-y-1">
            {participants.map((participant, index) => {
              const isDisabled = disabledParticipants.has(participant.user_id);
              return (
                <li
                  key={participant.id}
                  className={`flex items-center gap-2 text-sm ${
                    isDisabled
                      ? 'text-gray-400 dark:text-gray-500 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {isCreator ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleParticipant(participant.user_id);
                      }}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        isDisabled
                          ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 hover:border-green-400'
                          : 'border-green-500 bg-green-500 text-white hover:bg-green-600'
                      }`}
                      title={
                        isDisabled
                          ? 'Include in turn order'
                          : 'Skip this participant'
                      }
                    >
                      {!isDisabled && (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${isDisabled ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: getColorForParticipant(index) }}
                    />
                  )}
                  <span
                    className={
                      participant.user_id === currentUser?.id
                        ? 'font-semibold'
                        : ''
                    }
                  >
                    {participant.user_name}
                    {participant.user_id === currentUser?.id && ' (you)'}
                  </span>
                </li>
              );
            })}
          </ul>
          {activeParticipants.length < participants.length && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              {activeParticipants.length} of {participants.length} active
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ParticipantList;
