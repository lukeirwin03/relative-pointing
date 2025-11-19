// src/App.jsx
// Main application component with routing

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SessionCreator from './components/SessionCreator';
import SessionJoin from './components/SessionJoin';
import TaskBoard from './components/TaskBoard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home page - create new session */}
          <Route path="/" element={<SessionCreator />} />
          
          {/* Join session with room code */}
          <Route 
            path="/session/:roomCode" 
            element={
              currentUser ? (
                <TaskBoard user={currentUser} />
              ) : (
                <SessionJoin onJoin={setCurrentUser} />
              )
            } 
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
