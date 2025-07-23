// backend-node/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';
// Middleware
app.use(cors());
app.use(express.json());

// Cache for frequent requests
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Utility function to cache requests
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// WebSocket connection for real-time updates
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'subscribe') {
        ws.isSubscribed = true;
        ws.send(JSON.stringify({ type: 'subscribed', message: 'Connected to live updates' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
});

// Broadcast to all connected WebSocket clients
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.isSubscribed) {
      client.send(JSON.stringify(data));
    }
  });
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Proxy to Python backend with caching
app.get('/api/schedule', async (req, res) => {
  try {
    const cacheKey = `schedule_${req.query.year || 2025}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log('📅 Fetching F1 schedule from Python backend...');
    const response = await axios.get(`${PYTHON_API_URL}/api/schedule`, {
      params: req.query,
      timeout: 30000
    });
    
    setCachedData(cacheKey, response.data);
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ Error fetching schedule:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch schedule',
      message: error.message 
    });
  }
});

// Session data with real-time broadcasting
app.get('/api/session-data', async (req, res) => {
  try {
    const { year, event, session } = req.query;
    const cacheKey = `session_${year}_${event}_${session}`;
    
    console.log(`📊 Fetching session data: ${year} ${event} ${session}`);
    
    const response = await axios.get(`${PYTHON_API_URL}/api/session-data`, {
      params: req.query,
      timeout: 60000 // Longer timeout for data processing
    });
    
    const sessionData = {
      ...response.data,
      timestamp: new Date().toISOString(),
      cached: false
    };
    
    // Cache the data
    setCachedData(cacheKey, sessionData);
    
    // Broadcast to WebSocket clients
    broadcast({
      type: 'session-update',
      data: sessionData
    });
    
    res.json(sessionData);
    
  } catch (error) {
    console.error('❌ Error fetching session data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch session data',
      message: error.response?.data?.error || error.message 
    });
  }
});

// Driver comparison
app.get('/api/driver-comparison', async (req, res) => {
  try {
    console.log('🏎️ Fetching driver comparison...');
    const response = await axios.get(`${PYTHON_API_URL}/api/driver-comparison`, {
      params: req.query,
      timeout: 30000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ Error fetching driver comparison:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch driver comparison',
      message: error.message 
    });
  }
});

// Live timing (future integration with OpenF1)
app.get('/api/live-timing', async (req, res) => {
  try {
    // For now, proxy to Python backend
    const response = await axios.get(`${PYTHON_API_URL}/api/live-timing`, {
      timeout: 10000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ Error fetching live timing:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch live timing',
      message: error.message 
    });
  }
});

// Current F1 weekend info
app.get('/api/current-weekend', async (req, res) => {
  try {
    // Get current F1 weekend from schedule
    const scheduleResponse = await axios.get(`${PYTHON_API_URL}/api/schedule?year=2025`);
    const schedule = scheduleResponse.data;
    
    const now = new Date();
    const currentWeekend = schedule.find(event => {
      const eventDate = new Date(event.date);
      const weekStart = new Date(eventDate);
      weekStart.setDate(eventDate.getDate() - 4); // Start from Thursday
      const weekEnd = new Date(eventDate);
      weekEnd.setDate(eventDate.getDate() + 1); // End day after race
      
      return now >= weekStart && now <= weekEnd;
    });
    
    if (currentWeekend) {
      res.json({
        isRaceWeekend: true,
        event: currentWeekend,
        nextSession: getCurrentSession(currentWeekend)
      });
    } else {
      const nextEvent = schedule.find(event => new Date(event.date) > now);
      res.json({
        isRaceWeekend: false,
        nextEvent: nextEvent,
        daysUntilNext: nextEvent ? Math.ceil((new Date(nextEvent.date) - now) / (1000 * 60 * 60 * 24)) : null
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching current weekend:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch current weekend info',
      message: error.message 
    });
  }
});

// === ML API Routes ===

// Get ML model status
app.get('/api/ml/model-status', async (req, res) => {
  try {
    console.log('🧠 Fetching ML model status...');
    const response = await axios.get(`${PYTHON_API_URL}/api/ml/model-status`, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching ML model status:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch ML model status',
      message: error.message 
    });
  }
});

// Predict tire degradation
app.post('/api/ml/tire-degradation', async (req, res) => {
  try {
    console.log('🏎️ Predicting tire degradation...');
    const response = await axios.post(`${PYTHON_API_URL}/api/ml/tire-degradation`, req.body, {
      timeout: 15000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error predicting tire degradation:', error.message);
    res.status(500).json({ 
      error: 'Failed to predict tire degradation',
      message: error.response?.data?.error || error.message 
    });
  }
});

// Analyze tire strategies
app.post('/api/ml/tire-strategy', async (req, res) => {
  try {
    console.log('📊 Analyzing tire strategies...');
    const response = await axios.post(`${PYTHON_API_URL}/api/ml/tire-strategy`, req.body, {
      timeout: 30000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error analyzing tire strategies:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze tire strategies',
      message: error.response?.data?.error || error.message 
    });
  }
});

// Get tire compound information
app.get('/api/ml/tire-compounds', async (req, res) => {
  try {
    console.log('🛞 Fetching tire compounds...');
    const response = await axios.get(`${PYTHON_API_URL}/api/ml/tire-compounds`, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching tire compounds:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch tire compounds',
      message: error.message 
    });
  }
});

// Get driver tire management skills
app.get('/api/ml/driver-skills', async (req, res) => {
  try {
    console.log('👨‍🏎️ Fetching driver skills...');
    const response = await axios.get(`${PYTHON_API_URL}/api/ml/driver-skills`, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching driver skills:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch driver skills',
      message: error.message 
    });
  }
});

// Train tire degradation model
app.post('/api/ml/train-tire-model', async (req, res) => {
  try {
    console.log('🏋️ Training tire degradation model...');
    const response = await axios.post(`${PYTHON_API_URL}/api/ml/train-tire-model`, req.body, {
      timeout: 300000 // 5 minutes for training
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error training tire model:', error.message);
    res.status(500).json({ 
      error: 'Failed to train tire model',
      message: error.response?.data?.error || error.message 
    });
  }
});

// === Live Session API Routes ===

// Get current/next F1 session info
app.get('/api/current-session', async (req, res) => {
  try {
    console.log('🔴 Fetching current session info...');
    const response = await axios.get(`${PYTHON_API_URL}/api/current-session`, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching current session:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch current session info',
      message: error.message 
    });
  }
});

// Get live timing data during sessions
app.get('/api/live-timing', async (req, res) => {
  try {
    console.log('⏱️ Fetching live timing data...');
    const response = await axios.get(`${PYTHON_API_URL}/api/live-timing`, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching live timing:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch live timing data',
      message: error.message 
    });
  }
});

// Helper function to determine current session
function getCurrentSession(event) {
  const now = new Date();
  const sessions = [
    { name: 'FP1', date: event.sessions.fp1 },
    { name: 'FP2', date: event.sessions.fp2 },
    { name: 'FP3', date: event.sessions.fp3 },
    { name: 'Q', date: event.sessions.qualifying },
    { name: 'R', date: event.sessions.race }
  ].filter(s => s.date);
  
  // Find the next session
  for (const session of sessions) {
    const sessionDate = new Date(session.date);
    if (now < sessionDate) {
      return {
        session: session.name,
        date: session.date,
        timeUntil: sessionDate - now
      };
    }
  }
  
  return null;
}

// Background task to refresh data periodically
setInterval(async () => {
  try {
    // Check if it's a race weekend
    const weekendResponse = await axios.get(`http://localhost:${PORT}/api/current-weekend`);
    const weekendInfo = weekendResponse.data;
    
    if (weekendInfo.isRaceWeekend) {
      console.log('🔄 Auto-refreshing race weekend data...');
      
      // Refresh session data for current event
      const event = weekendInfo.event;
      const sessionData = await axios.get(`${PYTHON_API_URL}/api/session-data`, {
        params: {
          year: 2025,
          event: event.location,
          session: 'Q' // Default to qualifying
        }
      });
      
      // Broadcast update
      broadcast({
        type: 'auto-update',
        data: sessionData.data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log('🔄 Auto-refresh skipped:', error.message);
  }
}, 60000); // Every minute during race weekends

// API-only server - React is served separately

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
server.listen(PORT, () => {
  console.log('🏁 F1 Dashboard API Server Starting...');
  console.log('=' * 50);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🐍 Python backend: ${PYTHON_API_URL}`);
  console.log(`📱 React app: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('=' * 50);
  
  // Test Python backend connection
  axios.get(`${PYTHON_API_URL}/api/schedule?year=2025`)
    .then(() => {
      console.log('✅ Python backend connection successful');
    })
    .catch((error) => {
      console.log('❌ Python backend connection failed:', error.message);
      console.log('💡 Make sure Python backend is running on port 5000');
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});