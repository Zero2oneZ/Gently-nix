import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container, 
  Card, 
  CardContent,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  ChatBubble, 
  LockOpen 
} from '@mui/icons-material';

const AIComparisonLogin = ({ onAuthenticate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthentication = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Simulate AI-powered authentication
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CLAUDE_API_KEY
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          messages: [
            {
              role: "user",
              content: `Authenticate user:
              Username: ${username}
              Password: ${await hashPassword(password)}
              Return secure JSON response with:
              - success: boolean
              - user_id: string
              - api_keys: {
                  claude: string,
                  gemini: string
                }
              - error: string (if applicable)`
            }
          ],
          max_tokens: 300,
          tools: [
            {
              name: "multi_ai_authentication",
              description: "Secure authentication for multi-AI chat platform"
            }
          ]
        })
      });

      const data = await response.json();
      const authResult = JSON.parse(data.content[0].text);

      if (authResult.success) {
        // Persist authentication state securely
        await window.storage.set('user_session', JSON.stringify({
          user_id: authResult.user_id,
          api_keys: authResult.api_keys
        }), true);

        // Trigger parent component authentication
        onAuthenticate({
          userId: authResult.user_id,
          apiKeys: authResult.api_keys
        });
      } else {
        setError(authResult.error || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Authentication error:', error);
    }
  };

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  return (
    <Container maxWidth="xs">
      <Card sx={{ mt: 8 }}>
        <CardContent>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <ChatBubble sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography component="h1" variant="h5">
              AI Comparison Chat
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box 
              component="form" 
              onSubmit={handleAuthentication} 
              sx={{ mt: 1, width: '100%' }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                startIcon={<LockOpen />}
              >
                Login & Access AI Comparison
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AIComparisonLogin;
