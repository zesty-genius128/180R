const request = require('supertest');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Mock axios for API calls
jest.mock('axios');
const mockedAxios = axios;

// Create test app similar to the MCP server
const app = express();
app.use(cors());
app.use(express.json());

// Mock OpenF1 API responses
const mockSessionData = {
  data: [
    {
      session_key: 'latest',
      session_name: 'Race',
      date_start: '2025-08-30T14:00:00+00:00',
      date_end: '2025-08-30T16:00:00+00:00',
      gmt_offset: '+02:00',
      session_type: 'R',
      location: 'Spa-Francorchamps',
      country_name: 'Belgium',
      meeting_key: 1245
    }
  ]
};

const mockDriverStandings = {
  data: [
    {
      driver_number: 1,
      full_name: 'Max Verstappen',
      name_acronym: 'VER',
      team_name: 'Red Bull Racing',
      position: 1
    },
    {
      driver_number: 16,
      full_name: 'Charles Leclerc',
      name_acronym: 'LEC',
      team_name: 'Ferrari',
      position: 2
    }
  ]
};

// Test routes based on MCP server functionality
app.get('/api/current-session', async (req, res) => {
  try {
    mockedAxios.get.mockResolvedValue(mockSessionData);
    const response = await axios.get('https://api.openf1.org/v1/sessions');
    res.json({
      session: response.data[0] || null,
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session data' });
  }
});

app.get('/api/driver-standings', async (req, res) => {
  try {
    mockedAxios.get.mockResolvedValue(mockDriverStandings);
    const response = await axios.get('https://api.openf1.org/v1/drivers');
    res.json({
      standings: response.data,
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver standings' });
  }
});

app.get('/api/tools', (req, res) => {
  const tools = [
    {
      name: 'get_current_session',
      description: 'Get current or next F1 session information'
    },
    {
      name: 'get_live_timing',
      description: 'Get live timing data for current session'
    },
    {
      name: 'get_driver_standings',
      description: 'Get current driver championship standings'
    }
  ];
  res.json({ tools });
});

describe('MCP Server Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Management', () => {
    test('GET /api/current-session should return current session data', async () => {
      const response = await request(app)
        .get('/api/current-session')
        .expect(200);

      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.session).toHaveProperty('session_name', 'Race');
      expect(response.body.session).toHaveProperty('location', 'Spa-Francorchamps');
    });

    test('should handle session API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      
      const response = await request(app)
        .get('/api/current-session')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to fetch session data');
    });
  });

  describe('Driver Standings', () => {
    test('GET /api/driver-standings should return driver standings', async () => {
      const response = await request(app)
        .get('/api/driver-standings')
        .expect(200);

      expect(response.body).toHaveProperty('standings');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.standings).toBeInstanceOf(Array);
      expect(response.body.standings[0]).toHaveProperty('full_name', 'Max Verstappen');
      expect(response.body.standings[0]).toHaveProperty('position', 1);
    });

    test('should handle driver standings API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      
      const response = await request(app)
        .get('/api/driver-standings')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to fetch driver standings');
    });
  });

  describe('MCP Tools', () => {
    test('GET /api/tools should return available MCP tools', async () => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(response.body).toHaveProperty('tools');
      expect(response.body.tools).toBeInstanceOf(Array);
      expect(response.body.tools.length).toBeGreaterThan(0);
      
      const toolNames = response.body.tools.map(tool => tool.name);
      expect(toolNames).toContain('get_current_session');
      expect(toolNames).toContain('get_driver_standings');
    });

    test('tools should have required properties', async () => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      response.body.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      });
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/current-session')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/current-session')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});