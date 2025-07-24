// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Components
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ComparisonPage from './components/ComparisonPage';
import SchedulePage from './components/SchedulePage';
import TireStrategyAnalyzer from './components/TireStrategyAnalyzer';
import IntelligentTraining from './components/IntelligentTraining';
import WelcomeGuide from './components/WelcomeGuide';
import LoadingSpinner from './components/LoadingSpinner';

// Services
import { apiService } from './services/apiService';
import { websocketService } from './services/websocketService';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentSession, setCurrentSession] = useState('Q');
  const [liveData, setLiveData] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(
    !localStorage.getItem('f1-ai-pitwall-visited')
  );

  // Initialize WebSocket connection
  useEffect(() => {
    websocketService.connect();
    
    websocketService.onMessage((data) => {
      if (data.type === 'session-update') {
        setLiveData(data.data);
      } else if (data.type === 'auto-update') {
        setLiveData(data.data);
      }
    });

    websocketService.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    let interval;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        if (currentEvent) {
          refreshData();
        }
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefresh, currentEvent]);

  // Load current F1 weekend on mount
  useEffect(() => {
    loadCurrentWeekend();
  }, []);

  const loadCurrentWeekend = async () => {
    try {
      const weekendInfo = await apiService.getCurrentWeekend();
      if (weekendInfo.isRaceWeekend) {
        setCurrentEvent(weekendInfo.event.location);
        if (weekendInfo.nextSession) {
          setCurrentSession(weekendInfo.nextSession.session);
        }
      } else if (weekendInfo.nextEvent) {
        setCurrentEvent(weekendInfo.nextEvent.location);
      }
    } catch (error) {
      console.error('Error loading current weekend:', error);
    }
  };

  const refreshData = async () => {
    if (!currentEvent) return;
    
    try {
      const data = await apiService.getSessionData(2025, currentEvent, currentSession);
      setLiveData(data);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleEventChange = (event) => {
    setCurrentEvent(event);
    setLiveData(null); // Clear previous data
  };

  const handleSessionChange = (session) => {
    setCurrentSession(session);
    setLiveData(null); // Clear previous data
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  const handleCloseWelcomeGuide = () => {
    localStorage.setItem('f1-ai-pitwall-visited', 'true');
    setShowWelcomeGuide(false);
  };

  const handleShowHelp = () => {
    setShowWelcomeGuide(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Header 
            connectionStatus={connectionStatus}
            currentEvent={currentEvent}
            currentSession={currentSession}
            onEventChange={handleEventChange}
            onSessionChange={handleSessionChange}
            onRefresh={refreshData}
            isAutoRefresh={isAutoRefresh}
            onToggleAutoRefresh={toggleAutoRefresh}
            onShowHelp={handleShowHelp}
          />
          
          <main className="main-content">
            <Routes>
              <Route 
                path="/" 
                element={
                  <Dashboard 
                    currentEvent={currentEvent}
                    currentSession={currentSession}
                    liveData={liveData}
                    onDataUpdate={setLiveData}
                  />
                } 
              />
              <Route 
                path="/comparison" 
                element={
                  <ComparisonPage 
                    currentEvent={currentEvent}
                    currentSession={currentSession}
                  />
                } 
              />
              <Route 
                path="/schedule" 
                element={<SchedulePage />} 
              />
              <Route 
                path="/tire-strategy" 
                element={<TireStrategyAnalyzer />} 
              />
              <Route 
                path="/intelligent-training" 
                element={<IntelligentTraining />} 
              />
            </Routes>
          </main>
          
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#15151e',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
            }}
          />

          {/* Welcome Guide for new users */}
          {showWelcomeGuide && (
            <WelcomeGuide onClose={handleCloseWelcomeGuide} />
          )}
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;