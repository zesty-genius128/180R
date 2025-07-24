// frontend/src/components/WeatherWidget.js
import React from 'react';
import { motion } from 'framer-motion';
import { CloudRain, Sun, Cloud, Wind, Thermometer, Droplets } from 'lucide-react';

const WeatherWidget = ({ weather }) => {
  if (!weather) {
    return (
      <div className="weather-error">
        <p>Weather data unavailable</p>
      </div>
    );
  }

  // Get weather icon based on conditions
  const getWeatherIcon = () => {
    const { rain_chance, temperature } = weather;
    
    if (rain_chance > 70) {
      return <CloudRain className="weather-icon-svg" />;
    } else if (rain_chance > 30) {
      return <Cloud className="weather-icon-svg" />;
    } else {
      return <Sun className="weather-icon-svg" />;
    }
  };

  // Get weather emoji for header
  const getWeatherEmoji = () => {
    const { rain_chance } = weather;
    
    if (rain_chance > 70) return '🌧️';
    if (rain_chance > 30) return '⛅';
    return '☀️';
  };

  // Get temperature color class
  const getTempColorClass = () => {
    const temp = weather.temperature;
    if (temp < 10) return 'temp-cold';
    if (temp < 20) return 'temp-cool';
    if (temp < 30) return 'temp-warm';
    return 'temp-hot';
  };

  // Get rain probability color class
  const getRainColorClass = () => {
    const rain = weather.rain_chance;
    if (rain < 20) return 'rain-low';
    if (rain < 50) return 'rain-medium';
    return 'rain-high';
  };

  return (
    <motion.div 
      className="weather-widget"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main Weather Display */}
      <div className="weather-main">
        <motion.div 
          className="weather-icon-container"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {getWeatherIcon()}
        </motion.div>
        
        <div className="weather-primary">
          <motion.h3 
            className={`temperature ${getTempColorClass()}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {weather.temperature.toFixed(1)}°C
          </motion.h3>
          <p className="weather-description">
            {getWeatherEmoji()} Track Temperature
          </p>
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="weather-details-grid">
        {/* Humidity */}
        <motion.div 
          className="weather-detail-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Droplets className="detail-icon" />
          <div className="detail-content">
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{weather.humidity.toFixed(1)}%</span>
          </div>
        </motion.div>

        {/* Wind Speed */}
        <motion.div 
          className="weather-detail-item"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Wind className="detail-icon" />
          <div className="detail-content">
            <span className="detail-label">Wind</span>
            <span className="detail-value">{weather.wind_speed.toFixed(1)} km/h</span>
          </div>
        </motion.div>

        {/* Pressure */}
        <motion.div 
          className="weather-detail-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Thermometer className="detail-icon" />
          <div className="detail-content">
            <span className="detail-label">Pressure</span>
            <span className="detail-value">{weather.pressure.toFixed(0)} hPa</span>
          </div>
        </motion.div>
      </div>

      {/* Rain Probability */}
      <motion.div 
        className="rain-probability-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className={`rain-probability ${getRainColorClass()}`}>
          <motion.div 
            className="rain-percentage"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
          >
            {weather.rain_chance.toFixed(0)}%
          </motion.div>
          <p className="rain-label">Rain Chance</p>
          
          {/* Rain probability bar */}
          <div className="rain-bar-container">
            <motion.div 
              className="rain-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${weather.rain_chance}%` }}
              transition={{ delay: 1, duration: 1 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Weather Impact Indicator */}
      <motion.div 
        className="weather-impact"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <div className="impact-indicator">
          <span className="impact-label">Track Impact:</span>
          <span className={`impact-level ${getImpactLevel()}`}>
            {getImpactText()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );

  // Helper functions for impact assessment
  function getImpactLevel() {
    const { rain_chance, wind_speed, temperature } = weather;
    
    if (rain_chance > 50 || wind_speed > 20 || temperature > 35 || temperature < 5) {
      return 'impact-high';
    } else if (rain_chance > 20 || wind_speed > 10 || temperature > 30 || temperature < 10) {
      return 'impact-medium';
    }
    return 'impact-low';
  }

  function getImpactText() {
    const level = getImpactLevel();
    switch (level) {
      case 'impact-high': return 'High';
      case 'impact-medium': return 'Medium';
      default: return 'Low';
    }
  }
};

export default WeatherWidget;