import React, { useState } from 'react';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

function ParticipantList({ participants = [], currentUser, currentTurnUser }) {
  const [hoveredId, setHoveredId] = useState(null);

  const getColorForParticipant = (index) => {
    return COLORS[index % COLORS.length];
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Participants ({participants.length}):
      </span>
      <div className="flex -space-x-2 relative">
        {participants.length > 0 ? (
          participants.map((participant, index) => {
            const isCurrentTurn = currentTurnUser && currentTurnUser.id === participant.id;
            return (
              <div
                key={participant.id}
                className="relative"
                onMouseEnter={() => setHoveredId(participant.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 cursor-pointer hover:scale-110 transition-transform ${
                    isCurrentTurn
                      ? 'ring-yellow-400 dark:ring-yellow-500 shadow-lg shadow-yellow-400'
                      : 'ring-white dark:ring-gray-800'
                  }`}
                  style={{ backgroundColor: getColorForParticipant(index) }}
                >
                  {participant.user_name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Current turn indicator */}
                {isCurrentTurn && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 dark:bg-yellow-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    👑
                  </div>
                )}

                {/* Tooltip */}
                {hoveredId === participant.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10">
                    {participant.user_name}
                    {isCurrentTurn && <div className="text-yellow-300"> (Current turn)</div>}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
        )}
      </div>
    </div>
  );
}

export default ParticipantList;
