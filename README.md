# 180R

> *"Because every F1 nerd deserves access to the same data that costs Mercedes millions."*

A comprehensive Formula 1 MCP (Model Context Protocol) server that delivers **complete F1 intelligence** with the precision of a Swiss chronometer and the speed of a DRS overtake. Named after those infamous 180-degree hairpin corners that separate the wheat from the chaff in F1 strategy.

## What This Actually Does

While other F1 apps give you pretty graphics and basic timings, 180R gives you the **complete arsenal of F1 data** that teams use to win championships. Think of it as your personal Adrian Newey, Ross Brawn, and James Vowles rolled into one, but without the politics.

### Complete Data Coverage

**🔴 Real-Time Race Intelligence (OpenF1 API)**
- Live session status and timing data
- Real-time car telemetry (speed, throttle, brake, DRS, gear, RPM)
- GPS coordinates and track positioning
- Gap analysis and interval timing
- Pit stop data and timing
- Race control messages and flags
- Team radio communications
- Weather conditions and strategic implications

**🏛️ Historical F1 Database (Ergast API)**
- Complete circuit database with track details
- Constructor/team information and history
- Driver databases across all F1 eras
- Race results from 1950 to present
- Qualifying results and grid positions
- Championship standings (drivers & constructors)

**⚡ Official F1 Live Data (F1 LiveTiming API)**
- Official timing streams during live sessions
- Archive data from past events
- Multi-format data types (21 different streams)
- Session heartbeat and status monitoring

**🧠 Strategic Analysis Engine**
- Tire strategy deep-dives that would make Pirelli engineers weep
- Sector performance analysis with theoretical best laps
- Championship scenarios and points mathematics
- Weather impact intelligence with strategic recommendations
- Driver form analysis and performance trends
- Car performance comparisons and development tracking

## Installation

For the impatient F1 fan who wants data **now**:

```bash
npm install
node mcp-server.js
```

## Complete MCP Tools Arsenal - 29 Endpoints

### 🔴 **OpenF1 Real-Time Data (12 endpoints)**

#### Core Session Intelligence
- **`get_current_session`** - Live session status and next session timing
- **`get_live_timing`** - Real-time position and lap data
- **`get_session_results`** - Complete session results with driver info
- **`get_race_schedule`** - F1 calendar with proper Grand Prix names

#### Real-Time Telemetry & Positioning  
- **`get_car_data`** - Live telemetry (speed, throttle, brake, DRS, gear, RPM)
- **`get_location`** - GPS coordinates and 3D track positioning
- **`get_intervals`** - Gap timing and position analysis
- **`get_pit_data`** - Pit stop timing and strategy data

#### Race Intelligence
- **`get_race_control`** - Race director messages, flags, and safety info
- **`get_team_radio`** - Driver-team radio communications
- **`get_session_result_beta`** - Official session results (beta)
- **`get_starting_grid_beta`** - Grid positions (beta)

### 🏛️ **Ergast Historical Database (6 endpoints)**

- **`get_ergast_circuits`** - Complete circuit database from F1 history
- **`get_ergast_constructors`** - Team/constructor information across eras
- **`get_ergast_drivers`** - Driver database from 1950 to present
- **`get_ergast_results`** - Race results with full historical data
- **`get_ergast_qualifying`** - Qualifying results and grid analysis
- **`get_ergast_standings`** - Championship standings (drivers & constructors)

### ⚡ **F1 LiveTiming Official Data (3 endpoints)**

- **`get_livetiming_data`** - 21 official data streams (timing, positions, etc.)
- **`get_livetiming_session_info`** - Official session information
- **`get_livetiming_heartbeat`** - Live session status monitoring

### 🧠 **Strategic Analysis Engine (8 endpoints)**

- **`get_driver_standings`** - Championship standings with points mathematics
- **`get_tire_strategy_analysis`** - Pit strategy analysis and compound usage
- **`get_sector_performance`** - Sector times and theoretical best laps
- **`get_championship_implications`** - "What if" scenarios and points calculations
- **`get_weather_impact_analysis`** - Weather conditions and strategic implications
- **`get_current_car_performance`** - Team performance trends and development
- **`get_tire_compound_analysis`** - Tire performance and degradation analysis
- **`get_driver_form_analysis`** - Driver performance trends and consistency

## Example Data Quality

**Real-time telemetry data:**
```javascript
{
  "driver_number": 4,
  "speed": 312,
  "throttle": 100,
  "brake": false,
  "drs": 12,
  "gear": 8,
  "rpm": 11500
}
```

**Championship scenarios:**
```javascript
{
  "finishing_position": 1,
  "points_gained": 25,
  "new_championship_position": 2,
  "points_to_leader": 47,
  "championship_impact": "Major positive impact"
}
```

**Intelligent data limiting:**
- **Smart sampling** preserves race progression without oversized responses
- **Timeout handling** provides graceful fallbacks when APIs are slow
- **Status indicators** show data source health (`online`, `timeout`, `error`)
- **Fallback suggestions** guide you to working alternatives

## Claude Desktop Integration

Add this to your Claude Desktop config and suddenly you're the most informed person in any F1 discussion:

```json
{
  "mcpServers": {
    "180r": {
      "command": "node",
      "args": ["/path/to/your/180R/mcp-server.js"],
      "env": {}
    }
  }
}
```

## Data Sources

**🔴 [OpenF1 API](https://openf1.org)** - Real-time race data more accurate than FIA timing screens  
**🏛️ [Ergast API](https://ergast.com/mrd/)** - Complete F1 historical database (1950-present)  
**⚡ [F1 LiveTiming API](https://livetiming.formula1.com)** - Official F1 timing streams  

The triple-threat combination that gives you **complete F1 intelligence**.

## Why "180R"?

Named after the 180-degree corners found on legendary F1 circuits - those sharp hairpins where strategy matters more than raw speed. Think Monaco's Grand Hotel Hairpin, or Hungaroring's Turn 2. These corners don't care about your straight-line speed; they reward precision, patience, and perfect timing.

Just like this server: it's not about flashy graphics or marketing fluff. It's about delivering the exact data you need, exactly when you need it, with the precision of a perfect apex.

## For the F1 Nerds

This server provides **the complete F1 data ecosystem** that actual teams use internally. While everyone else is watching the race on TV, you'll have:

**Real-Time Race Intelligence:**
- Live telemetry showing exactly when drivers lift and coast
- GPS coordinates to see racing lines and track position battles  
- Team radio to hear the strategy calls before the broadcast picks them up
- Race control messages to know about flags and investigations instantly

**Strategic Analysis:**
- Tire degradation patterns to predict pit windows
- Sector analysis to identify where each driver's pace advantage comes from
- Championship mathematics for every possible scenario
- Weather data that actually affects strategy (not just dramatic commentary)

**Historical Context:**
- Complete F1 database from 1950 to track long-term patterns
- Constructor development trends across decades
- Driver performance comparisons across different eras

Because being an F1 fan isn't just about cheering for your driver. It's about understanding the sport at a level that makes you insufferable at parties, but absolutely essential during race weekend discussions.

**"It's lights out and away we go... but you already knew the optimal pit strategy 10 laps ago thanks to 180R."**

## Production-Ready Features

- **Smart data limiting** - Never crashes from oversized responses
- **Graceful fallbacks** - APIs down? You get helpful error messages, not crashes
- **Intelligent sampling** - Preserves race progression when data sets are massive
- **Multi-source reliability** - Three different APIs ensure you always have data
- **Real-time awareness** - Knows when sessions are live vs. archived

### Current Status: **PRODUCTION READY** ✅

All 29 endpoints tested and optimized for real-world usage during live F1 sessions.

## License

MIT - As open as DRS on the main straight.

---

*P.S. - If you're reading this and thinking "I don't need all this data," then this server isn't for you. Try the official F1 app. It has nice graphics.*