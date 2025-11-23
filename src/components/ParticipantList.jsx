import React, { useState } from 'react';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

function ParticipantList({ participants = [], currentUser }) {
  const [hoveredId, setHoveredId] = useState(null);

  console.log('[ParticipantList] participants:', participants);

  const getColorForParticipant = (index) => {
    return COLORS[index % COLORS.length];
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Participants ({participants.length}):
      </span>
      <div className="flex gap-1 relative">
        {participants.length > 0 ? (
          participants.map((participant, index) => {
            return (
              <div
                key={participant.id}
                className="relative"
                onMouseEnter={() => setHoveredId(participant.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white dark:ring-gray-800 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: getColorForParticipant(index) }}
                >
                  {participant.user_name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Tooltip */}
                {hoveredId === participant.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10">
                    {participant.user_name}
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
