import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Send, 
  CompareArrows, 
  Clear, 
  ModelTraining 
} from '@mui/icons-material';

// Utility for API calls to different AI services
const useAIComparison = (apiKeys) => {
  const [claudeResponses, setClaudeResponses] = useState([]);
  const [geminiResponses, setGeminiResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const callClaudeAPI = async (prompt) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKeys.claude
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      return `Error: ${error.message}`;
    }
  };

  const callGeminiAPI = async (prompt) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeys.gemini}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: prompt }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return `Error: ${error.message}`;
    }
  };

  const compareResponses = async (prompt) => {
    setIsLoading(true);
    
    try {
      const [claudeResponse, geminiResponse] = await Promise.all([
        callClaudeAPI(prompt),
        callGeminiAPI(prompt)
      ]);

      setClaudeResponses(prev => [...prev, { prompt, response: claudeResponse }]);
      setGeminiResponses(prev => [...prev, { prompt, response: geminiResponse }]);
    } catch (error) {
      console.error('Comparison Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponses = () => {
    setClaudeResponses([]);
    setGeminiResponses([]);
  };

  return { 
    compareResponses, 
    claudeResponses, 
    geminiResponses, 
    isLoading,
    clearResponses 
  };
};

const AIComparisonChat = ({ apiKeys, onLogout }) => {
  const [prompt, setPrompt] = useState('');
  const { 
    compareResponses, 
    claudeResponses, 
    geminiResponses, 
    isLoading,
    clearResponses 
  } = useAIComparison(apiKeys);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      compareResponses(prompt);
      setPrompt('');
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        py: 2 
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Typography variant="h4">
            AI Comparison Chat
          </Typography>
          <Box>
            <Tooltip title="Clear Conversation">
              <IconButton onClick={clearResponses}>
                <Clear />
              </IconButton>
            </Tooltip>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={onLogout}
              startIcon={<ModelTraining />}
            >
              Logout
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Claude Chat Interface */}
          <Grid item xs={6} sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <Paper 
              elevation={3} 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'primary.light',
                color: 'primary.contrastText'
              }}>
                <Typography variant="h6">
                  Claude Responses
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  p: 2 
                }}
              >
                {claudeResponses.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Prompt: {item.prompt}
                    </Typography>
                    <Typography variant="body2">
                      {item.response}
                    </Typography>
                    {index < claudeResponses.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Gemini Chat Interface */}
          <Grid item xs={6} sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <Paper 
              elevation={3} 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'secondary.light',
                color: 'secondary.contrastText'
              }}>
                <Typography variant="h6">
                  Gemini Responses
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  p: 2 
                }}
              >
                {geminiResponses.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Prompt: {item.prompt}
                    </Typography>
                    <Typography variant="body2">
                      {item.response}
                    </Typography>
                    {index < geminiResponses.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Prompt Input */}
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            mt: 2, 
            display: 'flex', 
            alignItems: 'center' 
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter your prompt to compare Claude and Gemini..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            sx={{ mr: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton type="submit" disabled={isLoading}>
                  <Send />
                </IconButton>
              )
            }}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default AIComparisonChat;
