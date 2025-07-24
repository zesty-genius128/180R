const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenF1 API base URL
const OPENF1_API = 'https://api.openf1.org/v1';

app.use(cors());
app.use(express.json());

// MCP Server Tools
const tools = [
  {
    name: 'get_current_session',
    description: 'Get current or next F1 session information',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_live_timing',
    description: 'Get live timing data for current session',
    inputSchema: {
      type: 'object',
      properties: {
        session_key: {
          type: 'string',
          description: 'Session key for specific session'
        }
      },
      required: []
    }
  },
  {
    name: 'get_driver_standings',
    description: 'Get current driver championship standings',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'number',
          description: 'Championship year (default: 2025)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_race_schedule',
    description: 'Get F1 race schedule for the season',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'number',
          description: 'Season year (default: 2025)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_session_results',
    description: 'Get results for a specific session',
    inputSchema: {
      type: 'object',
      properties: {
        session_key: {
          type: 'string',
          description: 'Session key'
        }
      },
      required: ['session_key']
    }
  }
];

// MCP list_tools endpoint
app.post('/list_tools', (req, res) => {
  res.json({ tools });
});

// MCP call_tool endpoint
app.post('/call_tool', async (req, res) => {
  const { name, arguments: args = {} } = req.body;

  try {
    let result;

    switch (name) {
      case 'get_current_session':
        result = await getCurrentSession();
        break;
      case 'get_live_timing':
        result = await getLiveTiming(args.session_key);
        break;
      case 'get_driver_standings':
        result = await getDriverStandings(args.year || 2025);
        break;
      case 'get_race_schedule':
        result = await getRaceSchedule(args.year || 2025);
        break;
      case 'get_session_results':
        result = await getSessionResults(args.session_key);
        break;
      default:
        return res.status(400).json({ error: `Unknown tool: ${name}` });
    }

    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      isError: true
    });
  }
});

// Tool implementations
async function getCurrentSession() {
  const now = new Date();
  const response = await axios.get(`${OPENF1_API}/sessions`, {
    params: {
      year: 2025,
      date_start: now.toISOString().split('T')[0]
    }
  });

  const sessions = response.data;
  const currentSession = sessions.find(session => {
    const start = new Date(session.date_start);
    const end = new Date(session.date_end);
    return now >= start && now <= end;
  });

  if (currentSession) {
    return {
      status: 'LIVE',
      session: currentSession,
      message: `${currentSession.session_name} at ${currentSession.location} is currently live`
    };
  }

  const nextSession = sessions.find(session => new Date(session.date_start) > now);
  if (nextSession) {
    const timeUntil = new Date(nextSession.date_start) - now;
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      status: 'UPCOMING',
      session: nextSession,
      message: `Next: ${nextSession.session_name} at ${nextSession.location} in ${hours}h ${minutes}m`
    };
  }

  return {
    status: 'NO_SESSION',
    message: 'No current or upcoming sessions'
  };
}

async function getLiveTiming(sessionKey) {
  if (!sessionKey) {
    const currentSession = await getCurrentSession();
    if (currentSession.session) {
      sessionKey = currentSession.session.session_key;
    } else {
      throw new Error('No session key provided and no current session found');
    }
  }

  const [positions, laps] = await Promise.all([
    axios.get(`${OPENF1_API}/position`, { params: { session_key: sessionKey } }),
    axios.get(`${OPENF1_API}/laps`, { params: { session_key: sessionKey } })
  ]);

  return {
    session_key: sessionKey,
    positions: positions.data.slice(-20), // Last 20 position updates
    recent_laps: laps.data.slice(-10), // Last 10 laps
    timestamp: new Date().toISOString()
  };
}

async function getDriverStandings(year) {
  // OpenF1 doesn't have standings endpoint, so we'll aggregate from race results
  const sessions = await axios.get(`${OPENF1_API}/sessions`, {
    params: { year, session_name: 'Race' }
  });

  const standings = {};
  
  // This is a simplified standings calculation
  // In practice, you'd need to implement proper points calculation
  for (const session of sessions.data) {
    try {
      const results = await axios.get(`${OPENF1_API}/position`, {
        params: { session_key: session.session_key }
      });
      
      // Process results to build standings (simplified)
      results.data.forEach(pos => {
        if (!standings[pos.driver_number]) {
          standings[pos.driver_number] = {
            driver_number: pos.driver_number,
            points: 0,
            races: 0
          };
        }
        standings[pos.driver_number].races++;
      });
    } catch (error) {
      // Skip sessions with no data
      continue;
    }
  }

  return {
    year,
    standings: Object.values(standings).sort((a, b) => b.points - a.points),
    last_updated: new Date().toISOString()
  };
}

async function getRaceSchedule(year) {
  const response = await axios.get(`${OPENF1_API}/sessions`, {
    params: { year, session_name: 'Race' }
  });

  const races = response.data.map((session, index) => ({
    round: index + 1,
    race_name: `${session.location} Grand Prix`,
    location: session.location,
    country: session.country_name,
    date: session.date_start.split('T')[0],
    session_key: session.session_key,
    status: new Date(session.date_start) < new Date() ? 'COMPLETED' : 'SCHEDULED'
  }));

  return {
    year,
    total_races: races.length,
    races
  };
}

async function getSessionResults(sessionKey) {
  const [session, positions, laps] = await Promise.all([
    axios.get(`${OPENF1_API}/sessions`, { params: { session_key: sessionKey } }),
    axios.get(`${OPENF1_API}/position`, { params: { session_key: sessionKey } }),
    axios.get(`${OPENF1_API}/laps`, { params: { session_key: sessionKey } })
  ]);

  const sessionInfo = session.data[0];
  
  // Get final positions (last position update for each driver)
  const finalPositions = {};
  positions.data.forEach(pos => {
    finalPositions[pos.driver_number] = pos;
  });

  return {
    session: sessionInfo,
    final_positions: Object.values(finalPositions).sort((a, b) => a.position - b.position),
    total_laps: Math.max(...laps.data.map(lap => lap.lap_number || 0)),
    session_key: sessionKey
  };
}

// MCP-remote expects these endpoints
app.post('/', (req, res) => {
  // Handle initialize and other root MCP requests
  if (req.body && req.body.method === 'initialize') {
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: '180R',
          version: '1.0.0'
        }
      }
    });
  } else {
    res.status(404).json({ error: 'Unsupported method' });
  }
});

// SSE endpoint for mcp-remote
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial event
  res.write('event: message\n');
  res.write('data: {"jsonrpc":"2.0","method":"initialized","params":{}}\n\n');

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write('data: {"jsonrpc":"2.0","method":"ping"}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: '180R MCP Server',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🏁 180R MCP Server running on port ${PORT}`);
  console.log(`📡 OpenF1 API integration active`);
  console.log(`🔧 MCP tools available: ${tools.length}`);
  console.log(`🏎️  Named after the famous 180-degree F1 corners`);
});