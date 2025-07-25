#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

// API endpoints
const OPENF1_API = 'https://api.openf1.org/v1';
const ERGAST_API = 'https://ergast.com/api/f1';
const F1_LIVETIMING_API = 'https://livetiming.formula1.com/static';

class F1MCPServer {
  constructor() {
    // Set up axios defaults with proper headers
    axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    axios.defaults.headers.common['Accept'] = 'application/json';
    axios.defaults.headers.common['Accept-Language'] = 'en-US,en;q=0.9';
    axios.defaults.timeout = 30000; // 30 second timeout
    
    // Add rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
    
    // Free mode - no authentication required
    console.error('180R MCP Server running in FREE MODE');
    console.error('Live data during sessions may be limited - historical data available after sessions');
    
    this.server = new Server(
      {
        name: '180r',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
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
          // EXISTING TOOLS
          {
            name: 'get_current_session',
            description: 'Get current or next F1 session information (FREE MODE: basic info only during live sessions)',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'get_live_timing',
            description: 'Get timing data for sessions (FREE MODE: limited during live sessions, full data after completion)',
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
          },
          {
            name: 'get_tire_strategy_analysis',
            description: 'Analyze tire strategies and pit windows (FREE MODE: works best with historical data)',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key for analysis'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_sector_performance',
            description: 'Get detailed sector times and performance analysis',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                driver_number: {
                  type: 'number',
                  description: 'Specific driver to analyze (optional)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_championship_implications',
            description: 'Calculate championship points scenarios and what-if analysis',
            inputSchema: {
              type: 'object',
              properties: {
                target_driver: {
                  type: 'number',
                  description: 'Driver number to analyze scenarios for'
                },
                position_scenarios: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Array of finishing positions to analyze'
                }
              },
              required: ['target_driver']
            }
          },
          {
            name: 'get_weather_impact_analysis',
            description: 'Analyze weather conditions and their strategic implications',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key for weather analysis'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_current_car_performance',
            description: 'Get detailed car performance data including pace, reliability, and development updates',
            inputSchema: {
              type: 'object',
              properties: {
                team_name: {
                  type: 'string',
                  description: 'Specific team to analyze (optional)'
                }
              },
              required: []
            }
          },
          {
            name: 'get_tire_compound_analysis',
            description: 'Current tire compound performance and degradation data',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session to analyze tire performance'
                },
                track_name: {
                  type: 'string',
                  description: 'Track name for compound analysis'
                }
              },
              required: []
            }
          },
          {
            name: 'get_driver_form_analysis',
            description: 'Current driver performance trends and form analysis',
            inputSchema: {
              type: 'object',
              properties: {
                driver_number: {
                  type: 'number',
                  description: 'Driver to analyze (optional, analyzes all if not provided)'
                },
                races_back: {
                  type: 'number',
                  description: 'Number of recent races to analyze (default: 5)'
                }
              },
              required: []
            }
          },
          // NEW OPENF1 ENDPOINTS
          {
            name: 'get_car_data',
            description: 'Get car telemetry data (FREE MODE: restricted during live sessions, available after completion)',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                driver_number: {
                  type: 'number',
                  description: 'Driver number (optional, all drivers if not provided)'
                },
                latest_only: {
                  type: 'boolean',
                  description: 'Get only latest data points (default: true)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_intervals',
            description: 'Get gap timing between drivers (FREE MODE: limited during live sessions)',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                driver_number: {
                  type: 'number',
                  description: 'Specific driver to analyze gaps for (optional)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_location',
            description: 'Get GPS coordinates and track position data (FREE MODE: limited during live sessions)',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                driver_number: {
                  type: 'number',
                  description: 'Driver number (optional, all drivers if not provided)'
                },
                latest_only: {
                  type: 'boolean',
                  description: 'Get only latest positions (default: true)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_pit_data',
            description: 'Get pit stop data and timing information',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                driver_number: {
                  type: 'number',
                  description: 'Driver number (optional, all drivers if not provided)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_race_control',
            description: 'Get race director messages, flags, and safety information',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                category: {
                  type: 'string',
                  description: 'Filter by category (Flag, SafetyCar, DRS, etc.)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_team_radio',
            description: 'Get driver-team radio communications (FREE MODE: limited during live sessions)',
            inputSchema: {
              type: 'object',
              properties: {
                session_key: {
                  type: 'string',
                  description: 'Session key'
                },
                driver_number: {
                  type: 'number',
                  description: 'Driver number (optional, all drivers if not provided)'
                }
              },
              required: ['session_key']
            }
          },
          {
            name: 'get_session_result_beta',
            description: 'Get official session results (beta endpoint)',
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
          },
          {
            name: 'get_starting_grid_beta',
            description: 'Get starting grid positions (beta endpoint)',
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
          },
          // ERGAST API ENDPOINTS
          {
            name: 'get_ergast_circuits',
            description: 'Get circuit information from Ergast API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year (optional)'
                },
                circuit_id: {
                  type: 'string',
                  description: 'Specific circuit ID (optional)'
                }
              },
              required: []
            }
          },
          {
            name: 'get_ergast_constructors',
            description: 'Get constructor/team information from Ergast API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year (optional)'
                },
                constructor_id: {
                  type: 'string',
                  description: 'Specific constructor ID (optional)'
                }
              },
              required: []
            }
          },
          {
            name: 'get_ergast_drivers',
            description: 'Get driver information from Ergast API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year (optional)'
                },
                driver_id: {
                  type: 'string',
                  description: 'Specific driver ID (optional)'
                }
              },
              required: []
            }
          },
          {
            name: 'get_ergast_results',
            description: 'Get race results from Ergast API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year'
                },
                round: {
                  type: 'number',
                  description: 'Race round (optional, current if not provided)'
                }
              },
              required: ['year']
            }
          },
          {
            name: 'get_ergast_qualifying',
            description: 'Get qualifying results from Ergast API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year'
                },
                round: {
                  type: 'number',
                  description: 'Race round (optional, current if not provided)'
                }
              },
              required: ['year']
            }
          },
          {
            name: 'get_ergast_standings',
            description: 'Get championship standings from Ergast API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year'
                },
                type: {
                  type: 'string',
                  enum: ['drivers', 'constructors'],
                  description: 'Type of standings (drivers or constructors)'
                },
                round: {
                  type: 'number',
                  description: 'After which round (optional, latest if not provided)'
                }
              },
              required: ['year', 'type']
            }
          },
          // F1 LIVETIMING API ENDPOINTS
          {
            name: 'get_livetiming_data',
            description: 'Get timing data from F1 LiveTiming API (FREE MODE: limited access during live sessions)',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year'
                },
                meeting_key: {
                  type: 'string',
                  description: 'Meeting key/identifier'
                },
                session_key: {
                  type: 'string',
                  description: 'Session key/identifier'
                },
                data_type: {
                  type: 'string',
                  enum: ['ArchiveStatus', 'AudioStreams', 'CarData', 'ContentStreams', 'DriverList', 'ExtrapolatedClock', 'Heartbeat', 'LapCount', 'LapSeries', 'Position', 'RaceControlMessages', 'SessionData', 'SessionInfo', 'SessionStatus', 'TeamRadio', 'TimingAppData', 'TimingData', 'TimingStats', 'TopThree', 'TrackStatus', 'WeatherData'],
                  description: 'Type of live timing data to fetch'
                }
              },
              required: ['year', 'data_type']
            }
          },
          {
            name: 'get_livetiming_session_info',
            description: 'Get session information from F1 LiveTiming API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year'
                },
                meeting_key: {
                  type: 'string',
                  description: 'Meeting key (optional)'
                }
              },
              required: ['year']
            }
          },
          {
            name: 'get_livetiming_heartbeat',
            description: 'Get live session heartbeat and status from F1 LiveTiming API',
            inputSchema: {
              type: 'object',
              properties: {
                year: {
                  type: 'number',
                  description: 'Season year'
                },
                meeting_key: {
                  type: 'string',
                  description: 'Meeting key'
                }
              },
              required: ['year']
            }
          },
          {
            name: 'get_sessions_by_date',
            description: 'Get F1 sessions for a specific date (useful for finding practice sessions that happened today)',
            inputSchema: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'Date in YYYY-MM-DD format (default: today)'
                },
                location: {
                  type: 'string',
                  description: 'Filter by location/track name (optional)'
                }
              },
              required: []
            }
          },
          {
            name: 'get_free_session_info',
            description: 'Get F1 session information (FREE - ALWAYS WORKS - including during live sessions)',
            inputSchema: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'Date to check (YYYY-MM-DD, default: today)'
                }
              },
              required: []
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
          case 'get_tire_strategy_analysis':
            result = await this.getTireStrategyAnalysis(args?.session_key);
            break;
          case 'get_sector_performance':
            result = await this.getSectorPerformance(args?.session_key, args?.driver_number);
            break;
          case 'get_championship_implications':
            result = await this.getChampionshipImplications(args?.target_driver, args?.position_scenarios);
            break;
          case 'get_weather_impact_analysis':
            result = await this.getWeatherImpactAnalysis(args?.session_key);
            break;
          case 'get_current_car_performance':
            result = await this.getCurrentCarPerformance(args?.team_name);
            break;
          case 'get_tire_compound_analysis':
            result = await this.getTireCompoundAnalysis(args?.session_key, args?.track_name);
            break;
          case 'get_driver_form_analysis':
            result = await this.getDriverFormAnalysis(args?.driver_number, args?.races_back);
            break;
          // NEW OPENF1 ENDPOINTS
          case 'get_car_data':
            result = await this.getCarData(args?.session_key, args?.driver_number, args?.latest_only);
            break;
          case 'get_intervals':
            result = await this.getIntervals(args?.session_key, args?.driver_number);
            break;
          case 'get_location':
            result = await this.getLocation(args?.session_key, args?.driver_number, args?.latest_only);
            break;
          case 'get_pit_data':
            result = await this.getPitData(args?.session_key, args?.driver_number);
            break;
          case 'get_race_control':
            result = await this.getRaceControl(args?.session_key, args?.category);
            break;
          case 'get_team_radio':
            result = await this.getTeamRadio(args?.session_key, args?.driver_number);
            break;
          case 'get_session_result_beta':
            result = await this.getSessionResultBeta(args?.session_key);
            break;
          case 'get_starting_grid_beta':
            result = await this.getStartingGridBeta(args?.session_key);
            break;
          // ERGAST API ENDPOINTS
          case 'get_ergast_circuits':
            result = await this.getErgastCircuits(args?.year, args?.circuit_id);
            break;
          case 'get_ergast_constructors':
            result = await this.getErgastConstructors(args?.year, args?.constructor_id);
            break;
          case 'get_ergast_drivers':
            result = await this.getErgastDrivers(args?.year, args?.driver_id);
            break;
          case 'get_ergast_results':
            result = await this.getErgastResults(args?.year, args?.round);
            break;
          case 'get_ergast_qualifying':
            result = await this.getErgastQualifying(args?.year, args?.round);
            break;
          case 'get_ergast_standings':
            result = await this.getErgastStandings(args?.year, args?.type, args?.round);
            break;
          // F1 LIVETIMING API ENDPOINTS
          case 'get_livetiming_data':
            result = await this.getLiveTimingData(args?.year, args?.meeting_key, args?.session_key, args?.data_type);
            break;
          case 'get_livetiming_session_info':
            result = await this.getLiveTimingSessionInfo(args?.year, args?.meeting_key);
            break;
          case 'get_livetiming_heartbeat':
            result = await this.getLiveTimingHeartbeat(args?.year, args?.meeting_key);
            break;
          case 'get_sessions_by_date':
            result = await this.getSessionsByDate(args?.date, args?.location);
            break;
          case 'get_free_session_info':
            result = await this.getFreeSessionInfo(args?.date);
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

    // Add required MCP handlers for Claude Desktop
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: [] };
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: [] };
    });
  }

  // Helper method for rate-limited API requests
  async makeRequest(url, params = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      // Prepare headers
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      };
      
      // Free mode - no authentication headers needed
      
      const response = await axios.get(url, { 
        params,
        headers 
      });
      return response;
    } catch (error) {
      // Enhanced error logging
      console.error(`API Request failed for ${url}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      // Provide helpful error messages for free users
      if (error.response?.status === 401) {
        if (url.includes('api.openf1.org')) {
          const restrictedError = new Error('Live session data restricted during active sessions (FREE MODE) - Data available after session ends');
          restrictedError.details = {
            status: 'RESTRICTED_DURING_LIVE',
            retry_after_session: true,
            alternative: 'Try historical data once session completes'
          };
          throw restrictedError;
        }
      }
      
      throw error;
    }
  }

  async getCurrentSession() {
    const now = new Date();
    const response = await this.makeRequest(`${OPENF1_API}/sessions`, {
      year: 2025,
      date_start: now.toISOString().split('T')[0]
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
    const [session, positions, laps, drivers] = await Promise.all([
      axios.get(`${OPENF1_API}/sessions`, { params: { session_key: sessionKey } }),
      axios.get(`${OPENF1_API}/position`, { params: { session_key: sessionKey } }),
      axios.get(`${OPENF1_API}/laps`, { params: { session_key: sessionKey } }),
      axios.get(`${OPENF1_API}/drivers`, { params: { session_key: sessionKey } })
    ]);

    const sessionInfo = session.data[0];
    
    // Create driver info map
    const driverInfo = {};
    drivers.data.forEach(driver => {
      driverInfo[driver.driver_number] = {
        name_acronym: driver.name_acronym,
        full_name: driver.full_name,
        team_name: driver.team_name,
        team_colour: driver.team_colour,
        country_code: driver.country_code
      };
    });
    
    // Get final positions with driver info
    const finalPositions = {};
    positions.data.forEach(pos => {
      finalPositions[pos.driver_number] = pos;
    });

    const resultsWithNames = Object.values(finalPositions).map(driver => {
      const info = driverInfo[driver.driver_number] || {};
      return {
        ...driver,
        name_acronym: info.name_acronym || 'UNK',
        full_name: info.full_name || `Driver #${driver.driver_number}`,
        team_name: info.team_name || 'Unknown Team',
        team_colour: info.team_colour || null,
        country_code: info.country_code || null
      };
    }).sort((a, b) => a.position - b.position);

    return {
      session: sessionInfo,
      final_positions: resultsWithNames,
      total_laps: Math.max(...laps.data.map(lap => lap.lap_number || 0)),
      session_key: sessionKey,
      drivers_count: resultsWithNames.length
    };
  }

  async getTireStrategyAnalysis(sessionKey) {
    try {
      const [drivers, stints, positions] = await Promise.all([
        axios.get(`${OPENF1_API}/drivers`, { params: { session_key: sessionKey } }),
        axios.get(`${OPENF1_API}/stints`, { params: { session_key: sessionKey } }),
        axios.get(`${OPENF1_API}/position`, { params: { session_key: sessionKey } })
      ]);

      // Group stints by driver for analysis
      const driverStints = {};
      stints.data.forEach(stint => {
        if (!driverStints[stint.driver_number]) {
          driverStints[stint.driver_number] = [];
        }
        driverStints[stint.driver_number].push(stint);
      });

      // Analyze tire strategies
      const strategies = Object.entries(driverStints).map(([driverNum, stints]) => {
        const driver = drivers.data.find(d => d.driver_number == driverNum);
        const totalStints = stints.length;
        const compounds = stints.map(s => s.compound).filter(Boolean);
        const pitWindows = stints.map(s => s.stint_number > 1 ? s.lap_start : null).filter(Boolean);

        return {
          driver_number: parseInt(driverNum),
          driver_name: driver?.name_acronym || `#${driverNum}`,
          team_name: driver?.team_name || 'Unknown',
          strategy_type: this.classifyStrategy(compounds, totalStints),
          total_pit_stops: totalStints - 1,
          compounds_used: compounds,
          pit_windows: pitWindows,
          strategy_risk: this.assessStrategyRisk(compounds, pitWindows)
        };
      });

      return {
        session_key: sessionKey,
        tire_strategies: strategies,
        strategy_summary: {
          most_common_strategy: this.getMostCommonStrategy(strategies),
          aggressive_strategies: strategies.filter(s => s.strategy_risk === 'high').length,
          conservative_strategies: strategies.filter(s => s.strategy_risk === 'low').length
        },
        pit_window_analysis: this.analyzePitWindows(strategies),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Tire strategy analysis failed: ${error.message}`);
    }
  }

  async getSectorPerformance(sessionKey, specificDriver = null) {
    try {
      const [drivers, laps] = await Promise.all([
        axios.get(`${OPENF1_API}/drivers`, { params: { session_key: sessionKey } }),
        axios.get(`${OPENF1_API}/laps`, { params: { session_key: sessionKey } })
      ]);

      const driverLaps = {};
      laps.data.forEach(lap => {
        if (!driverLaps[lap.driver_number]) {
          driverLaps[lap.driver_number] = [];
        }
        driverLaps[lap.driver_number].push(lap);
      });

      const sectorAnalysis = Object.entries(driverLaps).map(([driverNum, lapData]) => {
        if (specificDriver && parseInt(driverNum) !== specificDriver) return null;
        
        const driver = drivers.data.find(d => d.driver_number == driverNum);
        const validLaps = lapData.filter(lap => 
          lap.duration_sector_1 && lap.duration_sector_2 && lap.duration_sector_3
        );

        if (validLaps.length === 0) return null;

        const bestSectors = {
          sector_1: Math.min(...validLaps.map(l => l.duration_sector_1)),
          sector_2: Math.min(...validLaps.map(l => l.duration_sector_2)),
          sector_3: Math.min(...validLaps.map(l => l.duration_sector_3))
        };

        const theoretical_best = bestSectors.sector_1 + bestSectors.sector_2 + bestSectors.sector_3;
        const actual_best = Math.min(...validLaps.map(l => l.lap_duration).filter(Boolean));

        return {
          driver_number: parseInt(driverNum),
          driver_name: driver?.name_acronym || `#${driverNum}`,
          team_name: driver?.team_name || 'Unknown',
          best_sectors: bestSectors,
          theoretical_best_lap: theoretical_best,
          actual_best_lap: actual_best,
          time_loss: actual_best ? (actual_best - theoretical_best) : null,
          sector_strengths: this.analyzeSectorStrengths(validLaps, bestSectors),
          consistency: this.calculateConsistency(validLaps)
        };
      }).filter(Boolean);

      return {
        session_key: sessionKey,
        sector_analysis: sectorAnalysis,
        track_evolution: this.analyzeTrackEvolution(laps.data),
        fastest_sectors_overall: this.getFastestSectorsOverall(sectorAnalysis),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Sector performance analysis failed: ${error.message}`);
    }
  }

  async getChampionshipImplications(targetDriver, positionScenarios = [1, 2, 3, 5, 10, 15]) {
    try {
      const currentStandings = await this.getDriverStandings(2025);
      const pointsSystem = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
      
      const target = currentStandings.standings.find(d => d.driver_number === targetDriver);
      if (!target) throw new Error(`Driver #${targetDriver} not found in standings`);

      const scenarios = positionScenarios.map(position => {
        const pointsGained = pointsSystem[position] || 0;
        const newPoints = target.points + pointsGained;
        
        // Calculate new championship position
        const updatedStandings = currentStandings.standings.map(driver => {
          if (driver.driver_number === targetDriver) {
            return { ...driver, points: newPoints };
          }
          return driver;
        }).sort((a, b) => b.points - a.points);

        const newChampionshipPosition = updatedStandings.findIndex(d => d.driver_number === targetDriver) + 1;
        const pointsToLeader = updatedStandings[0].points - newPoints;
        const pointsFromBehind = newChampionshipPosition < updatedStandings.length ? 
          newPoints - updatedStandings[newChampionshipPosition].points : 0;

        return {
          finishing_position: position,
          points_gained: pointsGained,
          new_total_points: newPoints,
          new_championship_position: newChampionshipPosition,
          points_to_leader: Math.max(0, pointsToLeader),
          points_from_behind: pointsFromBehind,
          championship_impact: this.assessChampionshipImpact(newChampionshipPosition, target.points, newPoints)
        };
      });

      return {
        target_driver: {
          driver_number: targetDriver,
          name: target.name_acronym,
          current_points: target.points,
          current_position: currentStandings.standings.findIndex(d => d.driver_number === targetDriver) + 1
        },
        scenarios,
        critical_analysis: {
          races_remaining: 24 - currentStandings.races_completed,
          maximum_possible_points: (24 - currentStandings.races_completed) * 25,
          realistic_championship_chances: this.calculateChampionshipOdds(target, currentStandings)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Championship implications analysis failed: ${error.message}`);
    }
  }

  async getWeatherImpactAnalysis(sessionKey) {
    try {
      const [session, weather, stints] = await Promise.all([
        axios.get(`${OPENF1_API}/sessions`, { params: { session_key: sessionKey } }),
        axios.get(`${OPENF1_API}/weather`, { params: { session_key: sessionKey } }),
        axios.get(`${OPENF1_API}/stints`, { params: { session_key: sessionKey } })
      ]);

      const weatherConditions = weather.data;
      const sessionInfo = session.data[0];

      // Analyze weather trends
      const weatherTrends = this.analyzeWeatherTrends(weatherConditions);
      
      // Impact on tire strategies
      const tireImpact = this.analyzeWeatherTireImpact(weatherConditions, stints.data);

      return {
        session_key: sessionKey,
        session_type: sessionInfo?.session_name || 'Unknown',
        current_conditions: weatherConditions.slice(-1)[0] || null,
        weather_trends: weatherTrends,
        strategic_implications: {
          tire_strategy_impact: tireImpact,
          pit_window_changes: this.assessWeatherPitImpact(weatherConditions),
          risk_assessment: this.assessWeatherRisk(weatherTrends),
          recommendations: this.getWeatherRecommendations(weatherTrends, sessionInfo?.session_name)
        },
        historical_comparison: this.compareWeatherToHistorical(weatherConditions, sessionInfo?.location),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Weather impact analysis failed: ${error.message}`);
    }
  }

  // NEW OPENF1 API ENDPOINTS
  async getCarData(sessionKey, driverNumber = null, latestOnly = true) {
    try {
      const params = { session_key: sessionKey };
      if (driverNumber) params.driver_number = driverNumber;
      
      const response = await axios.get(`${OPENF1_API}/car_data`, { 
        params,
        timeout: 15000
      });
      let carData = response.data;

      // Always limit car data as it can be extremely large
      if (carData.length > 1000) {
        if (latestOnly) {
          // Group by driver and get latest data point for each
          const latestByDriver = {};
          carData.forEach(data => {
            const driver = data.driver_number;
            if (!latestByDriver[driver] || new Date(data.date) > new Date(latestByDriver[driver].date)) {
              latestByDriver[driver] = data;
            }
          });
          carData = Object.values(latestByDriver);
        } else {
          // If not latest only, take most recent 1000 entries
          carData = carData.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 1000);
        }
      } else if (latestOnly && carData.length > 0) {
        // Group by driver and get latest data point for each
        const latestByDriver = {};
        carData.forEach(data => {
          const driver = data.driver_number;
          if (!latestByDriver[driver] || new Date(data.date) > new Date(latestByDriver[driver].date)) {
            latestByDriver[driver] = data;
          }
        });
        carData = Object.values(latestByDriver);
      }

      return {
        session_key: sessionKey,
        car_data: carData.slice(0, 500), // Final safety limit
        data_points: carData.length,
        drivers_count: new Set(carData.map(d => d.driver_number)).size,
        data_limited: response.data.length > carData.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Car data retrieval failed: ${error.message}`);
    }
  }

  async getIntervals(sessionKey, driverNumber = null) {
    try {
      const params = { session_key: sessionKey };
      if (driverNumber) params.driver_number = driverNumber;
      
      const response = await axios.get(`${OPENF1_API}/intervals`, { 
        params,
        timeout: 15000 // 15 second timeout
      });
      let intervals = response.data;
      const originalLength = intervals.length;

      // Smart data limiting that preserves race progression
      if (intervals.length > 800) {
        if (driverNumber) {
          // For single driver: keep all data (it's already filtered)
          intervals = intervals.slice(0, 800); // Just safety limit
        } else {
          // For all drivers: intelligent sampling to preserve race story
          const driverIntervals = {};
          intervals.forEach(interval => {
            const driver = interval.driver_number;
            if (!driverIntervals[driver]) {
              driverIntervals[driver] = [];
            }
            driverIntervals[driver].push(interval);
          });

          // Smart sampling: keep key moments + recent data
          Object.keys(driverIntervals).forEach(driver => {
            const driverData = driverIntervals[driver].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (driverData.length > 50) {
              // Keep: race start (first 10), key moments (every 5th), recent data (last 20)
              const sampled = [
                ...driverData.slice(0, 10), // Race start
                ...driverData.filter((_, i) => i % 5 === 0 && i > 10 && i < driverData.length - 20), // Key moments
                ...driverData.slice(-20) // Recent data
              ];
              driverIntervals[driver] = sampled;
            }
          });

          intervals = Object.values(driverIntervals).flat();
        }
      }

      // Analyze gap trends on processed data
      const gapAnalysis = this.analyzeGapTrends(intervals);
      
      // Enhanced response with better data insights
      const driverCount = new Set(intervals.map(i => i.driver_number)).size;
      const avgDataPerDriver = intervals.length / driverCount;
      
      return {
        session_key: sessionKey,
        intervals: intervals.slice(0, 800), // Final safety limit
        gap_analysis: gapAnalysis,
        data_summary: {
          total_original: originalLength,
          total_returned: Math.min(intervals.length, 800),
          drivers_covered: driverCount,
          avg_points_per_driver: Math.round(avgDataPerDriver),
          data_limited: originalLength > intervals.length,
          sampling_strategy: driverNumber ? 'single_driver_full' : 'intelligent_multi_driver'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Intervals data retrieval failed: ${error.message}`);
    }
  }

  async getLocation(sessionKey, driverNumber = null, latestOnly = true) {
    try {
      const params = { session_key: sessionKey };
      if (driverNumber) params.driver_number = driverNumber;
      
      const response = await axios.get(`${OPENF1_API}/location`, { 
        params,
        timeout: 15000
      });
      let locationData = response.data;

      // Limit location data as it can be extremely large
      if (locationData.length > 2000) {
        if (latestOnly) {
          // Get latest position for each driver
          const latestByDriver = {};
          locationData.forEach(loc => {
            const driver = loc.driver_number;
            if (!latestByDriver[driver] || new Date(loc.date) > new Date(latestByDriver[driver].date)) {
              latestByDriver[driver] = loc;
            }
          });
          locationData = Object.values(latestByDriver);
        } else {
          // Take most recent 2000 entries
          locationData = locationData.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2000);
        }
      } else if (latestOnly && locationData.length > 0) {
        // Get latest position for each driver
        const latestByDriver = {};
        locationData.forEach(loc => {
          const driver = loc.driver_number;
          if (!latestByDriver[driver] || new Date(loc.date) > new Date(latestByDriver[driver].date)) {
            latestByDriver[driver] = loc;
          }
        });
        locationData = Object.values(latestByDriver);
      }

      return {
        session_key: sessionKey,
        location_data: locationData.slice(0, 1000), // Final safety limit
        track_coverage: this.analyzeTrackCoverage(locationData),
        data_points: locationData.length,
        data_limited: response.data.length > locationData.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Location data retrieval failed: ${error.message}`);
    }
  }

  async getPitData(sessionKey, driverNumber = null) {
    try {
      const params = { session_key: sessionKey };
      if (driverNumber) params.driver_number = driverNumber;
      
      const response = await axios.get(`${OPENF1_API}/pit`, { params });
      const pitData = response.data;

      // Analyze pit stop patterns
      const pitAnalysis = this.analyzePitStopPatterns(pitData);
      
      return {
        session_key: sessionKey,
        pit_data: pitData,
        pit_analysis: pitAnalysis,
        total_pit_stops: pitData.length,
        drivers_pitted: new Set(pitData.map(p => p.driver_number)).size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Pit data retrieval failed: ${error.message}`);
    }
  }

  async getRaceControl(sessionKey, category = null) {
    try {
      const params = { session_key: sessionKey };
      if (category) params.category = category;
      
      const response = await axios.get(`${OPENF1_API}/race_control`, { params });
      const raceControlData = response.data;

      // Categorize messages
      const categorizedMessages = this.categorizeRaceControlMessages(raceControlData);
      
      return {
        session_key: sessionKey,
        race_control_messages: raceControlData,
        categorized_messages: categorizedMessages,
        total_messages: raceControlData.length,
        session_incidents: categorizedMessages.incidents?.length || 0,
        flags_issued: categorizedMessages.flags?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Race control data retrieval failed: ${error.message}`);
    }
  }

  async getTeamRadio(sessionKey, driverNumber = null) {
    try {
      const params = { session_key: sessionKey };
      if (driverNumber) params.driver_number = driverNumber;
      
      const response = await axios.get(`${OPENF1_API}/team_radio`, { 
        params,
        timeout: 15000
      });
      let teamRadio = response.data;

      // Limit team radio data (keep most recent 200 transmissions)
      if (teamRadio.length > 200) {
        teamRadio = teamRadio.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 200);
      }

      // Analyze radio frequency and topics
      const radioAnalysis = this.analyzeTeamRadio(teamRadio);
      
      return {
        session_key: sessionKey,
        team_radio: teamRadio,
        radio_analysis: radioAnalysis,
        total_transmissions: teamRadio.length,
        drivers_active: new Set(teamRadio.map(r => r.driver_number)).size,
        data_limited: response.data.length > teamRadio.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Team radio data retrieval failed: ${error.message}`);
    }
  }

  async getSessionResultBeta(sessionKey) {
    try {
      const response = await axios.get(`${OPENF1_API}/session_result`, {
        params: { session_key: sessionKey }
      });
      
      return {
        session_key: sessionKey,
        session_result: response.data,
        note: 'This is a beta endpoint - data structure may change',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Session result (beta) retrieval failed: ${error.message}`);
    }
  }

  async getStartingGridBeta(sessionKey) {
    try {
      const response = await axios.get(`${OPENF1_API}/starting_grid`, {
        params: { session_key: sessionKey }
      });
      
      return {
        session_key: sessionKey,
        starting_grid: response.data,
        note: 'This is a beta endpoint - data structure may change',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Starting grid (beta) retrieval failed: ${error.message}`);
    }
  }

  // ERGAST API ENDPOINTS (with aggressive timeout and fallback handling)
  async getErgastCircuits(year = null, circuitId = null) {
    try {
      let url = `${ERGAST_API}`;
      if (year) url += `/${year}`;
      url += `/circuits`;
      if (circuitId) url += `/${circuitId}`;
      url += '.json';

      const response = await axios.get(url, { 
        timeout: 8000, // Reduced timeout - Ergast is often slow
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      const circuits = response.data.MRData.CircuitTable.Circuits;
      
      return {
        circuits: circuits.slice(0, 30), // Further reduced limit  
        total_circuits: circuits.length,
        year: year || 'all',
        source: 'Ergast API',
        api_status: 'online',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          circuits: [],
          total_circuits: 0,
          year: year || 'all',
          source: 'Ergast API',
          api_status: 'timeout',
          error_message: 'Ergast API is currently slow/unavailable. This is common for the free tier.',
          fallback_suggestion: 'Try OpenF1 API endpoints for current season data',
          timestamp: new Date().toISOString()
        };
      }
      return {
        circuits: [],
        total_circuits: 0,
        year: year || 'all',
        source: 'Ergast API',
        api_status: 'error',
        error_message: `API Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getErgastConstructors(year = null, constructorId = null) {
    try {
      let url = `${ERGAST_API}`;
      if (year) url += `/${year}`;
      url += `/constructors`;
      if (constructorId) url += `/${constructorId}`;
      url += '.json';

      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      const constructors = response.data.MRData.ConstructorTable.Constructors;
      
      return {
        constructors: constructors.slice(0, 30),
        total_constructors: constructors.length,
        year: year || 'all',
        source: 'Ergast API',
        api_status: 'online',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          constructors: [],
          total_constructors: 0,
          year: year || 'all',
          source: 'Ergast API',
          api_status: 'timeout',
          error_message: 'Ergast API is currently slow/unavailable. This is common for the free tier.',
          fallback_suggestion: 'Try OpenF1 API endpoints for current season data',
          timestamp: new Date().toISOString()
        };
      }
      return {
        constructors: [],
        total_constructors: 0,
        year: year || 'all',
        source: 'Ergast API',
        api_status: 'error',
        error_message: `API Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getErgastDrivers(year = null, driverId = null) {
    try {
      let url = `${ERGAST_API}`;
      if (year) url += `/${year}`;
      url += `/drivers`;
      if (driverId) url += `/${driverId}`;
      url += '.json';

      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      const drivers = response.data.MRData.DriverTable.Drivers;
      
      return {
        drivers: drivers.slice(0, 50),
        total_drivers: drivers.length,
        year: year || 'all',
        source: 'Ergast API',
        api_status: 'online',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          drivers: [],
          total_drivers: 0,
          year: year || 'all',
          source: 'Ergast API',
          api_status: 'timeout',
          error_message: 'Ergast API is currently slow/unavailable. This is common for the free tier.',
          fallback_suggestion: 'Try OpenF1 API endpoints for current season data',
          timestamp: new Date().toISOString()
        };
      }
      return {
        drivers: [],
        total_drivers: 0,
        year: year || 'all',
        source: 'Ergast API',
        api_status: 'error',
        error_message: `API Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getErgastResults(year, round = null) {
    try {
      let url = `${ERGAST_API}/${year}`;
      if (round) url += `/${round}`;
      url += '/results.json';

      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      const races = response.data.MRData.RaceTable.Races;
      
      // Limit races to prevent oversized responses
      const limitedRaces = races.slice(0, 15).map(race => ({
        ...race,
        Results: race.Results ? race.Results.slice(0, 25) : [] // Limit results per race
      }));
      
      return {
        races: limitedRaces,
        total_races: races.length,
        year,
        round: round || 'all',
        source: 'Ergast API',
        api_status: 'online',
        data_limited: races.length > 15,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          races: [],
          total_races: 0,
          year,
          round: round || 'all',
          source: 'Ergast API',
          api_status: 'timeout',
          error_message: 'Ergast API is currently slow/unavailable. This is common for the free tier.',
          fallback_suggestion: 'Try OpenF1 API endpoints for current season data',
          timestamp: new Date().toISOString()
        };
      }
      return {
        races: [],
        total_races: 0,
        year,
        round: round || 'all',
        source: 'Ergast API',
        api_status: 'error',
        error_message: `API Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getErgastQualifying(year, round = null) {
    try {
      let url = `${ERGAST_API}/${year}`;
      if (round) url += `/${round}`;
      url += '/qualifying.json';

      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      const races = response.data.MRData.RaceTable.Races;
      
      // Limit races to prevent oversized responses
      const limitedRaces = races.slice(0, 15).map(race => ({
        ...race,
        QualifyingResults: race.QualifyingResults ? race.QualifyingResults.slice(0, 25) : []
      }));
      
      return {
        races: limitedRaces,
        total_races: races.length,
        year,
        round: round || 'all',
        source: 'Ergast API',
        api_status: 'online',
        data_limited: races.length > 15,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          races: [],
          total_races: 0,
          year,
          round: round || 'all',
          source: 'Ergast API',
          api_status: 'timeout',
          error_message: 'Ergast API is currently slow/unavailable. This is common for the free tier.',
          fallback_suggestion: 'Try OpenF1 API endpoints for current season data',
          timestamp: new Date().toISOString()
        };
      }
      return {
        races: [],
        total_races: 0,
        year,
        round: round || 'all',
        source: 'Ergast API',
        api_status: 'error',
        error_message: `API Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getErgastStandings(year, type, round = null) {
    try {
      let url = `${ERGAST_API}/${year}`;
      if (round) url += `/${round}`;
      url += `/${type}Standings.json`;

      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      const standingsTable = type === 'drivers' ? 
        response.data.MRData.StandingsTable.StandingsLists[0].DriverStandings :
        response.data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
      
      return {
        standings: standingsTable.slice(0, 30),
        type,
        year,
        round: round || 'current',
        total_entries: standingsTable.length,
        source: 'Ergast API',
        api_status: 'online',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          standings: [],
          type,
          year,
          round: round || 'current',
          total_entries: 0,
          source: 'Ergast API',
          api_status: 'timeout',
          error_message: 'Ergast API is currently slow/unavailable. This is common for the free tier.',
          fallback_suggestion: 'Try OpenF1 API endpoints for current season data',
          timestamp: new Date().toISOString()
        };
      }
      return {
        standings: [],
        type,
        year,
        round: round || 'current',
        total_entries: 0,
        source: 'Ergast API',
        api_status: 'error',
        error_message: `API Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // F1 LIVETIMING API ENDPOINTS
  async getLiveTimingData(year, meetingKey = null, sessionKey = null, dataType) {
    try {
      let url = `${F1_LIVETIMING_API}/${year}`;
      if (meetingKey) url += `/${meetingKey}`;
      if (sessionKey) url += `/${sessionKey}`;
      url += `/${dataType}.json`;

      const response = await axios.get(url, { 
        timeout: 30000, // LiveTiming can be slow
        headers: { 'User-Agent': '180R-F1-Dashboard/1.0' }
      });
      
      let data = response.data;
      
      // Limit large data responses
      if (typeof data === 'object' && Array.isArray(data) && data.length > 1000) {
        data = data.slice(0, 1000);
      }
      
      return {
        data: data,
        data_type: dataType,
        year,
        meeting_key: meetingKey,
        session_key: sessionKey,
        source: 'F1 LiveTiming API',
        data_limited: Array.isArray(response.data) && response.data.length > 1000,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`F1 LiveTiming API timeout - try again later`);
      }
      throw new Error(`LiveTiming data retrieval failed: ${error.message}`);
    }
  }

  async getLiveTimingSessionInfo(year, meetingKey = null) {
    try {
      let url = `${F1_LIVETIMING_API}/${year}`;
      if (meetingKey) url += `/${meetingKey}`;
      url += '/SessionInfo.json';

      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 
          'User-Agent': '180R-F1-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });
      
      return {
        session_info: response.data,
        year,
        meeting_key: meetingKey,
        source: 'F1 LiveTiming API',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`F1 LiveTiming API timeout - try again later`);
      }
      throw new Error(`LiveTiming session info retrieval failed: ${error.message}`);
    }
  }

  async getLiveTimingHeartbeat(year, meetingKey = null) {
    try {
      let url = `${F1_LIVETIMING_API}/${year}`;
      if (meetingKey) url += `/${meetingKey}`;
      url += '/Heartbeat.json';

      const response = await axios.get(url, { 
        timeout: 15000,
        headers: { 'User-Agent': '180R-F1-Dashboard/1.0' }
      });
      
      return {
        heartbeat: response.data,
        year,
        meeting_key: meetingKey,
        source: 'F1 LiveTiming API',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`F1 LiveTiming API timeout - try again later`);
      }
      throw new Error(`LiveTiming heartbeat retrieval failed: ${error.message}`);
    }
  }

  // Helper methods for new endpoints
  analyzeGapTrends(intervals) {
    if (intervals.length < 2) return { trend: 'insufficient_data' };
    
    const driverGaps = {};
    intervals.forEach(interval => {
      if (!driverGaps[interval.driver_number]) {
        driverGaps[interval.driver_number] = [];
      }
      driverGaps[interval.driver_number].push({
        gap: interval.gap_to_leader || interval.interval,
        timestamp: interval.date
      });
    });

    const trends = {};
    Object.entries(driverGaps).forEach(([driver, gaps]) => {
      if (gaps.length >= 2) {
        const recent = gaps.slice(-3);
        const early = gaps.slice(0, 3);
        const recentAvg = recent.reduce((sum, g) => sum + (parseFloat(g.gap) || 0), 0) / recent.length;
        const earlyAvg = early.reduce((sum, g) => sum + (parseFloat(g.gap) || 0), 0) / early.length;
        
        trends[driver] = {
          trend: recentAvg > earlyAvg ? 'falling_back' : recentAvg < earlyAvg ? 'catching_up' : 'stable',
          gap_change: recentAvg - earlyAvg,
          current_gap: recent[recent.length - 1]?.gap
        };
      }
    });

    return trends;
  }

  analyzeTrackCoverage(locationData) {
    if (locationData.length === 0) return { coverage: 'no_data' };
    
    const xCoords = locationData.map(l => l.x).filter(x => x !== undefined);
    const yCoords = locationData.map(l => l.y).filter(y => y !== undefined);
    
    if (xCoords.length === 0 || yCoords.length === 0) {
      return { coverage: 'incomplete_coordinates' };
    }

    return {
      x_range: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
      y_range: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
      total_points: locationData.length,
      track_completion: this.estimateTrackCompletion(locationData)
    };
  }

  estimateTrackCompletion(locationData) {
    // Simple estimation based on coordinate spread
    const drivers = new Set(locationData.map(l => l.driver_number));
    return {
      drivers_tracked: drivers.size,
      data_density: locationData.length / drivers.size
    };
  }

  analyzePitStopPatterns(pitData) {
    if (pitData.length === 0) return { pattern: 'no_pit_stops' };
    
    const patterns = {
      total_stops: pitData.length,
      drivers_pitted: new Set(pitData.map(p => p.driver_number)).size,
      pit_timing: {},
      pit_duration_stats: this.calculatePitDurationStats(pitData)
    };

    // Analyze pit timing patterns
    pitData.forEach(pit => {
      const driver = pit.driver_number;
      if (!patterns.pit_timing[driver]) {
        patterns.pit_timing[driver] = [];
      }
      patterns.pit_timing[driver].push({
        lap: pit.lap_number,
        duration: pit.pit_duration,
        timestamp: pit.date
      });
    });

    return patterns;
  }

  calculatePitDurationStats(pitData) {
    const durations = pitData.map(p => p.pit_duration).filter(d => d && d > 0);
    if (durations.length === 0) return { average: null, fastest: null, slowest: null };
    
    return {
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      fastest: Math.min(...durations),
      slowest: Math.max(...durations),
      total_stops: durations.length
    };
  }

  categorizeRaceControlMessages(raceControlData) {
    const categories = {
      flags: [],
      safety_car: [],
      drs: [],
      incidents: [],
      other: []
    };

    raceControlData.forEach(message => {
      const msg = message.message?.toLowerCase() || '';
      const category = message.category?.toLowerCase() || '';
      
      if (msg.includes('flag') || category.includes('flag')) {
        categories.flags.push(message);
      } else if (msg.includes('safety car') || msg.includes('virtual safety') || category.includes('safetycar')) {
        categories.safety_car.push(message);
      } else if (msg.includes('drs') || category.includes('drs')) {
        categories.drs.push(message);
      } else if (msg.includes('incident') || msg.includes('investigation') || category.includes('incident')) {
        categories.incidents.push(message);
      } else {
        categories.other.push(message);
      }
    });

    return categories;
  }

  analyzeTeamRadio(teamRadio) {
    if (teamRadio.length === 0) return { analysis: 'no_radio_data' };
    
    const analysis = {
      total_transmissions: teamRadio.length,
      drivers_active: new Set(teamRadio.map(r => r.driver_number)).size,
      transmission_frequency: {},
      recent_activity: teamRadio.slice(-10), // Last 10 transmissions
      driver_activity: {}
    };

    // Analyze per-driver activity
    teamRadio.forEach(radio => {
      const driver = radio.driver_number;
      if (!analysis.driver_activity[driver]) {
        analysis.driver_activity[driver] = {
          transmissions: 0,
          last_transmission: null
        };
      }
      analysis.driver_activity[driver].transmissions++;
      analysis.driver_activity[driver].last_transmission = radio.date;
    });

    return analysis;
  }

  // Helper methods for analysis
  classifyStrategy(compounds, stints) {
    if (stints === 1) return 'No-Stop';
    if (stints === 2) return 'One-Stop';
    if (stints === 3) return 'Two-Stop';
    return `${stints - 1}-Stop`;
  }

  assessStrategyRisk(compounds, pitWindows) {
    // Simplified risk assessment
    if (compounds.includes('SOFT') && pitWindows.length > 2) return 'high';
    if (compounds.includes('HARD') && pitWindows.length === 1) return 'low';
    return 'medium';
  }

  getMostCommonStrategy(strategies) {
    const strategyTypes = strategies.map(s => s.strategy_type);
    return strategyTypes.sort((a,b) => 
      strategyTypes.filter(v => v === a).length - strategyTypes.filter(v => v === b).length
    ).pop();
  }

  analyzePitWindows(strategies) {
    const allPitWindows = strategies.flatMap(s => s.pit_windows);
    return {
      average_first_pit: allPitWindows.length > 0 ? 
        Math.round(allPitWindows.reduce((a, b) => a + b, 0) / allPitWindows.length) : null,
      pit_window_spread: allPitWindows.length > 0 ? 
        Math.max(...allPitWindows) - Math.min(...allPitWindows) : null
    };
  }

  analyzeSectorStrengths(laps, bestSectors) {
    // Analyze which sectors driver is strongest in
    const avgSectors = {
      sector_1: laps.reduce((sum, lap) => sum + (lap.duration_sector_1 || 0), 0) / laps.length,
      sector_2: laps.reduce((sum, lap) => sum + (lap.duration_sector_2 || 0), 0) / laps.length,
      sector_3: laps.reduce((sum, lap) => sum + (lap.duration_sector_3 || 0), 0) / laps.length
    };

    const gaps = {
      sector_1: avgSectors.sector_1 - bestSectors.sector_1,
      sector_2: avgSectors.sector_2 - bestSectors.sector_2,
      sector_3: avgSectors.sector_3 - bestSectors.sector_3
    };

    const bestSector = Object.keys(gaps).reduce((a, b) => gaps[a] < gaps[b] ? a : b);
    return { strongest_sector: bestSector, sector_gaps: gaps };
  }

  calculateConsistency(laps) {
    const lapTimes = laps.map(l => l.lap_duration).filter(Boolean);
    if (lapTimes.length < 3) return null;
    
    const avg = lapTimes.reduce((a, b) => a + b) / lapTimes.length;
    const variance = lapTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / lapTimes.length;
    return Math.sqrt(variance);
  }

  analyzeTrackEvolution(laps) {
    // Simplified track evolution analysis
    const firstQuarter = laps.slice(0, Math.floor(laps.length / 4));
    const lastQuarter = laps.slice(-Math.floor(laps.length / 4));
    
    const firstAvg = firstQuarter.reduce((sum, lap) => sum + (lap.lap_duration || 0), 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((sum, lap) => sum + (lap.lap_duration || 0), 0) / lastQuarter.length;
    
    return {
      track_improvement: firstAvg - lastAvg,
      evolution_rate: (firstAvg - lastAvg) / firstAvg * 100
    };
  }

  getFastestSectorsOverall(sectorAnalysis) {
    return {
      fastest_s1: sectorAnalysis.reduce((prev, curr) => 
        prev.best_sectors.sector_1 < curr.best_sectors.sector_1 ? prev : curr),
      fastest_s2: sectorAnalysis.reduce((prev, curr) => 
        prev.best_sectors.sector_2 < curr.best_sectors.sector_2 ? prev : curr),
      fastest_s3: sectorAnalysis.reduce((prev, curr) => 
        prev.best_sectors.sector_3 < curr.best_sectors.sector_3 ? prev : curr)
    };
  }

  assessChampionshipImpact(newPosition, oldPoints, newPoints) {
    const improvement = newPoints - oldPoints;
    if (improvement >= 18) return 'Major positive impact';
    if (improvement >= 10) return 'Significant gain';
    if (improvement >= 1) return 'Minor improvement';
    return 'No championship impact';
  }

  calculateChampionshipOdds(driver, standings) {
    const leader = standings.standings[0];
    const pointsGap = leader.points - driver.points;
    const racesLeft = 24 - standings.races_completed;
    const maxPointsAvailable = racesLeft * 25;
    
    if (pointsGap > maxPointsAvailable) return 'Mathematically eliminated';
    if (pointsGap <= maxPointsAvailable * 0.1) return 'Very high';
    if (pointsGap <= maxPointsAvailable * 0.3) return 'Good';
    if (pointsGap <= maxPointsAvailable * 0.6) return 'Possible';
    return 'Unlikely';
  }

  analyzeWeatherTrends(weatherData) {
    if (weatherData.length < 2) return { trend: 'insufficient_data' };
    
    const recent = weatherData.slice(-5);
    const tempTrend = recent[recent.length - 1].air_temperature - recent[0].air_temperature;
    const humidityTrend = recent[recent.length - 1].humidity - recent[0].humidity;
    
    return {
      temperature_trend: tempTrend > 1 ? 'rising' : tempTrend < -1 ? 'falling' : 'stable',
      humidity_trend: humidityTrend > 5 ? 'increasing' : humidityTrend < -5 ? 'decreasing' : 'stable',
      rainfall_detected: recent.some(w => w.rainfall > 0)
    };
  }

  analyzeWeatherTireImpact(weather, stints) {
    const hasRain = weather.some(w => w.rainfall > 0);
    const avgTemp = weather.reduce((sum, w) => sum + w.air_temperature, 0) / weather.length;
    
    return {
      rain_impact: hasRain ? 'Wet tires required' : 'Dry conditions',
      temperature_impact: avgTemp > 30 ? 'High degradation expected' : 
                         avgTemp < 15 ? 'Tire warming issues' : 'Optimal conditions',
      strategic_changes: hasRain ? 'Pit windows will shift dramatically' : 'Normal strategy applies'
    };
  }

  assessWeatherPitImpact(weather) {
    const rainExpected = weather.some(w => w.rainfall > 0.1);
    return rainExpected ? 'Pit windows become unpredictable' : 'Normal pit windows apply';
  }

  assessWeatherRisk(trends) {
    if (trends.rainfall_detected) return 'High - Rain detected';
    if (trends.temperature_trend === 'falling') return 'Medium - Cooling conditions';
    return 'Low - Stable conditions';
  }

  getWeatherRecommendations(trends, sessionType) {
    const recommendations = [];
    
    if (trends.rainfall_detected) {
      recommendations.push('Monitor intermediate/wet tire strategies');
      recommendations.push('Expect multiple pit stops');
    }
    
    if (trends.temperature_trend === 'rising') {
      recommendations.push('Higher tire degradation expected');
      recommendations.push('Consider harder compounds');
    }
    
    if (sessionType === 'Qualifying') {
      recommendations.push('Track evolution critical for Q3 timing');
    }
    
    return recommendations.length > 0 ? recommendations : ['Monitor conditions for changes'];
  }

  compareWeatherToHistorical(weather, location) {
    // Simplified historical comparison
    const avgTemp = weather.reduce((sum, w) => sum + w.air_temperature, 0) / weather.length;
    return {
      temperature_vs_typical: avgTemp > 25 ? 'Above average' : avgTemp < 15 ? 'Below average' : 'Typical',
      conditions: 'Limited historical data available'
    };
  }

  async getCurrentCarPerformance(specificTeam = null) {
    try {
      // Get recent race data from current season
      const recentSessions = await axios.get(`${OPENF1_API}/sessions`, {
        params: { year: 2025, session_name: 'Race' }
      });

      const recentRaces = recentSessions.data.slice(-5); // Last 5 races
      const teamPerformance = {};

      for (const race of recentRaces) {
        try {
          const [drivers, positions, laps] = await Promise.all([
            axios.get(`${OPENF1_API}/drivers`, { params: { session_key: race.session_key } }),
            axios.get(`${OPENF1_API}/position`, { params: { session_key: race.session_key } }),
            axios.get(`${OPENF1_API}/laps`, { params: { session_key: race.session_key } })
          ]);

          // Analyze team performance
          drivers.data.forEach(driver => {
            const team = driver.team_name;
            if (specificTeam && team !== specificTeam) return;

            if (!teamPerformance[team]) {
              teamPerformance[team] = {
                team_name: team,
                team_colour: driver.team_colour,
                drivers: {},
                races_analyzed: 0,
                avg_race_pace: 0,
                avg_qualifying_pace: 0,
                reliability_score: 0,
                development_trend: 'stable'
              };
            }

            // Track individual driver performance within team
            if (!teamPerformance[team].drivers[driver.driver_number]) {
              teamPerformance[team].drivers[driver.driver_number] = {
                name: driver.name_acronym,
                positions: [],
                avg_lap_times: [],
                dnf_count: 0
              };
            }

            // Get final position for this driver
            const finalPos = positions.data
              .filter(p => p.driver_number === driver.driver_number)
              .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            if (finalPos) {
              teamPerformance[team].drivers[driver.driver_number].positions.push(finalPos.position);
            }

            // Calculate average lap time from valid laps
            const driverLaps = laps.data.filter(l => 
              l.driver_number === driver.driver_number && l.lap_duration && l.lap_duration < 200
            );
            
            if (driverLaps.length > 0) {
              const avgLapTime = driverLaps.reduce((sum, lap) => sum + lap.lap_duration, 0) / driverLaps.length;
              teamPerformance[team].drivers[driver.driver_number].avg_lap_times.push(avgLapTime);
            }
          });

          // Increment races analyzed for each team
          Object.keys(teamPerformance).forEach(team => {
            teamPerformance[team].races_analyzed++;
          });

        } catch (error) {
          continue; // Skip races with incomplete data
        }
      }

      // Calculate final team metrics
      Object.values(teamPerformance).forEach(team => {
        const allPositions = Object.values(team.drivers).flatMap(d => d.positions);
        const allLapTimes = Object.values(team.drivers).flatMap(d => d.avg_lap_times);
        
        team.avg_championship_position = allPositions.length > 0 ? 
          allPositions.reduce((sum, pos) => sum + pos, 0) / allPositions.length : null;
        
        team.avg_race_pace = allLapTimes.length > 0 ?
          allLapTimes.reduce((sum, time) => sum + time, 0) / allLapTimes.length : null;

        // Simple reliability calculation (positions finished vs DNFs)
        const totalRaces = team.races_analyzed * 2; // 2 drivers per team
        const finishedRaces = allPositions.length;
        team.reliability_score = totalRaces > 0 ? (finishedRaces / totalRaces) * 100 : 0;

        // Development trend (comparing first 2 vs last 2 races)
        if (allPositions.length >= 4) {
          const early = allPositions.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
          const recent = allPositions.slice(-2).reduce((a, b) => a + b, 0) / 2;
          
          if (early - recent > 1.5) team.development_trend = 'improving';
          else if (recent - early > 1.5) team.development_trend = 'declining';
          else team.development_trend = 'stable';
        }
      });

      return {
        analysis_period: 'Last 5 races',
        races_analyzed: recentRaces.length,
        team_performance: Object.values(teamPerformance),
        performance_rankings: {
          by_avg_position: Object.values(teamPerformance)
            .filter(t => t.avg_championship_position)
            .sort((a, b) => a.avg_championship_position - b.avg_championship_position),
          by_reliability: Object.values(teamPerformance)
            .sort((a, b) => b.reliability_score - a.reliability_score),
          by_development: Object.values(teamPerformance)
            .filter(t => t.development_trend === 'improving')
        },
        key_insights: this.generateCarPerformanceInsights(teamPerformance),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Car performance analysis failed: ${error.message}`);
    }
  }

  async getTireCompoundAnalysis(sessionKey = null, trackName = null) {
    try {
      let sessionsToAnalyze = [];

      if (sessionKey) {
        // Analyze specific session
        sessionsToAnalyze = [{ session_key: sessionKey }];
      } else if (trackName) {
        // Find recent sessions at this track
        const sessions = await axios.get(`${OPENF1_API}/sessions`, {
          params: { year: 2025, location: trackName }
        });
        sessionsToAnalyze = sessions.data.slice(-3); // Last 3 sessions at track
      } else {
        // Analyze most recent session
        const sessions = await axios.get(`${OPENF1_API}/sessions`, {
          params: { year: 2025 }
        });
        sessionsToAnalyze = sessions.data.slice(-1);
      }

      const compoundAnalysis = {
        SOFT: { usage_count: 0, avg_stint_length: 0, avg_degradation: 0, fastest_laps: [] },
        MEDIUM: { usage_count: 0, avg_stint_length: 0, avg_degradation: 0, fastest_laps: [] },
        HARD: { usage_count: 0, avg_stint_length: 0, avg_degradation: 0, fastest_laps: [] },
        INTERMEDIATE: { usage_count: 0, avg_stint_length: 0, avg_degradation: 0, fastest_laps: [] },
        WET: { usage_count: 0, avg_stint_length: 0, avg_degradation: 0, fastest_laps: [] }
      };

      for (const session of sessionsToAnalyze) {
        try {
          const [stints, laps] = await Promise.all([
            axios.get(`${OPENF1_API}/stints`, { params: { session_key: session.session_key } }),
            axios.get(`${OPENF1_API}/laps`, { params: { session_key: session.session_key } })
          ]);

          // Analyze stint data by compound
          stints.data.forEach(stint => {
            const compound = stint.compound;
            if (!compound || !compoundAnalysis[compound]) return;

            compoundAnalysis[compound].usage_count++;
            
            // Calculate stint length
            const stintLength = stint.lap_end - stint.lap_start + 1;
            compoundAnalysis[compound].avg_stint_length += stintLength;

            // Find laps for this stint to analyze degradation
            const stintLaps = laps.data.filter(lap => 
              lap.driver_number === stint.driver_number &&
              lap.lap_number >= stint.lap_start &&
              lap.lap_number <= stint.lap_end &&
              lap.lap_duration
            );

            if (stintLaps.length >= 3) {
              // Calculate degradation (first 3 laps vs last 3 laps of stint)
              const earlyLaps = stintLaps.slice(0, 3);
              const lateLaps = stintLaps.slice(-3);
              
              const earlyAvg = earlyLaps.reduce((sum, lap) => sum + lap.lap_duration, 0) / earlyLaps.length;
              const lateAvg = lateLaps.reduce((sum, lap) => sum + lap.lap_duration, 0) / lateLaps.length;
              
              const degradation = lateAvg - earlyAvg;
              compoundAnalysis[compound].avg_degradation += degradation;

              // Track fastest lap on this compound
              const fastestLap = Math.min(...stintLaps.map(l => l.lap_duration));
              compoundAnalysis[compound].fastest_laps.push(fastestLap);
            }
          });

        } catch (error) {
          continue;
        }
      }

      // Calculate averages
      Object.keys(compoundAnalysis).forEach(compound => {
        const data = compoundAnalysis[compound];
        if (data.usage_count > 0) {
          data.avg_stint_length = data.avg_stint_length / data.usage_count;
          data.avg_degradation = data.avg_degradation / data.usage_count;
          data.fastest_lap = data.fastest_laps.length > 0 ? Math.min(...data.fastest_laps) : null;
          data.typical_lap_time = data.fastest_laps.length > 0 ? 
            data.fastest_laps.reduce((a, b) => a + b, 0) / data.fastest_laps.length : null;
        }
        delete data.fastest_laps; // Clean up temporary array
      });

      return {
        analysis_sessions: sessionsToAnalyze.length,
        track_analyzed: trackName || 'Multiple tracks',
        compound_performance: compoundAnalysis,
        compound_recommendations: this.generateTireRecommendations(compoundAnalysis),
        degradation_ranking: Object.entries(compoundAnalysis)
          .filter(([_, data]) => data.usage_count > 0)
          .sort(([_, a], [__, b]) => a.avg_degradation - b.avg_degradation)
          .map(([compound, _]) => compound),
        optimal_strategy: this.calculateOptimalTireStrategy(compoundAnalysis),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Tire compound analysis failed: ${error.message}`);
    }
  }

  async getDriverFormAnalysis(specificDriver = null, racesBack = 5) {
    try {
      // Get recent races
      const recentSessions = await axios.get(`${OPENF1_API}/sessions`, {
        params: { year: 2025, session_name: 'Race' }
      });

      const recentRaces = recentSessions.data.slice(-racesBack);
      const driverForm = {};

      for (const race of recentRaces) {
        try {
          const [drivers, positions, laps] = await Promise.all([
            axios.get(`${OPENF1_API}/drivers`, { params: { session_key: race.session_key } }),
            axios.get(`${OPENF1_API}/position`, { params: { session_key: race.session_key } }),
            axios.get(`${OPENF1_API}/laps`, { params: { session_key: race.session_key } })
          ]);

          drivers.data.forEach(driver => {
            if (specificDriver && driver.driver_number !== specificDriver) return;

            if (!driverForm[driver.driver_number]) {
              driverForm[driver.driver_number] = {
                driver_number: driver.driver_number,
                name: driver.name_acronym,
                full_name: driver.full_name,
                team_name: driver.team_name,
                recent_positions: [],
                recent_pace: [],
                recent_consistency: [],
                dnfs: 0,
                points_scored: [],
                teammate_comparison: []
              };
            }

            // Get final position
            const finalPos = positions.data
              .filter(p => p.driver_number === driver.driver_number)
              .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            if (finalPos) {
              driverForm[driver.driver_number].recent_positions.push({
                race: race.location,
                position: finalPos.position,
                date: race.date_start
              });

              // Calculate points for this position
              const pointsSystem = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
              const points = pointsSystem[finalPos.position] || 0;
              driverForm[driver.driver_number].points_scored.push(points);
            } else {
              driverForm[driver.driver_number].dnfs++;
            }

            // Analyze pace and consistency
            const driverLaps = laps.data.filter(l => 
              l.driver_number === driver.driver_number && 
              l.lap_duration && 
              l.lap_duration < 200 // Filter out outliers
            );

            if (driverLaps.length > 5) {
              const lapTimes = driverLaps.map(l => l.lap_duration);
              const avgLapTime = lapTimes.reduce((a, b) => a + b) / lapTimes.length;
              const bestLap = Math.min(...lapTimes);
              
              // Calculate consistency (standard deviation)
              const variance = lapTimes.reduce((sum, time) => sum + Math.pow(time - avgLapTime, 2), 0) / lapTimes.length;
              const consistency = Math.sqrt(variance);

              driverForm[driver.driver_number].recent_pace.push({
                race: race.location,
                avg_lap_time: avgLapTime,
                best_lap: bestLap,
                gap_to_best: avgLapTime - bestLap
              });

              driverForm[driver.driver_number].recent_consistency.push({
                race: race.location,
                consistency_score: consistency
              });
            }
          });

        } catch (error) {
          continue;
        }
      }

      // Calculate form trends for each driver
      Object.values(driverForm).forEach(driver => {
        // Position trend
        if (driver.recent_positions.length >= 3) {
          const early = driver.recent_positions.slice(0, Math.floor(driver.recent_positions.length / 2));
          const recent = driver.recent_positions.slice(-Math.floor(driver.recent_positions.length / 2));
          
          const earlyAvg = early.reduce((sum, p) => sum + p.position, 0) / early.length;
          const recentAvg = recent.reduce((sum, p) => sum + p.position, 0) / recent.length;
          
          if (earlyAvg - recentAvg > 1) driver.form_trend = 'improving';
          else if (recentAvg - earlyAvg > 1) driver.form_trend = 'declining';
          else driver.form_trend = 'stable';
        }

        // Calculate averages
        driver.avg_position = driver.recent_positions.length > 0 ?
          driver.recent_positions.reduce((sum, p) => sum + p.position, 0) / driver.recent_positions.length : null;
        
        driver.avg_points_per_race = driver.points_scored.length > 0 ?
          driver.points_scored.reduce((a, b) => a + b, 0) / driver.points_scored.length : 0;

        driver.avg_consistency = driver.recent_consistency.length > 0 ?
          driver.recent_consistency.reduce((sum, c) => sum + c.consistency_score, 0) / driver.recent_consistency.length : null;

        // Performance rating (0-100)
        driver.performance_rating = this.calculateDriverPerformanceRating(driver);
      });

      return {
        analysis_period: `Last ${racesBack} races`,
        races_analyzed: recentRaces.length,
        driver_form: specificDriver ? 
          [driverForm[specificDriver]].filter(Boolean) : 
          Object.values(driverForm),
        form_rankings: {
          by_performance_rating: Object.values(driverForm)
            .sort((a, b) => (b.performance_rating || 0) - (a.performance_rating || 0)),
          by_recent_form: Object.values(driverForm)
            .filter(d => d.form_trend === 'improving'),
          by_consistency: Object.values(driverForm)
            .filter(d => d.avg_consistency)
            .sort((a, b) => a.avg_consistency - b.avg_consistency)
        },
        insights: this.generateDriverFormInsights(driverForm),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Driver form analysis failed: ${error.message}`);
    }
  }

  // Helper methods for enhanced analysis
  generateCarPerformanceInsights(teamPerformance) {
    const insights = [];
    
    Object.values(teamPerformance).forEach(team => {
      if (team.development_trend === 'improving') {
        insights.push(`${team.team_name} showing strong development trajectory`);
      }
      if (team.reliability_score < 70) {
        insights.push(`${team.team_name} struggling with reliability (${team.reliability_score.toFixed(1)}%)`);
      }
      if (team.avg_championship_position && team.avg_championship_position < 3) {
        insights.push(`${team.team_name} consistently in podium contention`);
      }
    });

    return insights;
  }

  generateTireRecommendations(compoundData) {
    const recommendations = [];
    
    Object.entries(compoundData).forEach(([compound, data]) => {
      if (data.usage_count === 0) return;
      
      if (data.avg_degradation < 0.5 && compound !== 'HARD') {
        recommendations.push(`${compound} showing low degradation - good for longer stints`);
      }
      if (data.avg_stint_length > 25 && compound === 'SOFT') {
        recommendations.push(`SOFT compound surprisingly durable at this track`);
      }
      if (data.fastest_lap && compound === 'HARD') {
        recommendations.push(`HARD compound competitive on pace - optimal for one-stop`);
      }
    });

    return recommendations;
  }

  calculateOptimalTireStrategy(compoundData) {
    // Simple strategy calculation based on degradation and stint length
    const compounds = Object.entries(compoundData)
      .filter(([_, data]) => data.usage_count > 0)
      .sort(([_, a], [__, b]) => a.avg_degradation - b.avg_degradation);

    if (compounds.length === 0) return 'Insufficient data';

    const lowest_deg = compounds[0][0];
    const highest_pace = Object.entries(compoundData)
      .filter(([_, data]) => data.fastest_lap)
      .sort(([_, a], [__, b]) => a.fastest_lap - b.fastest_lap)[0]?.[0];

    return {
      conservative: `Start ${highest_pace || 'MEDIUM'}, switch to ${lowest_deg}`,
      aggressive: `Start ${highest_pace || 'SOFT'}, two-stop strategy`,
      balanced: `One-stop: ${highest_pace || 'MEDIUM'} to ${lowest_deg}`
    };
  }

  calculateDriverPerformanceRating(driver) {
    let rating = 50; // Base score

    // Position-based scoring
    if (driver.avg_position) {
      rating += Math.max(0, (11 - driver.avg_position) * 4); // 0-40 points
    }

    // Points-based scoring
    if (driver.avg_points_per_race) {
      rating += Math.min(25, driver.avg_points_per_race * 2); // 0-25 points
    }

    // Consistency bonus
    if (driver.avg_consistency && driver.avg_consistency < 2) {
      rating += 10; // Consistency bonus
    }

    // DNF penalty
    rating -= driver.dnfs * 5;

    // Form trend adjustment
    if (driver.form_trend === 'improving') rating += 10;
    else if (driver.form_trend === 'declining') rating -= 5;

    return Math.max(0, Math.min(100, Math.round(rating)));
  }

  generateDriverFormInsights(driverForm) {
    const insights = [];
    
    Object.values(driverForm).forEach(driver => {
      if (driver.form_trend === 'improving' && driver.avg_position < 6) {
        insights.push(`${driver.name} in excellent form - championship contender`);
      }
      if (driver.dnfs > 1) {
        insights.push(`${driver.name} suffering reliability issues (${driver.dnfs} DNFs)`);
      }
      if (driver.avg_consistency && driver.avg_consistency < 1.5) {
        insights.push(`${driver.name} showing exceptional consistency`);
      }
      if (driver.performance_rating > 85) {
        insights.push(`${driver.name} performing at elite level (${driver.performance_rating}/100)`);
      }
    });

    return insights;
  }

  async getFreeSessionInfo(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      // Basic F1 2025 schedule (free alternative)
      const f1Calendar = {
        '2025-07-25': {
          location: 'Spa-Francorchamps',
          country: 'Belgium',
          weekend_type: 'Sprint Weekend',
          sessions: [
            { name: 'Practice 1', time: '12:30-13:30 UTC', status: targetDate === today ? 'COMPLETED' : 'SCHEDULED' },
            { name: 'Sprint Qualifying', time: '16:30-17:14 UTC', status: targetDate === today ? 'LIVE_OR_COMPLETED' : 'SCHEDULED' },
            { name: 'Sprint', time: 'Tomorrow 12:00-13:00 UTC', status: 'SCHEDULED' },
            { name: 'Qualifying', time: 'Tomorrow 16:00-17:00 UTC', status: 'SCHEDULED' }
          ]
        },
        '2025-07-26': {
          location: 'Spa-Francorchamps',
          country: 'Belgium',
          weekend_type: 'Sprint Weekend',
          sessions: [
            { name: 'Sprint', time: '12:00-13:00 UTC', status: 'SCHEDULED' },
            { name: 'Qualifying', time: '16:00-17:00 UTC', status: 'SCHEDULED' }
          ]
        },
        '2025-07-27': {
          location: 'Spa-Francorchamps',
          country: 'Belgium',
          weekend_type: 'Sprint Weekend',
          sessions: [
            { name: 'Race', time: '15:00-17:00 UTC', status: 'SCHEDULED' }
          ]
        }
      };

      const sessionInfo = f1Calendar[targetDate];
      
      if (sessionInfo) {
        const now = new Date();
        const currentTime = now.toISOString().split('T')[1].substring(0, 5);
        
        return {
          date: targetDate,
          source: 'FREE_SCHEDULE_DATA',
          location: sessionInfo.location,
          country: sessionInfo.country,
          weekend_type: sessionInfo.weekend_type,
          sessions: sessionInfo.sessions.map(session => ({
            ...session,
            current_time_utc: currentTime,
            note: targetDate === today ? 'Live session status - check after sessions end for detailed results' : null
          })),
          message: targetDate === today ? 
            'LIVE WEEKEND - Detailed timing data available after sessions complete' : 
            'Historical weekend data'
        };
      } else {
        return {
          date: targetDate,
          source: 'FREE_SCHEDULE_DATA',
          message: 'No F1 sessions scheduled for this date',
          sessions: [],
          next_race: 'Check F1 official calendar for upcoming races'
        };
      }
      
    } catch (error) {
      return {
        error: `Failed to get free session info: ${error.message}`,
        date: date || new Date().toISOString().split('T')[0],
        source: 'FREE_SCHEDULE_DATA'
      };
    }
  }

  async getSessionsByDate(date = null, location = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const response = await this.makeRequest(`${OPENF1_API}/sessions`, {
        year: 2025,
        date_start: targetDate
      });

      let sessions = response.data;

      // Filter by location if provided
      if (location) {
        const locationLower = location.toLowerCase();
        sessions = sessions.filter(session => 
          session.location?.toLowerCase().includes(locationLower) ||
          session.country_name?.toLowerCase().includes(locationLower) ||
          session.circuit_short_name?.toLowerCase().includes(locationLower)
        );
      }

      // Add session status for each session
      const now = new Date();
      sessions = sessions.map(session => {
        const start = new Date(session.date_start);
        const end = new Date(session.date_end);
        
        let status = 'SCHEDULED';
        if (now >= start && now <= end) {
          status = 'LIVE';
        } else if (now > end) {
          status = 'COMPLETED';
        }
        
        return {
          ...session,
          status,
          formatted_time: {
            start: start.toLocaleString(),
            end: end.toLocaleString(),
            duration_minutes: Math.round((end - start) / (1000 * 60))
          }
        };
      });

      return {
        date: targetDate,
        location_filter: location || 'all',
        sessions_found: sessions.length,
        sessions: sessions.sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
      };

    } catch (error) {
      return {
        error: `Failed to get sessions: ${error.message}`,
        date: date || new Date().toISOString().split('T')[0],
        location_filter: location || 'all',
        sessions_found: 0,
        sessions: []
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('180R MCP Server started');
    console.error('Named after the famous 180-degree F1 corners');
  }
}

// Run the server
const server = new F1MCPServer();
server.run().catch(console.error);