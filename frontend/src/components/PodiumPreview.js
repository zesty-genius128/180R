// frontend/src/components/PodiumPreview.js
import React from 'react';
import { motion } from 'framer-motion';

const PodiumPreview = ({ predictions }) => {
  if (!predictions || predictions.length < 3) {
    return (
      <div className="podium-error">
        <p>Insufficient data for podium predictions</p>
      </div>
    );
  }

  // Get team names
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

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [
    { ...predictions[1], position: 2 },
    { ...predictions[0], position: 1 },
    { ...predictions[2], position: 3 }
  ];

  const getPositionClass = (position) => {
    switch (position) {
      case 1: return 'position-1';
      case 2: return 'position-2';
      case 3: return 'position-3';
      default: return '';
    }
  };

  const getStandHeight = (position) => {
    switch (position) {
      case 1: return '120px';
      case 2: return '100px';
      case 3: return '80px';
      default: return '60px';
    }
  };

  return (
    <div className="podium-container">
      {podiumOrder.map((driver, index) => (
        <motion.div
          key={driver.driver}
          className={`podium-position ${getPositionClass(driver.position)}`}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index * 0.2,
            duration: 0.6,
            ease: "easeOut"
          }}
        >
          <motion.div 
            className="driver-card"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="driver-name">{driver.driver}</div>
            <div className="team-name">{getTeamName(driver.driver)}</div>
            <div className="prediction-confidence">
              {driver.confidence.toFixed(1)}% confidence
            </div>
            
            {/* Additional stats */}
            <div className="driver-stats">
              <div className="stat-item">
                <span className="stat-label">Grid:</span>
                <span className="stat-value">P{driver.grid_position}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time:</span>
                <span className="stat-value">{driver.predicted_time.toFixed(3)}s</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="podium-stand"
            style={{ height: getStandHeight(driver.position) }}
            initial={{ height: 0 }}
            animate={{ height: getStandHeight(driver.position) }}
            transition={{ delay: index * 0.2 + 0.3, duration: 0.8 }}
          >
            {driver.position}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};

export default PodiumPreview;