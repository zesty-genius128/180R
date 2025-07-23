# 🏁 F1 AI Pitwall - Real-Time Strategy Analysis

A comprehensive Formula 1 race strategy analysis tool powered by machine learning and real F1 telemetry data. Think of it as your personal F1 pitwall - the same kind of intelligent analysis that teams like Mercedes, Red Bull, and Ferrari use to make million-dollar strategy decisions during races.

![F1 AI Pitwall](https://img.shields.io/badge/F1-AI%20Pitwall-red?style=for-the-badge&logo=formula1)
![Machine Learning](https://img.shields.io/badge/ML-Trained%20Model-blue?style=for-the-badge)
![Real Data](https://img.shields.io/badge/Data-FastF1%20API-green?style=for-the-badge)

## 🎯 What This Does

**Turn this question:** *"It's lap 25 at Silverstone, Hamilton is on medium tires, track temp is 42°C - should he pit now for hards or wait until lap 30 for softs?"*

**Into this answer:** *"Pit now for hards - saves 2.1 seconds compared to waiting. Total time loss: 26.8s vs 28.9s. Hamilton's excellent tire management (0.95 skill) makes this the optimal choice."*

## 🧠 AI Features

### Machine Learning Models
- **Gradient Boosting Regressor** trained on 2023-2024 F1 historical data
- **Real tire degradation curves** for Soft/Medium/Hard compounds
- **Driver-specific modeling** (Hamilton 0.95, Verstappen 0.92 tire skills)
- **Track condition analysis** (Monaco easy on tires, Silverstone harsh)

### What It Analyzes
- 🛞 **Tire Degradation**: Real-time performance drop predictions
- ⏱️ **Pit Strategy**: Compare multiple strategy scenarios
- 🌡️ **Weather Impact**: Track temperature effects on tire wear
- 🏎️ **Driver Skills**: Each driver's tire management ability
- 📊 **Race Situations**: Fuel load, track position, lap timing

## 🚀 Quick Start

### 1. Launch the System
```bash
git clone https://github.com/your-repo/180R
cd 180R
docker-compose up -d
```

### 2. Access the Interface
- **Main App**: http://localhost:3000
- **AI Strategy Tool**: http://localhost:3000/tire-strategy

### 3. Try Your First Analysis

**Example Scenario**: British Grand Prix, Lap 25
1. Go to "🧠 AI Strategy" in the navigation
2. Select:
   - **Driver**: Hamilton
   - **Track**: Silverstone (Britain)
   - **Current Lap**: 25
   - **Track Temperature**: 42°C
3. Set up strategies to compare:
   - **Strategy A**: "Pit Now - Hard" (pit lap 25, hard tires)
   - **Strategy B**: "Wait - Medium" (pit lap 30, medium tires)
4. Click **"🧠 Analyze Strategies"**
5. See which strategy the AI recommends and why!

## 📊 Understanding the Results

### Best Strategy Recommendation
The AI highlights the optimal choice with:
- **Total Time Loss**: Pit stop time + tire degradation
- **Stint Analysis**: Performance breakdown per tire stint
- **Confidence Level**: Based on historical data patterns

### Key Metrics Explained

**Time Loss Components:**
- **Pit Stop**: ~24 seconds (standard F1 pit stop)
- **Tire Degradation**: How much slower tires get over time
- **Total**: Combined time cost of the strategy

**Tire Degradation Rates:**
- **Soft**: 0.08s/lap (fast but wear quickly)
- **Medium**: 0.04s/lap (balanced performance)
- **Hard**: 0.02s/lap (slow but durable)

**Driver Skill Impact:**
- **Hamilton (0.95)**: Excellent tire management
- **Verstappen (0.92)**: Very good tire management
- **Average (0.80)**: Typical F1 driver skill level

## 🎮 Features Overview

### 🧠 AI Strategy Analyzer (Main Feature)
Interactive tire strategy comparison tool:
- **Real-time analysis** of pit stop scenarios
- **Multiple strategy comparison** (1-stop, 2-stop, different compounds)
- **Weather-adjusted predictions** (track temperature impact)
- **Driver-specific calculations** (skill-based degradation)

### 🏠 Dashboard
Live F1 session monitoring:
- **Real session data** from FastF1 API
- **Driver performance metrics** (lap times, consistency)
- **Weather conditions** and track status
- **Live timing** during race weekends

### ⚔️ Driver Comparison
Head-to-head driver analysis:
- **Lap time comparison** between any two drivers
- **Consistency metrics** (standard deviation)
- **Performance trends** throughout sessions

### 📅 Schedule
Complete F1 calendar:
- **All 2025 races** with session times
- **Time zone conversion** for your location
- **Next session countdown**

## 🔧 How to Use for Beginners

### First Time Users
1. **Click the "Help" button** in the top navigation for an interactive tutorial
2. **Start with AI Strategy Analyzer** - the main feature that makes this special
3. **Use the example scenario** provided in the welcome guide
4. **Experiment with different settings** to see how they affect recommendations

### Understanding F1 Strategy
- **Pit Stops**: Necessary to change tires, costs ~24 seconds
- **Tire Compounds**: Soft (fast, wear quickly) vs Hard (slow, durable)
- **Degradation**: Tires get slower over time, varies by driver skill
- **Track Conditions**: Temperature and track surface affect tire wear

### Reading the Results
- **Green Strategy**: AI's recommended choice (lowest time loss)
- **Time Loss**: Total seconds lost compared to perfect scenario
- **Degradation**: How much slower tires get per stint
- **Recommendation**: "Good" means viable, "Consider alternatives" means risky

## 🏎️ Real F1 Examples

### Scenario 1: British GP Strategy Battle
*Hamilton vs Verstappen, both on 20-lap mediums, track temp 40°C*
- **Hamilton** (0.95 skill): Can extend to lap 35, degradation only 1.2s
- **Verstappen** (0.92 skill): Should pit lap 32, degradation 1.6s
- **AI Recommendation**: Hamilton stays out longer due to superior tire management

### Scenario 2: Monaco Tire Gamble
*Leclerc on 40-lap hards vs pitting for fresh mediums*
- **Monaco severity**: 0.3 (very easy on tires)
- **AI Analysis**: Stay on hards - only 0.8s degradation vs 24s pit stop cost
- **Real F1 Logic**: Monaco's low tire wear makes pit stops very costly

## 📚 Learning Resources

### F1 Strategy Basics
- **Undercut**: Pit early to gain track position
- **Overcut**: Stay out longer to benefit from fuel burn
- **Safety Car**: Can provide "free" pit stops
- **DRS Zones**: Affect overtaking difficulty post-pit

### Track Categories
- **High Degradation**: Bahrain, Saudi Arabia, Turkey
- **Medium Degradation**: Silverstone, Spa, Austria  
- **Low Degradation**: Monaco, Hungary, Netherlands

### Advanced Concepts
- **Fuel Effect**: Lighter car is faster (~0.3s per 10kg)
- **Traffic Impact**: Being stuck behind slower cars
- **Weather Windows**: Rain probability affecting strategy

## 🛠️ Technical Details

### System Requirements
- Docker & Docker Compose
- 4GB RAM minimum
- Ports: 3000 (frontend), 3001 (API), 5001 (ML backend)

### Architecture
- **React Frontend**: User interface and visualizations
- **Node.js API Gateway**: Request routing and caching
- **Python ML Backend**: FastF1 integration and machine learning
- **Docker Containers**: Isolated, scalable services

### Machine Learning Pipeline
1. **Data Collection**: Historical F1 telemetry (2023-2024)
2. **Feature Engineering**: Driver skills, track conditions, compounds
3. **Model Training**: Gradient boosting with cross-validation
4. **Prediction**: Real-time strategy analysis

## 🏁 Why This Matters

This tool provides the same level of strategic insight that professional F1 teams use. During a race weekend, teams like Mercedes spend millions on strategy analysis using similar data and modeling techniques. This brings that capability to F1 fans and enthusiasts.

**Real F1 Usage**: Teams use tools exactly like this during races to make split-second strategy calls that can win or lose championships.

---

**Built for F1 fans, by F1 fans. Powered by real data, enhanced by AI.** 🏆

*Experience the thrill of making strategic decisions just like the professionals!*