#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

// OpenF1 API base URL
const OPENF1_API = 'https://api.openf1.org/v1';

class F1MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: '180r',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
        ]
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'get_current_session':
            result = await this.getCurrentSession();
            break;
          case 'get_live_timing':
            result = await this.getLiveTiming(args?.session_key);
            break;
          case 'get_driver_standings':
            result = await this.getDriverStandings(args?.year || 2025);
            break;
          case 'get_race_schedule':
            result = await this.getRaceSchedule(args?.year || 2025);
            break;
          case 'get_session_results':
            result = await this.getSessionResults(args?.session_key);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async getCurrentSession() {
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

  async getLiveTiming(sessionKey) {
    if (!sessionKey) {
      const currentSession = await this.getCurrentSession();
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

  async getDriverStandings(year) {
    const sessions = await axios.get(`${OPENF1_API}/sessions`, {
      params: { year, session_name: 'Race' }
    });

    // F1 points system
    const pointsSystem = {
      1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1
    };

    const standings = {};
    const driverInfo = {}; // Cache for driver info
    
    for (const session of sessions.data) {
      try {
        // Get all position data for this race
        const positions = await axios.get(`${OPENF1_API}/position`, {
          params: { session_key: session.session_key }
        });
        
        // Get driver info for this session (to get current names/teams)
        const drivers = await axios.get(`${OPENF1_API}/drivers`, {
          params: { session_key: session.session_key }
        });
        
        // Update driver info cache with latest data
        drivers.data.forEach(driver => {
          driverInfo[driver.driver_number] = {
            name_acronym: driver.name_acronym,
            full_name: driver.full_name,
            team_name: driver.team_name,
            team_colour: driver.team_colour,
            country_code: driver.country_code
          };
        });
        
        // Get final positions (last position update for each driver)
        const finalPositions = {};
        positions.data.forEach(pos => {
          finalPositions[pos.driver_number] = pos;
        });
        
        // Award points based on final positions
        Object.values(finalPositions).forEach(driver => {
          const driverNum = driver.driver_number;
          const position = driver.position;
          
          if (!standings[driverNum]) {
            standings[driverNum] = {
              driver_number: driverNum,
              points: 0,
              races: 0,
              wins: 0,
              podiums: 0
            };
          }
          
          standings[driverNum].races++;
          
          // Award points if in top 10
          if (position <= 10) {
            standings[driverNum].points += pointsSystem[position] || 0;
          }
          
          // Track wins and podiums
          if (position === 1) standings[driverNum].wins++;
          if (position <= 3) standings[driverNum].podiums++;
        });
        
      } catch (error) {
        continue;
      }
    }

    // Merge driver info with standings
    const standingsWithNames = Object.values(standings).map(driver => {
      const info = driverInfo[driver.driver_number] || {};
      return {
        ...driver,
        name_acronym: info.name_acronym || 'UNK',
        full_name: info.full_name || `Driver #${driver.driver_number}`,
        team_name: info.team_name || 'Unknown Team',
        team_colour: info.team_colour || null,
        country_code: info.country_code || null
      };
    });

    return {
      year,
      standings: standingsWithNames.sort((a, b) => {
        // Sort by points first, then by wins, then by podiums
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.podiums - a.podiums;
      }),
      last_updated: new Date().toISOString(),
      races_completed: sessions.data.length
    };
  }

  async getRaceSchedule(year) {
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

  async getSessionResults(sessionKey) {
    const [session, positions, laps] = await Promise.all([
      axios.get(`${OPENF1_API}/sessions`, { params: { session_key: sessionKey } }),
      axios.get(`${OPENF1_API}/position`, { params: { session_key: sessionKey } }),
      axios.get(`${OPENF1_API}/laps`, { params: { session_key: sessionKey } })
    ]);

    const sessionInfo = session.data[0];
    
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🏁 180R MCP Server started');
    console.error('🏎️  Named after the famous 180-degree F1 corners');
  }
}

// Run the server
const server = new F1MCPServer();
server.run().catch(console.error);