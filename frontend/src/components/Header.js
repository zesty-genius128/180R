// frontend/src/components/Header.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RefreshCw, Activity, Wifi, WifiOff, Menu, X, HelpCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const Header = ({ 
  connectionStatus, 
  currentEvent, 
  currentSession,
  onEventChange,
  onSessionChange,
  onRefresh,
  isAutoRefresh,
  onToggleAutoRefresh,
  onShowHelp
}) => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const sessions = [
    { value: 'FP1', label: 'Practice 1' },
    { value: 'FP2', label: 'Practice 2' },
    { value: 'FP3', label: 'Practice 3' },
    { value: 'Q', label: 'Qualifying' },
    { value: 'S', label: 'Sprint' },
    { value: 'R', label: 'Race' }
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const schedule = await apiService.getSchedule(2025);
      setEvents(schedule);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load F1 schedule');
    }
  };

  const handleRefresh = async () => {
    if (!currentEvent) {
      toast.error('Please select an event first');
      return;
    }

    setIsLoading(true);
    try {
      await onRefresh();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live Data';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  const isActivePage = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">🏁</div>
          <h1 className="logo-text">F1 AI PREDICTOR</h1>
        </div>

        {/* Navigation - Desktop */}
        <nav className="nav-desktop">
          <Link 
            to="/" 
            className={`nav-link ${isActivePage('/') ? 'nav-link-active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/comparison" 
            className={`nav-link ${isActivePage('/comparison') ? 'nav-link-active' : ''}`}
          >
            Compare
          </Link>
          <Link 
            to="/schedule" 
            className={`nav-link ${isActivePage('/schedule') ? 'nav-link-active' : ''}`}
          >
            Schedule
          </Link>
          <Link 
            to="/tire-strategy" 
            className={`nav-link ${isActivePage('/tire-strategy') ? 'nav-link-active' : ''}`}
          >
            🧠 AI Strategy
          </Link>
        </nav>

        {/* Controls */}
        <div className="header-controls">
          {/* Event Selector */}
          <select 
            value={currentEvent || ''} 
            onChange={(e) => onEventChange(e.target.value)}
            className="select-input"
          >
            <option value="">Select Event</option>
            {events.map((event) => (
              <option key={event.location} value={event.location}>
                {event.name}
              </option>
            ))}
          </select>

          {/* Session Selector */}
          <select 
            value={currentSession} 
            onChange={(e) => onSessionChange(e.target.value)}
            className="select-input"
          >
            {sessions.map((session) => (
              <option key={session.value} value={session.value}>
                {session.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            disabled={isLoading || !currentEvent}
            className="btn btn-primary"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Update
          </button>

          {/* Auto-refresh Toggle */}
          <button 
            onClick={onToggleAutoRefresh}
            className={`btn ${isAutoRefresh ? 'btn-success' : 'btn-secondary'}`}
            title="Toggle auto-refresh"
          >
            <Activity className="w-4 h-4" />
            Auto: {isAutoRefresh ? 'ON' : 'OFF'}
          </button>

          {/* Help Button */}
          <button 
            onClick={onShowHelp}
            className="btn btn-help"
            title="Show user guide"
          >
            <HelpCircle className="w-4 h-4" />
            Help
          </button>
        </div>

        {/* Connection Status */}
        <div className="connection-status">
          {getConnectionStatusIcon()}
          <span className="connection-text">{getConnectionStatusText()}</span>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="mobile-nav">
          <Link 
            to="/" 
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            to="/comparison" 
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Compare
          </Link>
          <Link 
            to="/schedule" 
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Schedule
          </Link>
          <Link 
            to="/tire-strategy" 
            className="mobile-nav-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🧠 AI Strategy
          </Link>
          
          <div className="mobile-controls">
            <select 
              value={currentEvent || ''} 
              onChange={(e) => onEventChange(e.target.value)}
              className="select-input mobile-select"
            >
              <option value="">Select Event</option>
              {events.map((event) => (
                <option key={event.location} value={event.location}>
                  {event.name}
                </option>
              ))}
            </select>

            <select 
              value={currentSession} 
              onChange={(e) => onSessionChange(e.target.value)}
              className="select-input mobile-select"
            >
              {sessions.map((session) => (
                <option key={session.value} value={session.value}>
                  {session.label}
                </option>
              ))}
            </select>

            <button 
              onClick={handleRefresh}
              disabled={isLoading || !currentEvent}
              className="btn btn-primary mobile-btn"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Update
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;