import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline 
} from '@mui/material';
import AIComparisonLogin from './Authentication';
import AIComparisonChat from './AIComparisonChat';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#121212',
      paper: '#1d1d1d'
    }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
  }
});

function App() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userId: null,
    apiKeys: null
  });

  useEffect(() => {
    const checkPreviousSession = async () => {
      try {
        const storedSession = await window.storage.get('user_session', true);
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession.value);
          setAuthState({
            isAuthenticated: true,
            userId: parsedSession.user_id,
            apiKeys: parsedSession.api_keys
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    checkPreviousSession();
  }, []);

  const handleAuthentication = (authData) => {
    setAuthState({
      isAuthenticated: true,
      userId: authData.userId,
      apiKeys: authData.apiKeys
    });
  };

  const handleLogout = async () => {
    await window.storage.delete('user_session', true);
    setAuthState({
      isAuthenticated: false,
      userId: null,
      apiKeys: null
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!authState.isAuthenticated ? (
        <AIComparisonLogin onAuthenticate={handleAuthentication} />
      ) : (
        <AIComparisonChat 
          apiKeys={authState.apiKeys} 
          onLogout={handleLogout} 
        />
      )}
    </ThemeProvider>
  );
}

export default App;
