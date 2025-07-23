// frontend/src/components/SchedulePage.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Flag } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const SchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2025);

  useEffect(() => {
    loadSchedule();
  }, [selectedYear]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSchedule(selectedYear);
      setSchedule(data);
    } catch (error) {
      toast.error('Failed to load F1 schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const isEventPast = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const isEventCurrent = (dateString) => {
    if (!dateString) return false;
    const eventDate = new Date(dateString);
    const now = new Date();
    const weekStart = new Date(eventDate);
    weekStart.setDate(eventDate.getDate() - 4);
    const weekEnd = new Date(eventDate);
    weekEnd.setDate(eventDate.getDate() + 1);
    
    return now >= weekStart && now <= weekEnd;
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
          <h1 className="dashboard-title">F1 Schedule</h1>
          <p className="dashboard-subtitle">Formula 1 Calendar & Race Weekends</p>
        </div>
        
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="select-input"
        >
          <option value={2024}>2024 Season</option>
          <option value={2025}>2025 Season</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading F1 schedule..." />
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {schedule.map((event, index) => (
            <motion.div
              key={event.round}
              className="card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                opacity: isEventPast(event.date) ? 0.6 : 1,
                border: isEventCurrent(event.date) ? '2px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Event Info */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2rem',
                      height: '2rem',
                      background: 'var(--accent-blue)',
                      color: 'var(--f1-black)',
                      borderRadius: '50%',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {event.round}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                      {event.name}
                    </h3>
                    {isEventCurrent(event.date) && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: 'var(--accent-green)',
                        color: 'var(--f1-black)',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}, {event.country}</span>
                  </div>

                  {/* Session Times */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                    {event.sessions.fp1 && (
                      <div className="session-time">
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>FP1</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {formatDate(event.sessions.fp1)}
                        </div>
                      </div>
                    )}
                    {event.sessions.fp2 && (
                      <div className="session-time">
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>FP2</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {formatDate(event.sessions.fp2)}
                        </div>
                      </div>
                    )}
                    {event.sessions.fp3 && (
                      <div className="session-time">
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>FP3</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {formatDate(event.sessions.fp3)}
                        </div>
                      </div>
                    )}
                    {event.sessions.qualifying && (
                      <div className="session-time">
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)' }}>QUALIFYING</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {formatDate(event.sessions.qualifying)}
                        </div>
                      </div>
                    )}
                    {event.sessions.race && (
                      <div className="session-time">
                        <div style={{ fontSize: '0.7rem', color: 'var(--f1-red)' }}>RACE</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {formatDate(event.sessions.race)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Race Date */}
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Race Day</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                    {formatDate(event.date)}
                  </div>
                  {event.date && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Schedule Stats */}
      {schedule.length > 0 && (
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h2 className="card-title">
              <Flag className="w-6 h-6 text-green-400" />
              Season Statistics
            </h2>
          </div>
          
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{schedule.length}</div>
              <div className="metric-label">Total Races</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">
                {schedule.filter(event => isEventPast(event.date)).length}
              </div>
              <div className="metric-label">Completed</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">
                {schedule.filter(event => !isEventPast(event.date)).length}
              </div>
              <div className="metric-label">Remaining</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">
                {new Set(schedule.map(event => event.country)).size}
              </div>
              <div className="metric-label">Countries</div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SchedulePage;