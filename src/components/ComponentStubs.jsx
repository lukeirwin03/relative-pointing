// src/components/Column.jsx
import React from 'react';

function Column({ columnId, title, tasks = [], canDrag = false }) {
  return (
    <div className="bg-gray-100 rounded-lg p-4 min-w-[280px] flex-shrink-0">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white p-3 rounded shadow-sm">
              <p className="text-sm font-medium">{task.title}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Column;

// src/components/TaskCard.jsx
export function TaskCard({ task, isDragging = false }) {
  return (
    <div className={`bg-white p-3 rounded shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      <div className="text-xs text-gray-500 mb-1">{task.id}</div>
      <p className="text-sm font-medium text-gray-800">{task.title}</p>
      {task.description && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}

// src/components/Chat.jsx
export function Chat({ roomCode, userId, userName }) {
  const [message, setMessage] = React.useState('');
  const [messages, setMessages] = React.useState([]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    // TODO: Send message to Firebase
    console.log('Send message:', message);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <strong>{msg.userName}:</strong> {msg.text}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// src/components/ParticipantList.jsx
export function ParticipantList({ participants = [], currentUser }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Participants:</span>
      <div className="flex -space-x-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white"
            style={{ backgroundColor: participant.color }}
            title={participant.name}
          >
            {participant.name[0].toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}

// src/components/SessionComplete.jsx
export function SessionComplete({ roomCode, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Session Complete! 🎉</h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Great job! Your tasks have been organized. You can now open Jira tabs to assign points.
          </p>
          
          {/* TODO: Display column groups with task counts */}
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">Column 1 (3 points)</span>
                <button className="text-blue-600 hover:underline text-sm">
                  Open 5 tabs
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Column;
