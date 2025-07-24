// frontend/src/components/TireStrategyAnalyzer.js
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';

const TireStrategyAnalyzer = () => {
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [strategyData, setStrategyData] = useState(null);
  const [compounds, setCompounds] = useState({});
  const [driverSkills, setDriverSkills] = useState([]);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    driver: 'HAM',
    track: 'Britain',
    currentLap: 25,
    raceLaps: 52,
    trackTemp: 35,
    strategies: [
      { name: '1-Stop Soft', pit_lap: 25, compound: 'SOFT' },
      { name: '1-Stop Medium', pit_lap: 30, compound: 'MEDIUM' },
      { name: '1-Stop Hard', pit_lap: 35, compound: 'HARD' }
    ]
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [status, compoundData, skillData] = await Promise.all([
        apiService.getMLModelStatus(),
        apiService.getTireCompounds(),
        apiService.getDriverSkills()
      ]);
      
      setModelStatus(status);
      setCompounds(compoundData.compounds || {});
      setDriverSkills(skillData.driver_rankings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeStrategies = async () => {
    try {
      setLoading(true);
      setError(null);

      const analysisData = {
        driver: formData.driver,
        track: formData.track,
        current_lap: formData.currentLap,
        strategies: formData.strategies,
        conditions: {
          track_temp: formData.trackTemp,
          race_laps: formData.raceLaps
        }
      };

      const result = await apiService.analyzeTireStrategy(analysisData);
      setStrategyData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStrategyChange = (index, field, value) => {
    const newStrategies = [...formData.strategies];
    newStrategies[index] = {
      ...newStrategies[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      strategies: newStrategies
    }));
  };

  const getCompoundColor = (compound) => {
    const colors = {
      'SOFT': '#ff4757',
      'MEDIUM': '#ffa502',
      'HARD': '#f1f2f6',
      'INTERMEDIATE': '#2ed573',
      'WET': '#3742fa'
    };
    return colors[compound] || '#ddd';
  };

  const getRecommendationColor = (recommendation) => {
    if (recommendation === 'Good') return '#2ed573';
    if (recommendation === 'Consider alternatives') return '#ffa502';
    return '#ff4757';
  };

  if (loading && !strategyData) {
    return <LoadingSpinner message="Loading AI strategy analyzer..." />;
  }

  return (
    <div className="tire-strategy-analyzer">
      <div className="analyzer-header">
        <h2>🧠 AI Tire Strategy Analyzer</h2>
        {modelStatus && (
          <div className="model-status">
            <span className={`status-indicator ${modelStatus.tire_model_trained ? 'trained' : 'untrained'}`}>
              {modelStatus.tire_model_trained ? '✅ ML Model Trained' : '⚠️ Using Fallback Model'}
            </span>
            <span className="model-type">{modelStatus.model_type}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="analyzer-content">
        {/* Configuration Panel */}
        <div className="config-panel">
          <h3>📋 Race Configuration</h3>
          
          <div className="config-grid">
            <div className="config-item">
              <label>Driver:</label>
              <select 
                value={formData.driver} 
                onChange={(e) => handleInputChange('driver', e.target.value)}
              >
                {driverSkills.map(driver => (
                  <option key={driver.driver} value={driver.driver}>
                    {driver.driver} (Skill: {driver.tire_management_skill})
                  </option>
                ))}
              </select>
            </div>

            <div className="config-item">
              <label>Track:</label>
              <select 
                value={formData.track} 
                onChange={(e) => handleInputChange('track', e.target.value)}
              >
                <option value="Britain">Silverstone (Britain)</option>
                <option value="Monaco">Monaco</option>
                <option value="Austria">Red Bull Ring (Austria)</option>
                <option value="Spain">Catalunya (Spain)</option>
                <option value="Italy">Monza (Italy)</option>
                <option value="Belgium">Spa (Belgium)</option>
                <option value="Netherlands">Zandvoort (Netherlands)</option>
                <option value="Singapore">Singapore</option>
                <option value="Hungary">Hungaroring (Hungary)</option>
                <option value="Abu Dhabi">Yas Marina (Abu Dhabi)</option>
              </select>
            </div>

            <div className="config-item">
              <label>Current Lap:</label>
              <input 
                type="number" 
                value={formData.currentLap}
                onChange={(e) => handleInputChange('currentLap', parseInt(e.target.value))}
                min="1" 
                max="70"
              />
            </div>

            <div className="config-item">
              <label>Race Laps:</label>
              <input 
                type="number" 
                value={formData.raceLaps}
                onChange={(e) => handleInputChange('raceLaps', parseInt(e.target.value))}
                min="20" 
                max="70"
              />
            </div>

            <div className="config-item">
              <label>Track Temp (°C):</label>
              <input 
                type="number" 
                value={formData.trackTemp}
                onChange={(e) => handleInputChange('trackTemp', parseInt(e.target.value))}
                min="15" 
                max="60"
              />
            </div>
          </div>

          {/* Strategy Configuration */}
          <div className="strategies-config">
            <h4>🏁 Strategies to Compare</h4>
            {formData.strategies.map((strategy, index) => (
              <div key={index} className="strategy-config">
                <input 
                  type="text" 
                  placeholder="Strategy name"
                  value={strategy.name}
                  onChange={(e) => handleStrategyChange(index, 'name', e.target.value)}
                />
                <input 
                  type="number" 
                  placeholder="Pit lap"
                  value={strategy.pit_lap}
                  onChange={(e) => handleStrategyChange(index, 'pit_lap', parseInt(e.target.value))}
                  min="1"
                />
                <select 
                  value={strategy.compound}
                  onChange={(e) => handleStrategyChange(index, 'compound', e.target.value)}
                >
                  <option value="SOFT">Soft</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            ))}
          </div>

          <button 
            className="analyze-btn"
            onClick={analyzeStrategies}
            disabled={loading}
          >
            {loading ? '🔄 Analyzing...' : '🧠 Analyze Strategies'}
          </button>
        </div>

        {/* Results Panel */}
        {strategyData && (
          <div className="results-panel">
            <h3>📊 AI Strategy Analysis Results</h3>
            
            {/* Best Strategy Highlight */}
            {strategyData.best_strategy && (
              <div className="best-strategy">
                <h4>🏆 Recommended Strategy</h4>
                <div className="strategy-card best">
                  <div className="strategy-header">
                    <span className="strategy-name">{strategyData.best_strategy.name}</span>
                    <span 
                      className="compound-badge"
                      style={{ backgroundColor: getCompoundColor(strategyData.best_strategy.compound) }}
                    >
                      {strategyData.best_strategy.compound}
                    </span>
                  </div>
                  <div className="strategy-details">
                    <div className="detail">
                      <span>Pit Lap:</span>
                      <span>{strategyData.best_strategy.pit_lap}</span>
                    </div>
                    <div className="detail">
                      <span>Total Time Loss:</span>
                      <span>{strategyData.best_strategy.estimated_time_loss}s</span>
                    </div>
                    <div className="detail">
                      <span>Tire Degradation:</span>
                      <span>{strategyData.best_strategy.total_degradation}s</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Strategies Comparison */}
            <div className="strategies-comparison">
              <h4>📋 All Strategies Comparison</h4>
              <div className="strategies-grid">
                {strategyData.strategy_analysis.map((strategy, index) => (
                  <div key={index} className="strategy-card">
                    <div className="strategy-header">
                      <span className="strategy-name">{strategy.name}</span>
                      <span 
                        className="compound-badge"
                        style={{ backgroundColor: getCompoundColor(strategy.compound) }}
                      >
                        {strategy.compound}
                      </span>
                    </div>
                    
                    <div className="strategy-metrics">
                      <div className="metric">
                        <span className="metric-label">Pit Lap:</span>
                        <span className="metric-value">{strategy.pit_lap}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Time Loss:</span>
                        <span className="metric-value">{strategy.estimated_time_loss}s</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Stint 1:</span>
                        <span className="metric-value">{strategy.stint1_degradation}s</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Stint 2:</span>
                        <span className="metric-value">{strategy.stint2_degradation}s</span>
                      </div>
                    </div>
                    
                    <div 
                      className="strategy-recommendation"
                      style={{ color: getRecommendationColor(strategy.recommendation) }}
                    >
                      {strategy.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .tire-strategy-analyzer {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .analyzer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e74c3c;
        }

        .analyzer-header h2 {
          color: #e74c3c;
          margin: 0;
        }

        .model-status {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .status-indicator {
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
        }

        .status-indicator.trained {
          background-color: #2ed573;
          color: white;
        }

        .status-indicator.untrained {
          background-color: #ffa502;
          color: white;
        }

        .model-type {
          font-size: 12px;
          color: #666;
        }

        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #e74c3c;
        }

        .analyzer-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 30px;
        }

        .config-panel {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 10px;
          border: 1px solid #dee2e6;
        }

        .config-panel h3 {
          color: #495057;
          margin-bottom: 20px;
        }

        .config-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 25px;
        }

        .config-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .config-item label {
          font-weight: bold;
          color: #495057;
          font-size: 14px;
        }

        .config-item select, 
        .config-item input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
        }

        .strategies-config h4 {
          color: #495057;
          margin-bottom: 15px;
        }

        .strategy-config {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        .strategy-config input,
        .strategy-config select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
        }

        .analyze-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s;
        }

        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .analyze-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .results-panel {
          background: white;
          padding: 25px;
          border-radius: 10px;
          border: 1px solid #dee2e6;
        }

        .results-panel h3 {
          color: #495057;
          margin-bottom: 25px;
        }

        .best-strategy {
          margin-bottom: 30px;
        }

        .best-strategy h4 {
          color: #28a745;
          margin-bottom: 15px;
        }

        .strategy-card {
          background: white;
          border: 2px solid #dee2e6;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 15px;
          transition: box-shadow 0.3s;
        }

        .strategy-card.best {
          border-color: #28a745;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
        }

        .strategy-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .strategy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .strategy-name {
          font-weight: bold;
          font-size: 16px;
          color: #495057;
        }

        .compound-badge {
          padding: 4px 12px;
          border-radius: 15px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
        }

        .strategy-details,
        .strategy-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail,
        .metric {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f8f9fa;
        }

        .metric-label {
          color: #666;
          font-size: 14px;
        }

        .metric-value {
          font-weight: bold;
          color: #495057;
        }

        .strategy-recommendation {
          text-align: center;
          font-weight: bold;
          margin-top: 15px;
          padding: 8px;
          border-radius: 6px;
          background-color: #f8f9fa;
        }

        .strategies-comparison h4 {
          color: #495057;
          margin-bottom: 20px;
        }

        .strategies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        @media (max-width: 768px) {
          .analyzer-content {
            grid-template-columns: 1fr;
          }
          
          .config-grid {
            grid-template-columns: 1fr;
          }
          
          .strategy-config {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TireStrategyAnalyzer;