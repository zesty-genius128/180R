# 180R

A Formula 1 MCP (Model Context Protocol) server providing live race data through the OpenF1 API. Named after the famous 180-degree corners found on many F1 circuits.

## Features

- **Live Session Data**: Get current/upcoming F1 sessions
- **Real-time Timing**: Live timing and position data during races
- **Race Schedule**: Complete F1 calendar with session times
- **Session Results**: Detailed results for any completed session
- **Driver Standings**: Championship standings (simplified calculation)

## Quick Start

```bash
npm install
npm start
```

The server will start on port 3000 and provide MCP tools for accessing live F1 data.

## MCP Tools

### `get_current_session`
Get information about the current or next F1 session.

**Example Response:**
```json
{
  "status": "LIVE",
  "session": {
    "session_name": "Race",
    "location": "Spa-Francorchamps",
    "country_name": "Belgium"
  },
  "message": "Race at Spa-Francorchamps is currently live"
}
```

### `get_live_timing`  
Get live timing data for the current session.

**Parameters:**
- `session_key` (optional): Specific session key

### `get_race_schedule`
Get the F1 race schedule for a season.

**Parameters:**
- `year` (optional): Season year (default: 2025)

### `get_driver_standings`
Get current driver championship standings.

**Parameters:**  
- `year` (optional): Championship year (default: 2025)

### `get_session_results`
Get results for a specific session.

**Parameters:**
- `session_key` (required): Session identifier

## Usage with Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "180r": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000"]
    }
  }
}
```

## API Endpoints

- `POST /list_tools` - Get available MCP tools
- `POST /call_tool` - Execute an MCP tool  
- `GET /health` - Health check

## Data Source

Uses the [OpenF1 API](https://openf1.org) for real-time Formula 1 data including:
- Live session information
- Real-time car positions
- Lap times and sector splits
- Session schedules and results

## Why "180R"?

Named after the iconic 180-degree corners found on many Formula 1 circuits, representing the sharp turns and data pivots this server provides for F1 information.

## License

MIT