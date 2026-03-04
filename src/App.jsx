// src/App.jsx
// Main application component with routing

import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import SessionCreator from './components/SessionCreator';
import TaskBoard from './components/TaskBoard';
import { ThemeProvider } from './hooks/useTheme';

// Helper to get initial user from localStorage (synchronous)
function getStoredUser() {
  const storedUserId = localStorage.getItem('userId');
  const storedUserName = localStorage.getItem('userName');

  if (storedUserId && storedUserName) {
    return {
      id: storedUserId,
      name: storedUserName,
    };
  }
  return null;
}

function App() {
  // Initialize user from localStorage synchronously to avoid redirect race condition
  const [currentUser, setCurrentUser] = useState(getStoredUser);

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
            <Route
              path="/"
              element={<SessionCreator onSessionCreated={setCurrentUser} />}
            />

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
