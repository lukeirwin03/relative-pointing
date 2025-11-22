import React, { useState } from 'react';
import APIService from '../services/api';

function Chat({ roomCode, userId, userName }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // Fetch initial messages
    loadMessages();
    // Poll for new messages every 2 seconds
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const loadMessages = async () => {
    try {
      const msgs = await APIService.getChatMessages(roomCode);
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await APIService.sendChatMessage(roomCode, userId, userName, message);
      setMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
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
              <strong>{msg.user_name}:</strong> {msg.message}
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
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default Chat;
