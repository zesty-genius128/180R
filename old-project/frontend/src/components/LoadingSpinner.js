// frontend/src/components/LoadingSpinner.js
import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "large", 
  showProgress = false,
  progress = 0 
}) => {
  
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'spinner-small';
      case 'medium': return 'spinner-medium';
      case 'large': return 'spinner-large';
      default: return 'spinner-medium';
    }
  };

  const messages = [
    "Loading F1 data...",
    "Processing telemetry...",
    "Analyzing session data...",
    "Generating predictions...",
    "Fetching weather data...",
    "Calculating lap times...",
    "Building models..."
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);

  React.useEffect(() => {
    if (message === "Loading...") {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [message]);

  const displayMessage = message === "Loading..." ? messages[currentMessageIndex] : message;

  return (
    <motion.div 
      className="loading-spinner-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="loading-content">
        {/* Main Spinner */}
        <div className={`spinner-wrapper ${getSizeClass()}`}>
          <motion.div 
            className="spinner-ring"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          <motion.div 
            className="spinner-ring spinner-ring-2"
            animate={{ rotate: -360 }}
            transition={{ 
              duration: 1.8, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          <motion.div 
            className="spinner-center"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            🏁
          </motion.div>
        </div>

        {/* Loading Message */}
        <motion.div 
          className="loading-message"
          key={displayMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {displayMessage}
        </motion.div>

        {/* Progress Bar (if enabled) */}
        {showProgress && (
          <motion.div 
            className="loading-progress"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="progress-bar">
              <motion.div 
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="progress-text">
              {progress}% Complete
            </div>
          </motion.div>
        )}

        {/* Loading Dots Animation */}
        <div className="loading-dots">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="loading-dot"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </div>

        {/* Sub-messages for context */}
        <motion.div 
          className="loading-sub-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {size === 'large' && (
            <>
              {displayMessage.includes('F1 data') && "Connecting to FastF1 API..."}
              {displayMessage.includes('telemetry') && "Processing car data and timing..."}
              {displayMessage.includes('session') && "Analyzing practice and qualifying data..."}
              {displayMessage.includes('predictions') && "Running machine learning models..."}
              {displayMessage.includes('weather') && "Fetching track conditions..."}
              {displayMessage.includes('lap times') && "Computing optimal race pace..."}
              {displayMessage.includes('models') && "Initializing prediction algorithms..."}
            </>
          )}
        </motion.div>
      </div>

      {/* Background Animation */}
      <div className="loading-background">
        {[...Array(6)].map((_, index) => (
          <motion.div
            key={index}
            className="background-dot"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: index * 0.5,
              ease: "easeInOut"
            }}
            style={{
              left: `${20 + index * 12}%`,
              top: `${30 + (index % 3) * 20}%`
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Specialized loading components for different contexts
export const PodiumLoadingSpinner = () => (
  <LoadingSpinner 
    message="Analyzing podium predictions..." 
    size="large"
  />
);

export const WeatherLoadingSpinner = () => (
  <LoadingSpinner 
    message="Fetching weather conditions..." 
    size="medium"
  />
);

export const DataLoadingSpinner = ({ progress }) => (
  <LoadingSpinner 
    message="Processing session data..." 
    size="large"
    showProgress={true}
    progress={progress}
  />
);

export const TableLoadingSpinner = () => (
  <LoadingSpinner 
    message="Loading predictions table..." 
    size="medium"
  />
);

export default LoadingSpinner;