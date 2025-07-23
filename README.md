# 180R
# 🏁 F1 AI Predictor Dashboard

A modern, real-time Formula 1 race prediction dashboard powered by FastF1 data, machine learning, and React.

![F1 Dashboard](https://img.shields.io/badge/F1-Dashboard-red?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18-green?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11-yellow?style=for-the-badge)

## 🚀 Features

- **Real-time F1 Data**: Live session data from FastF1 API
- **AI Predictions**: Machine learning-powered race outcome predictions
- **Interactive Dashboard**: Modern React interface with live updates
- **WebSocket Support**: Real-time data streaming
- **Weather Integration**: Track conditions affecting race performance
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Export Functionality**: Download predictions as CSV
- **Auto-refresh**: Automatic updates during race weekends

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │◄──►│  Node.js API     │◄──►│  Python FastF1  │
│   (Frontend)    │    │   (Gateway)      │    │   (Data + ML)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
    Port 3000               Port 3001                Port 5000
```

## 📋 Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.8+ and pip
- **Git** (for cloning)

## 🚀 Quick Start

### Automated Setup (Recommended)

```bash
# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh

# Start all services
./start-all.sh
```

### Docker Setup (Production)

```bash
# Start with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Manual Setup

### 1. Python Backend

```bash
cd backend-python
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Node.js Backend

```bash
cd backend-node
npm install
npm run dev
```

### 3. React Frontend

```bash
cd frontend
npm install
npm start
```

## 🌐 Access Points

- **Dashboard**: http://localhost:3000
- **Node.js API**: http://localhost:3001
- **Python API**: http://localhost:5000

## 📖 How to Use

1. **Select Race Weekend**: Choose an F1 event from the dropdown
2. **Pick Session**: Select Practice, Qualifying, or Race
3. **View Predictions**: See AI-powered podium and grid predictions
4. **Live Updates**: Enable auto-refresh for real-time data
5. **Export Data**: Download predictions as CSV

## 🤖 AI Model Features

- **Clean Air Pace**: Average lap times in clear conditions
- **Qualifying Performance**: Grid position analysis
- **Team Performance**: Constructor standings and form
- **Weather Impact**: Track conditions effects
- **Machine Learning**: Random Forest prediction model

## 🔧 Configuration

### Environment Variables

**Python Backend (.env)**:
```bash
FLASK_ENV=development
FLASK_PORT=5000
CACHE_DIR=./cache
```

**Node.js Backend (.env)**:
```bash
NODE_ENV=development
PORT=3001
PYTHON_API_URL=http://localhost:5000
```

**React Frontend (.env)**:
```bash
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001
```

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check ports
lsof -i :5000
lsof -i :3001
lsof -i :3000
```

**FastF1 errors:**
```bash
# Clear cache
rm -rf backend-python/cache/
```

**No predictions:**
- ✅ Select both Event and Session
- ✅ Check internet connection
- ✅ Verify session has data available

## 📊 API Endpoints

### Python Backend
- `GET /api/schedule` - F1 calendar
- `GET /api/session-data` - Session predictions
- `GET /api/driver-comparison` - Driver analysis

### Node.js Backend
- `GET /api/health` - Health check
- `GET /api/current-weekend` - Current F1 weekend
- `WebSocket` - Real-time updates

## 🚀 Deployment

### Production with Docker

```bash
docker-compose up -d
```

### Manual Production

```bash
# Build React
cd frontend && npm run build

# Start production servers
cd backend-python && gunicorn app:app
cd backend-node && NODE_ENV=production npm start
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **FastF1**: For F1 data access
- **Formula 1**: For the amazing sport
- **React Community**: For excellent tooling

---

**Enjoy predicting F1 races with AI! 🏁🤖**