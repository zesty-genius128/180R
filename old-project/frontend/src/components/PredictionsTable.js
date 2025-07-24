// frontend/src/components/PredictionsTable.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Trophy, Target, Clock } from 'lucide-react';

const PredictionsTable = ({ predictions }) => {
  const [sortField, setSortField] = useState('predicted_position');
  const [sortDirection, setSortDirection] = useState('asc');

  if (!predictions || predictions.length === 0) {
    return (
      <div className="predictions-error">
        <p>No predictions available</p>
      </div>
    );
  }

  // Team mapping
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

  // Team colors for visual distinction
  const getTeamColor = (driverCode) => {
    const teamColors = {
      'VER': '#0600ef', 'PER': '#0600ef', // Red Bull
      'LEC': '#dc0000', 'SAI': '#dc0000', // Ferrari
      'HAM': '#00d2be', 'RUS': '#00d2be', // Mercedes
      'NOR': '#ff8700', 'PIA': '#ff8700', // McLaren
      'ALO': '#006f62', 'STR': '#006f62', // Aston Martin
      'ALB': '#005aff', 'SAR': '#005aff', // Williams
      'TSU': '#2b4562', 'LAW': '#2b4562', // AlphaTauri
      'HUL': '#ffffff', 'MAG': '#ffffff', // Haas
      'GAS': '#0090ff', 'OCO': '#0090ff', // Alpine
      'BOT': '#900000', 'ZHO': '#900000'  // Kick Sauber
    };
    return teamColors[driverCode] || '#38383f';
  };

  // Sort predictions
  const sortedPredictions = [...predictions].sort((a, b) => {
    let aValue, bValue;

    switch (sortField) {
      case 'predicted_position':
        aValue = predictions.indexOf(a) + 1;
        bValue = predictions.indexOf(b) + 1;
        break;
      case 'driver':
        aValue = a.driver;
        bValue = b.driver;
        break;
      case 'team':
        aValue = getTeamName(a.driver);
        bValue = getTeamName(b.driver);
        break;
      case 'predicted_time':
        aValue = a.predicted_time;
        bValue = b.predicted_time;
        break;
      case 'grid_position':
        aValue = a.grid_position;
        bValue = b.grid_position;
        break;
      case 'confidence':
        aValue = a.confidence;
        bValue = b.confidence;
        break;
      default:
        aValue = predictions.indexOf(a);
        bValue = predictions.indexOf(b);
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="sort-icon" /> : 
      <ChevronDown className="sort-icon" />;
  };

  // Get position badge class
  const getPositionBadgeClass = (position) => {
    if (position === 1) return 'position-badge gold';
    if (position === 2) return 'position-badge silver';
    if (position === 3) return 'position-badge bronze';
    return 'position-badge';
  };

  // Get confidence level class
  const getConfidenceClass = (confidence) => {
    if (confidence >= 90) return 'confidence-high';
    if (confidence >= 75) return 'confidence-medium';
    return 'confidence-low';
  };

  // Calculate gap to leader
  const getGapToLeader = (driverTime) => {
    const leaderTime = predictions[0].predicted_time;
    const gap = driverTime - leaderTime;
    return gap > 0 ? `+${gap.toFixed(3)}s` : '—';
  };

  return (
    <motion.div 
      className="predictions-table-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="table-responsive">
        <table className="predictions-table">
          <thead>
            <tr>
              <th 
                className="sortable-header"
                onClick={() => handleSort('predicted_position')}
              >
                <div className="header-content">
                  <Trophy className="header-icon" />
                  Position
                  {getSortIcon('predicted_position')}
                </div>
              </th>
              
              <th 
                className="sortable-header"
                onClick={() => handleSort('driver')}
              >
                <div className="header-content">
                  Driver
                  {getSortIcon('driver')}
                </div>
              </th>
              
              <th 
                className="sortable-header"
                onClick={() => handleSort('team')}
              >
                <div className="header-content">
                  Team
                  {getSortIcon('team')}
                </div>
              </th>
              
              <th 
                className="sortable-header"
                onClick={() => handleSort('predicted_time')}
              >
                <div className="header-content">
                  <Clock className="header-icon" />
                  Predicted Time
                  {getSortIcon('predicted_time')}
                </div>
              </th>
              
              <th 
                className="sortable-header hide-mobile"
                onClick={() => handleSort('grid_position')}
              >
                <div className="header-content">
                  Grid
                  {getSortIcon('grid_position')}
                </div>
              </th>
              
              <th 
                className="sortable-header hide-mobile"
                onClick={() => handleSort('confidence')}
              >
                <div className="header-content">
                  <Target className="header-icon" />
                  Confidence
                  {getSortIcon('confidence')}
                </div>
              </th>
              
              <th className="hide-mobile">Gap</th>
            </tr>
          </thead>
          
          <tbody>
            {sortedPredictions.map((driver, index) => {
              const originalPosition = predictions.indexOf(driver) + 1;
              
              return (
                <motion.tr
                  key={driver.driver}
                  className="table-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                >
                  {/* Position */}
                  <td>
                    <span className={getPositionBadgeClass(originalPosition)}>
                      {originalPosition}
                    </span>
                  </td>
                  
                  {/* Driver */}
                  <td>
                    <div className="driver-cell">
                      <div 
                        className="driver-color-bar"
                        style={{ backgroundColor: getTeamColor(driver.driver) }}
                      />
                      <span className="driver-code">{driver.driver}</span>
                    </div>
                  </td>
                  
                  {/* Team */}
                  <td>
                    <span className="team-name">{getTeamName(driver.driver)}</span>
                  </td>
                  
                  {/* Predicted Time */}
                  <td>
                    <span className="predicted-time">
                      {driver.predicted_time.toFixed(3)}s
                    </span>
                  </td>
                  
                  {/* Grid Position */}
                  <td className="hide-mobile">
                    <span className="grid-position">
                      P{driver.grid_position}
                    </span>
                  </td>
                  
                  {/* Confidence */}
                  <td className="hide-mobile">
                    <div className="confidence-container">
                      <span className={`confidence-value ${getConfidenceClass(driver.confidence)}`}>
                        {driver.confidence.toFixed(1)}%
                      </span>
                      <div className="confidence-bar">
                        <motion.div 
                          className="confidence-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${driver.confidence}%` }}
                          transition={{ delay: index * 0.05 + 0.5, duration: 0.8 }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  {/* Gap to Leader */}
                  <td className="hide-mobile">
                    <span className="gap-time">
                      {getGapToLeader(driver.predicted_time)}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Table Summary */}
      <motion.div 
        className="table-summary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Drivers:</span>
            <span className="stat-value">{predictions.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Confidence:</span>
            <span className="stat-value">
              {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Time Spread:</span>
            <span className="stat-value">
              {(predictions[predictions.length - 1].predicted_time - predictions[0].predicted_time).toFixed(3)}s
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PredictionsTable;