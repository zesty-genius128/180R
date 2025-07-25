# 180R

> *"Because every F1 nerd deserves access to the same data that costs Mercedes millions, right?"*

A comprehensive Formula 1 MCP (Model Context Protocol) server that delivers **complete F1 intelligence** with the precision of a Swiss chronometer and the speed of a DRS overtake. Named after those infamous 180-degree hairpin corners that separate the wheat from the chaff in F1 strategy.

## What This Actually Does

While other F1 apps give you pretty graphics and basic timings, 180R gives you the **complete arsenal of F1 data** that teams use to win championships. Think of it as your personal Adrian Newey, Ross Brawn, and James Vowles rolled into one, but without the politics.

### Complete Data Coverage

**FREE MODE OPERATION**
This server operates in **FREE MODE** using public API endpoints. During live F1 sessions, some APIs require paid authentication for real-time data, but 180R provides honest fallbacks and reliable historical/schedule data that always works.

**Real-Time Race Intelligence (OpenF1 API - FREE MODE)**
- Live session status and timing data *(limited during active sessions)*
- Real-time car telemetry (speed, throttle, brake, DRS, gear, RPM) *(limited during active sessions)*
- GPS coordinates and track positioning *(limited during active sessions)*
- Gap analysis and interval timing *(limited during active sessions)*
- Pit stop data and timing *(limited during active sessions)*
- Race control messages and flags *(limited during active sessions)*
- Team radio communications *(limited during active sessions)*
- Weather conditions and strategic implications *(limited during active sessions)*

**Historical F1 Database (Ergast API)**
- Complete circuit database with track details *(FREE MODE: always works)*
- Constructor/team information and history *(FREE MODE: always works)*
- Driver databases across all F1 eras *(FREE MODE: always works)*
- Race results from 1950 to present *(FREE MODE: always works)*
- Qualifying results and grid positions *(FREE MODE: always works)*
- Championship standings (drivers & constructors) *(FREE MODE: always works)*

**Official F1 Live Data (F1 LiveTiming API - FREE MODE)**
- Official timing streams during live sessions *(limited during active sessions)*
- Archive data from past events *(reliable access)*
- Multi-format data types (21 different streams) *(limited during active sessions)*
- Session heartbeat and status monitoring *(limited during active sessions)*

**Strategic Analysis Engine**
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

## Complete MCP Tools Arsenal - 30 Endpoints

**FREE MODE DISCLAIMER**: All tools marked with *(FREE MODE: limited during live sessions)* may have reduced functionality during active F1 sessions due to API authentication requirements. Historical data and F1 schedules always work reliably.

### **OpenF1 Real-Time Data (14 endpoints)**

#### Core Session Intelligence
- **`get_current_session`** - Live session status and next session timing *(FREE MODE: limited during live sessions)*
- **`get_live_timing`** - Real-time position and lap data *(FREE MODE: limited during live sessions)*
- **`get_session_results`** - Complete session results with driver info *(FREE MODE: limited during live sessions)*
- **`get_race_schedule`** - F1 calendar with proper Grand Prix names *(FREE MODE: always works)*
- **`get_sessions_by_date`** - Get F1 sessions for specific dates *(FREE MODE: always works)*
- **`get_free_session_info`** - Reliable F1 session info with schedule *(FREE MODE: always works)*

#### Real-Time Telemetry & Positioning  
- **`get_car_data`** - Live telemetry (speed, throttle, brake, DRS, gear, RPM) *(FREE MODE: limited during live sessions)*
- **`get_location`** - GPS coordinates and 3D track positioning *(FREE MODE: limited during live sessions)*
- **`get_intervals`** - Gap timing and position analysis *(FREE MODE: limited during live sessions)*
- **`get_pit_data`** - Pit stop timing and strategy data *(FREE MODE: limited during live sessions)*

#### Race Intelligence
- **`get_race_control`** - Race director messages, flags, and safety info *(FREE MODE: limited during live sessions)*
- **`get_team_radio`** - Driver-team radio communications *(FREE MODE: limited during live sessions)*
- **`get_session_result_beta`** - Official session results (beta) *(FREE MODE: limited during live sessions)*
- **`get_starting_grid_beta`** - Grid positions (beta) *(FREE MODE: limited during live sessions)*

### **Ergast Historical Database (6 endpoints)**

- **`get_ergast_circuits`** - Complete circuit database from F1 history *(FREE MODE: always works)*
- **`get_ergast_constructors`** - Team/constructor information across eras *(FREE MODE: always works)*
- **`get_ergast_drivers`** - Driver database from 1950 to present *(FREE MODE: always works)*
- **`get_ergast_results`** - Race results with full historical data *(FREE MODE: always works)*
- **`get_ergast_qualifying`** - Qualifying results and grid analysis *(FREE MODE: always works)*
- **`get_ergast_standings`** - Championship standings (drivers & constructors) *(FREE MODE: always works)*

### **F1 LiveTiming Official Data (3 endpoints)**

- **`get_livetiming_data`** - 21 official data streams (timing, positions, etc.) *(FREE MODE: limited during live sessions)*
- **`get_livetiming_session_info`** - Official session information *(FREE MODE: limited during live sessions)*
- **`get_livetiming_heartbeat`** - Live session status monitoring *(FREE MODE: limited during live sessions)*

### **Strategic Analysis Engine (7 endpoints)**

- **`get_driver_standings`** - Championship standings with points mathematics *(FREE MODE: always works)*
- **`get_tire_strategy_analysis`** - Pit strategy analysis and compound usage *(FREE MODE: limited during live sessions)*
- **`get_sector_performance`** - Sector times and theoretical best laps *(FREE MODE: limited during live sessions)*
- **`get_championship_implications`** - "What if" scenarios and points calculations *(FREE MODE: always works)*
- **`get_weather_impact_analysis`** - Weather conditions and strategic implications *(FREE MODE: limited during live sessions)*
- **`get_current_car_performance`** - Team performance trends and development *(FREE MODE: limited during live sessions)*
- **`get_tire_compound_analysis`** - Tire performance and degradation analysis *(FREE MODE: limited during live sessions)*

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

**[OpenF1 API](https://openf1.org)** - Real-time race data (FREE MODE: limited during live sessions)  
**[Ergast API](https://ergast.com/mrd/)** - Complete F1 historical database (FREE MODE: always works)  
**[F1 LiveTiming API](https://livetiming.formula1.com)** - Official F1 timing streams (FREE MODE: limited during live sessions)  

The triple-threat combination that gives you **complete F1 intelligence** in FREE MODE with honest limitations.

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

### Current Status: **PRODUCTION READY**

All 30 endpoints tested and optimized for real-world usage. **FREE MODE** ensures reliable operation with honest limitations during live F1 sessions.

## License

MIT - As open as DRS on the main straight.

---

*P.S. - If you're reading this and thinking "I don't need all this data," then this server isn't for you. Try the official F1 app. It has nice graphics.*