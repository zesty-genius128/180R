// frontend/src/components/ComparisonPage.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, Trophy } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const ComparisonPage = ({ currentEvent, currentSession }) => {
  const [driver1, setDriver1] = useState('VER');
  const [driver2, setDriver2] = useState('LEC');
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const drivers = [
    'VER', 'PER', 'LEC', 'SAI', 'HAM', 'RUS', 'NOR', 'PIA',
    'ALO', 'STR', 'ALB', 'SAR', 'TSU', 'LAW', 'HUL', 'MAG',
    'GAS', 'OCO', 'BOT', 'ZHO'
  ];

  const loadComparison = async () => {
    if (!currentEvent || !currentSession) {
      toast.error('Please select an event and session first');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiService.getDriverComparison(
        2025, currentEvent, currentSession, driver1, driver2
      );
      setComparisonData(data);
    } catch (error) {
      toast.error('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Driver Comparison</h1>
          <p className="dashboard-subtitle">Head-to-head performance analysis</p>
        </div>
      </div>

      {/* Driver Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Users className="w-6 h-6 text-blue-400" />
            Select Drivers
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Driver 1
            </label>
            <select 
              value={driver1} 
              onChange={(e) => setDriver1(e.target.value)}
              className="select-input"
            >
              {drivers.map(driver => (
                <option key={driver} value={driver}>{driver}</option>
              ))}
            </select>
          </div>
          
          <div style={{ fontSize: '2rem', color: 'var(--accent-blue)' }}>VS</div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Driver 2
            </label>
            <select 
              value={driver2} 
              onChange={(e) => setDriver2(e.target.value)}
              className="select-input"
            >
              {drivers.map(driver => (
                <option key={driver} value={driver}>{driver}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={loadComparison}
            className="btn btn-primary"
            disabled={isLoading}
          >
            <TrendingUp className="w-4 h-4" />
            Compare
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {isLoading ? (
        <LoadingSpinner message="Analyzing driver performance..." />
      ) : comparisonData ? (
        <div className="dashboard-grid">
          {/* Driver 1 Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{driver1}</h3>
            </div>
            {comparisonData.driver1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="metric-card">
                  <div className="metric-value">{comparisonData.driver1.fastest_lap.toFixed(3)}s</div>
                  <div className="metric-label">Fastest Lap</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">P{comparisonData.driver1.grid_position}</div>
                  <div className="metric-label">Grid Position</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{comparisonData.driver1.total_laps}</div>
                  <div className="metric-label">Total Laps</div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No data available</p>
            )}
          </div>

          {/* Driver 2 Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{driver2}</h3>
            </div>
            {comparisonData.driver2 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="metric-card">
                  <div className="metric-value">{comparisonData.driver2.fastest_lap.toFixed(3)}s</div>
                  <div className="metric-label">Fastest Lap</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">P{comparisonData.driver2.grid_position}</div>
                  <div className="metric-label">Grid Position</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{comparisonData.driver2.total_laps}</div>
                  <div className="metric-label">Total Laps</div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No data available</p>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Trophy className="w-16 h-16" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Select drivers and click Compare to analyze performance</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ComparisonPage;