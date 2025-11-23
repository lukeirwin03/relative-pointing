// src/App.jsx
// Main application component with routing

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SessionCreator from './components/SessionCreator';
import TaskBoard from './components/TaskBoard';
import { ThemeProvider } from './hooks/useTheme';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    
    if (storedUserId && storedUserName) {
      setCurrentUser({
        id: storedUserId,
        name: storedUserName,
      });
    }
  }, []);

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  };

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Routes>
            {/* Home page - create or join session */}
            <Route path="/" element={<SessionCreator onSessionCreated={setCurrentUser} />} />

            {/* Session room */}
            <Route
              path="/session/:roomCode"
              element={
                currentUser ? (
                  <TaskBoard user={currentUser} onLogout={handleUserLogout} />
                ) : (
                  <Navigate to="/" replace />
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
