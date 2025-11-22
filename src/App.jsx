// src/App.jsx
// Main application component with routing

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SessionCreator from './components/SessionCreator';
import SessionJoin from './components/SessionJoin';
import TaskBoard from './components/TaskBoard';
import { ThemeProvider } from './hooks/useTheme';

function App() {
  // Don't auto-restore from localStorage - user must explicitly join/create session
  // This prevents localStorage from carrying over between browser tabs/windows
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Routes>
            {/* Home page - create new session */}
            <Route path="/" element={<SessionCreator onSessionCreated={setCurrentUser} />} />

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
    </ThemeProvider>
  );
}

export default App;
