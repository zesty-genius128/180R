// frontend/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, CloudRain, Thermometer, Wind, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// Components
import PodiumPreview from './PodiumPreview';
import WeatherWidget from './WeatherWidget';
import PredictionsTable from './PredictionsTable';
import SessionInfo from './SessionInfo';
import LoadingSpinner from './LoadingSpinner';

// Services
import { apiService } from '../services/apiService';

const Dashboard = ({ currentEvent, currentSession, liveData, onDataUpdate }) => {
  const [predictions, setPredictions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Load data when event or session changes
  useEffect(() => {
    if (currentEvent && currentSession) {
      loadSessionData();
    }
  }, [currentEvent, currentSession]);

  // Update with live data
  useEffect(() => {
    if (liveData) {
      updateWithLiveData(liveData);
    }
  }, [liveData]);

  const loadSessionData = async () => {
    if (!currentEvent || !currentSession) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.getSessionData(2025, currentEvent, currentSession);
      updateWithLiveData(data);
      onDataUpdate(data);
      toast.success('Predictions updated successfully');
    } catch (error) {
      console.error('Error loading session data:', error);
      setError(error.message);
      toast.error('Failed to load predictions');
    } finally {
      setIsLoading(false);
    }
  };

  const updateWithLiveData = (data) => {
    if (data.predictions) {
      setPredictions(data.predictions);
    }
    if (data.weather) {
      setWeather(data.weather);
    }
    if (data.session_info) {
      setSessionInfo(data.session_info);
    }
    setLastUpdated(new Date());
  };

  const exportPredictions = () => {
    if (!predictions.length) {
      toast.error('No predictions to export');
      return;
    }

    try {
      const csvContent = [
        ['Position', 'Driver', 'Team', 'Predicted Time', 'Grid Position', 'Confidence'],
        ...predictions.map((driver, index) => [
          index + 1,
          driver.driver,
          getTeamName(driver.driver),
          driver.predicted_time.toFixed(3),
          driver.grid_position,
          driver.confidence.toFixed(1)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `f1_predictions_${currentEvent}_${currentSession}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Predictions exported successfully');
    } catch (error) {
      toast.error('Failed to export predictions');
    }
  };

  const getTeamName = (driverCode) => {
    const teamMapping = {
      'VER': 'Red Bull Racing', 'PER': 'Red Bull Racing',
      'LEC': 'Ferrari', 'SAI': 'Ferrari',
      'HAM': 'Mercedes', 'RUS': 'Mercedes',
      'NOR': 'McLaren', 'PIA': 'McLaren',
      'ALO': 'Aston Martin', 'STR': 'Aston Martin',
      'ALB': 'Williams', 'SAR': 'Williams',
      'TSU': 'AlphaTauri', 'LAW': 'AlphaTauri',
      'HUL': 'Haas', 'MAG': 'Haas',
      'GAS': 'Alpine', 'OCO': 'Alpine',
      'BOT': 'Kick Sauber', 'ZHO': 'Kick Sauber'
    };
    return teamMapping[driverCode] || 'Unknown Team';
  };

  if (!currentEvent) {
    return (
      <div className="dashboard-empty">
        <div className="empty-state">
          <Trophy className="w-16 h-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Welcome to F1 AI Predictor</h2>
          <p className="text-gray-400 mb-4">Select an event and session to get started</p>
          <div className="empty-features">
            <div className="feature-item">
              <CloudRain className="w-6 h-6 text-blue-400" />
              <span>Real-time weather data</span>
            </div>
            <div className="feature-item">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span>AI-powered predictions</span>
            </div>
            <div className="feature-item">
              <Thermometer className="w-6 h-6 text-red-400" />
              <span>Live session analysis</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-state">
          <h2 className="text-xl font-bold mb-2 text-red-400">Error Loading Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={loadSessionData}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Info */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            {currentEvent} - {currentSession === 'Q' ? 'Qualifying' : 
             currentSession === 'R' ? 'Race' : 
             currentSession === 'S' ? 'Sprint' : 
             `Practice ${currentSession.slice(-1)}`}
          </h1>
          {lastUpdated && (
            <p className="dashboard-subtitle">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {predictions.length > 0 && (
          <button 
            onClick={exportPredictions}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading predictions..." />
      ) : (
        <>
          {/* Podium Predictions */}
          {predictions.length >= 3 && (
            <motion.div 
              className="card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="card-header">
                <h2 className="card-title">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  Podium Predictions
                </h2>
                <div className="prediction-confidence">
                  AI Model Active
                </div>
              </div>
              <PodiumPreview predictions={predictions.slice(0, 3)} />
            </motion.div>
          )}

          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Weather Widget */}
            {weather && (
              <motion.div 
                className="card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="card-header">
                  <h2 className="card-title">
                    <CloudRain className="w-6 h-6 text-blue-400" />
                    Track Conditions
                  </h2>
                </div>
                <WeatherWidget weather={weather} />
              </motion.div>
            )}

            {/* Session Info */}
            {sessionInfo && (
              <motion.div 
                className="card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="card-header">
                  <h2 className="card-title">
                    <Thermometer className="w-6 h-6 text-green-400" />
                    Session Information
                  </h2>
                </div>
                <SessionInfo sessionInfo={sessionInfo} />
              </motion.div>
            )}
          </div>

          {/* Full Predictions Table */}
          {predictions.length > 0 && (
            <motion.div 
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="card-header">
                <h2 className="card-title">
                  📋 Complete Predictions
                </h2>
                <div className="prediction-stats">
                  {predictions.length} drivers analyzed
                </div>
              </div>
              <PredictionsTable predictions={predictions} />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Dashboard;