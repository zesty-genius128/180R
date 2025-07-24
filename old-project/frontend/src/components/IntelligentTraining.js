import React, { useState } from 'react';

const IntelligentTraining = () => {
  const [selectedTrack, setSelectedTrack] = useState('Spa');
  const [raceNumber, setRaceNumber] = useState(13);
  const [training, setTraining] = useState(false);
  const [trainingResults, setTrainingResults] = useState(null);

  const handleTraining = async () => {
    setTraining(true);
    try {
      const response = await fetch('/api/ml/train-intelligent-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: selectedTrack,
          race_number: raceNumber,
          episodes_per_scenario: 30,
          focus_drivers: ['HAM', 'VER', 'LEC', 'NOR']
        })
      });
      
      const data = await response.json();
      setTrainingResults(data);
    } catch (error) {
      console.error('Error:', error);
      setTrainingResults({ error: 'Failed to train model' });
    }
    setTraining(false);
  };

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🏋️ Intelligent F1 Strategy Training</h1>
      <p>Train AI using real F1 team methodology for upcoming races</p>
      
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', margin: '20px 0' }}>
        <h3>Training Configuration</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Track:</label>
          <select 
            value={selectedTrack} 
            onChange={(e) => setSelectedTrack(e.target.value)}
            style={{ padding: '8px', width: '200px', background: '#333', color: 'white', border: '1px solid #555' }}
          >
            <option value="Spa">Spa-Francorchamps (Belgian GP)</option>
            <option value="Silverstone">Silverstone (British GP)</option>
            <option value="Monaco">Monaco (Monaco GP)</option>
            <option value="Monza">Monza (Italian GP)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Race Number:</label>
          <input 
            type="number" 
            min="1" 
            max="24" 
            value={raceNumber}
            onChange={(e) => setRaceNumber(parseInt(e.target.value))}
            style={{ padding: '8px', width: '100px', background: '#333', color: 'white', border: '1px solid #555' }}
          />
        </div>

        <button 
          onClick={handleTraining}
          disabled={training}
          style={{
            padding: '12px 24px',
            background: training ? '#666' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: training ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {training ? '🏋️ Training in Progress...' : '🚀 Start Intelligent Training'}
        </button>
      </div>

      {trainingResults && (
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
          <h3>Training Results</h3>
          {trainingResults.error ? (
            <div style={{ color: '#ff6b6b' }}>❌ {trainingResults.error}</div>
          ) : (
            <div style={{ color: '#51cf66' }}>
              ✅ Training completed successfully!
              <br />
              Track: {trainingResults.track_insights?.optimal_pit_window ? 
                `Laps ${trainingResults.track_insights.optimal_pit_window[0]}-${trainingResults.track_insights.optimal_pit_window[1]}` : 
                'N/A'}
              <br />
              Episodes: {trainingResults.total_episodes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligentTraining;