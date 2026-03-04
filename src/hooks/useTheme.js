import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * Theme provider component
 */
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isChristmas, setIsChristmas] = useState(() => {
    // Check localStorage, default to true during December
    const saved = localStorage.getItem('christmasMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Default to enabled in December
    return new Date().getMonth() === 11;
  });

  useEffect(() => {
    // Update DOM and localStorage
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('christmasMode', isChristmas.toString());
  }, [isChristmas]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const toggleChristmas = () => {
    setIsChristmas(!isChristmas);
  };

  return (
    <ThemeContext.Provider
      value={{ isDark, toggleTheme, isChristmas, toggleChristmas }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
