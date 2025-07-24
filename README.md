# 180R

> *"Because every F1 nerd deserves access to the same data that costs Mercedes millions."*

A Formula 1 MCP (Model Context Protocol) server that delivers live race data with the precision of a Swiss chronometer and the speed of a DRS overtake. Named after those infamous 180-degree hairpin corners that separate the wheat from the chaff in F1 strategy.

## What This Actually Does

While other F1 apps give you pretty graphics and basic timings, 180R gives you the **actual strategic intelligence** that F1 teams use to win championships. Think of it as your personal James Vowles, but without the PowerPoint presentations.

### Core Features

**Live Session Intelligence**
- Real-time session status (because "when is qualifying?" is not a stupid question during sprint weekends)
- Dynamic driver rosters that update faster than Nyck de Vries got dropped
- Complete race schedules with proper Grand Prix names (not "Race 1", "Race 2" like some amateur hour app)

**Championship Mathematics**
- Live driver standings with actual F1 points (25-18-15-12-10-8-6-4-2-1, as it should be)
- Dynamic driver info that handles mid-season moves and reserve driver shenanigans
- Real championship scenarios ("What happens if Russell beats Hamilton again?")

**Strategic Analysis Tools**
- Tire strategy deep-dives that would make Pirelli engineers weep
- Sector performance analysis for when you need to prove why your favorite driver is actually fastest
- Weather impact intelligence (because F1 weather is more dramatic than a Netflix documentary)
- Pit window analysis with the precision of a McLaren strategy call (so, pretty good actually)

## Installation

For the impatient F1 fan who wants data **now**:

```bash
npm install
node mcp-server.js
```

## MCP Tools Available

### `get_current_session`
Tells you what's happening right now in F1 land. No more frantically checking the F1 app during your lunch break.

### `get_race_schedule`
The complete F1 calendar with proper race names. None of this "Saudi Arabian Grand Prix" nonsense when it's clearly the Jeddah Street Circuit.

**Parameters:**
- `year` (optional): Because sometimes you want to reminisce about 2021

### `get_driver_standings` 
Current championship standings with **actual points**, not just participation trophies.

**What you get:**
```javascript
{
  "driver_number": 4,
  "name_acronym": "NOR", 
  "full_name": "Lando NORRIS",
  "team_name": "McLaren F1 Team",
  "points": 295,
  "wins": 3,
  "podiums": 12
}
```

### `get_session_results`
Race results with all the detail your F1-obsessed brain craves.

**Parameters:**
- `session_key` (required): The OpenF1 session identifier (not the FIA's random numbering system)

### `get_tire_strategy_analysis`
For when you want to analyze tire strategies like you're Peter Bonnington calling Lewis in for slicks.

**Returns:**
- Real-time pit stop strategies
- Compound usage patterns (because knowing who's on hards matters)
- Risk assessment (aggressive vs. "we're managing the gap")
- Pit window timing analysis

### `get_sector_performance`
Sector-by-sector analysis for the true F1 nerd who knows that S2 at Silverstone is where championships are won.

**Parameters:**
- `session_key` (required)
- `driver_number` (optional): Focus on one driver's pain

**Returns:**
- Theoretical vs. actual best laps
- Sector strengths and weaknesses
- Track evolution (because the track gets faster, unlike some drivers)
- Consistency analysis

### `get_championship_implications`
The "what if" calculator every F1 fan needs during championship battles.

**Parameters:**
- `target_driver` (required): Driver number to analyze
- `position_scenarios` (optional): Array of finishing positions to simulate

**Example:** "What happens if Norris wins the next three races while Max finishes 4th?"

### `get_weather_impact_analysis`
Weather analysis with strategic implications, because F1 weather is more unpredictable than Ferrari strategy calls.

**Returns:**
- Rain probability and tire implications
- Temperature effects on degradation
- Strategic recommendations (better than most F1 strategists)

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

## Data Source

Powered by the [OpenF1 API](https://openf1.org), which provides more accurate data than the FIA's own timing screens (and that's saying something).

## Why "180R"?

Named after the 180-degree corners found on legendary F1 circuits - those sharp hairpins where strategy matters more than raw speed. Think Monaco's Grand Hotel Hairpin, or Hungaroring's Turn 2. These corners don't care about your straight-line speed; they reward precision, patience, and perfect timing.

Just like this server: it's not about flashy graphics or marketing fluff. It's about delivering the exact data you need, exactly when you need it, with the precision of a perfect apex.

## For the F1 Nerds

This server provides data that actual F1 teams use internally. While everyone else is watching the race on TV, you'll know:

- Why that pit stop was actually genius (or stupid)
- Which driver is really fastest in the middle sector
- Whether the weather will actually affect the race or if the commentators are just being dramatic
- What those championship points scenarios actually mean mathematically

Because being an F1 fan isn't just about cheering for your driver. It's about understanding the sport at a level that makes you insufferable at parties.

**"It's lights out and away we go... but you already knew that 3 laps ago thanks to 180R."**

## License

MIT - As open as DRS on the main straight.

---

*P.S. - If you're reading this and thinking "I don't need all this data," then this server isn't for you. Try the official F1 app. It has nice graphics.*