// frontend/src/components/SessionInfo.js
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Activity, Users, Zap } from 'lucide-react';

const SessionInfo = ({ sessionInfo }) => {
  if (!sessionInfo) {
    return (
      <div className="session-info-error">
        <p>Session information unavailable</p>
      </div>
    );
  }

  // Get session type display name
  const getSessionName = (session) => {
    const sessionNames = {
      'FP1': 'Practice 1',
      'FP2': 'Practice 2', 
      'FP3': 'Practice 3',
      'Q': 'Qualifying',
      'S': 'Sprint',
      'R': 'Race'
    };
    return sessionNames[session] || session;
  };

  // Get session icon
  const getSessionIcon = (session) => {
    switch (session) {
      case 'FP1':
      case 'FP2':
      case 'FP3':
        return <Activity className="session-icon" />;
      case 'Q':
        return <Zap className="session-icon" />;
      case 'S':
      case 'R':
        return <Users className="session-icon" />;
      default:
        return <Clock className="session-icon" />;
    }
  };

  // Get session color class
  const getSessionColorClass = (session) => {
    switch (session) {
      case 'FP1':
      case 'FP2':
      case 'FP3':
        return 'session-practice';
      case 'Q':
        return 'session-qualifying';
      case 'S':
        return 'session-sprint';
      case 'R':
        return 'session-race';
      default:
        return 'session-default';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <motion.div 
      className="session-info-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Session Header */}
      <motion.div 
        className={`session-header ${getSessionColorClass(sessionInfo.session)}`}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring" }}
      >
        <div className="session-title">
          {getSessionIcon(sessionInfo.session)}
          <h3>{getSessionName(sessionInfo.session)}</h3>
        </div>
        <div className="session-badge">
          {sessionInfo.year} Season
        </div>
      </motion.div>

      {/* Session Details Grid */}
      <div className="session-details-grid">
        {/* Event Info */}
        <motion.div 
          className="detail-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="detail-header">
            <MapPin className="detail-icon" />
            <span className="detail-label">Event</span>
          </div>
          <div className="detail-content">
            <span className="detail-value">{sessionInfo.event}</span>
            <span className="detail-subtitle">Grand Prix</span>
          </div>
        </motion.div>

        {/* Date Info */}
        <motion.div 
          className="detail-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="detail-header">
            <Calendar className="detail-icon" />
            <span className="detail-label">Date</span>
          </div>
          <div className="detail-content">
            <span className="detail-value">{formatDate(sessionInfo.date)}</span>
            <span className="detail-subtitle">{formatTime(sessionInfo.date)}</span>
          </div>
        </motion.div>

        {/* Status Info */}
        <motion.div 
          className="detail-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="detail-header">
            <Activity className="detail-icon" />
            <span className="detail-label">Status</span>
          </div>
          <div className="detail-content">
            <span className="detail-value status-live">Live Analysis</span>
            <span className="detail-subtitle">AI Predictions Active</span>
          </div>
        </motion.div>

        {/* Model Info */}
        <motion.div 
          className="detail-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="detail-header">
            <Zap className="detail-icon" />
            <span className="detail-label">Model</span>
          </div>
          <div className="detail-content">
            <span className="detail-value">FastF1 + AI</span>
            <span className="detail-subtitle">Real-time Data</span>
          </div>
        </motion.div>
      </div>

      {/* Session Insights */}
      <motion.div 
        className="session-insights"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h4 className="insights-title">Session Insights</h4>
        <div className="insights-grid">
          <div className="insight-item">
            <span className="insight-label">Data Source:</span>
            <span className="insight-value">Official F1 Timing</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Update Frequency:</span>
            <span className="insight-value">Real-time</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Prediction Method:</span>
            <span className="insight-value">Machine Learning</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Confidence Range:</span>
            <span className="insight-value">70-98%</span>
          </div>
        </div>
      </motion.div>

      {/* Session Progress (if applicable) */}
      {sessionInfo.session !== 'R' && (
        <motion.div 
          className="session-progress"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div className="progress-header">
            <span className="progress-label">Session Analysis</span>
            <span className="progress-status">Complete</span>
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 1, duration: 1.5 }}
            />
          </div>
          <div className="progress-info">
            <span>All telemetry data processed</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SessionInfo;