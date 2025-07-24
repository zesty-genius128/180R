// frontend/src/components/WelcomeGuide.js
import React, { useState } from 'react';

const WelcomeGuide = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "🏁 Welcome to F1 AI Pitwall",
      content: (
        <div>
          <p>This is your personal F1 strategy analysis tool - like having a real F1 team's pitwall at your fingertips!</p>
          <ul>
            <li>🧠 <strong>AI-Powered</strong>: Uses machine learning trained on real F1 data (2023-2024)</li>
            <li>📊 <strong>Strategy Analysis</strong>: Compare different pit stop strategies</li>
            <li>🏎️ <strong>Driver-Specific</strong>: Accounts for each driver's tire management skills</li>
            <li>🌡️ <strong>Real Conditions</strong>: Track temperature, tire compounds, race situations</li>
          </ul>
          <p className="highlight">Think of it as your personal F1 strategy engineer!</p>
        </div>
      )
    },
    {
      title: "🧠 AI Strategy Analyzer",
      content: (
        <div>
          <p>The main feature - analyze tire strategies during a race:</p>
          <div className="feature-demo">
            <div className="demo-scenario">
              <h4>Example Scenario:</h4>
              <p>"It's lap 25 at Silverstone. Hamilton is on medium tires. Should he pit now for hards, or wait until lap 30 for softs?"</p>
            </div>
            <div className="demo-steps">
              <ol>
                <li>Select <strong>Hamilton</strong> as driver</li>
                <li>Choose <strong>Silverstone (Britain)</strong> track</li>
                <li>Set current lap to <strong>25</strong></li>
                <li>Compare strategies:
                  <ul>
                    <li>"Pit Now - Hards" (lap 25, hard tires)</li>
                    <li>"Wait - Softs" (lap 30, soft tires)</li>
                  </ul>
                </li>
                <li>Click <strong>"🧠 Analyze Strategies"</strong></li>
              </ol>
            </div>
          </div>
          <p className="tip">💡 The AI will tell you which strategy loses less time and why!</p>
        </div>
      )
    },
    {
      title: "📊 Understanding Results",
      content: (
        <div>
          <p>The AI gives you detailed analysis like a real F1 engineer:</p>
          <div className="results-guide">
            <div className="metric-explanation">
              <h4>🏆 Best Strategy</h4>
              <p>Shows the optimal choice with green highlighting</p>
            </div>
            <div className="metric-explanation">
              <h4>⏱️ Time Loss</h4>
              <p><strong>Pit Stop Time (24s)</strong> + <strong>Tire Degradation</strong> = <strong>Total Time Loss</strong></p>
              <p>Lower is better - means less time lost to the leader</p>
            </div>
            <div className="metric-explanation">
              <h4>🛞 Tire Degradation</h4>
              <p>How much slower the tires get over time:</p>
              <ul>
                <li><span className="soft-tire">Soft</span>: Fast but degrade quickly (0.08s/lap)</li>
                <li><span className="medium-tire">Medium</span>: Balanced (0.04s/lap)</li>
                <li><span className="hard-tire">Hard</span>: Slow but durable (0.02s/lap)</li>
              </ul>
            </div>
            <div className="metric-explanation">
              <h4>👨‍🏎️ Driver Skills</h4>
              <p>Hamilton (0.95) manages tires better than others, so his degradation is slower</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🎮 How to Use Each Page",
      content: (
        <div>
          <div className="page-guide">
            <div className="page-section">
              <h4>🏠 Dashboard</h4>
              <p>View live F1 session data and basic predictions</p>
              <ul>
                <li>Select event (like "Austria" or "Britain")</li>
                <li>Choose session (Practice, Qualifying, Race)</li>
                <li>See driver performance and weather</li>
              </ul>
            </div>
            <div className="page-section">
              <h4>🧠 AI Strategy</h4>
              <p><strong>Main feature!</strong> Compare tire strategies</p>
              <ul>
                <li>Perfect for "what-if" scenarios</li>
                <li>Use during live races to predict optimal pit windows</li>
                <li>Experiment with different conditions</li>
              </ul>
            </div>
            <div className="page-section">
              <h4>⚔️ Compare</h4>
              <p>Head-to-head driver analysis</p>
              <ul>
                <li>Compare two drivers' lap times</li>
                <li>See consistency and pace differences</li>
              </ul>
            </div>
            <div className="page-section">
              <h4>📅 Schedule</h4>
              <p>Full F1 calendar with session times</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🚀 Ready to Start!",
      content: (
        <div>
          <div className="quick-start">
            <h4>Quick Start Guide:</h4>
            <ol className="start-steps">
              <li>
                <strong>Try the AI Strategy Analyzer</strong>
                <p>Click "🧠 AI Strategy" in the top menu</p>
              </li>
              <li>
                <strong>Use a Real Scenario</strong>
                <p>Hamilton at Silverstone, lap 25, compare Medium vs Hard strategies</p>
              </li>
              <li>
                <strong>Experiment!</strong>
                <p>Try different drivers, tracks, and conditions</p>
              </li>
            </ol>
          </div>
          <div className="pro-tips">
            <h4>💡 Pro Tips:</h4>
            <ul>
              <li>Higher track temperature = more tire degradation</li>
              <li>Monaco is easier on tires than Silverstone</li>
              <li>Hamilton and Alonso are the best tire managers</li>
              <li>Soft tires are 2x faster to degrade than mediums</li>
              <li>Later pit stops mean less fuel weight but older tires</li>
            </ul>
          </div>
          <div className="real-world">
            <h4>🏁 Real F1 Usage:</h4>
            <p>This is similar to what actual F1 teams use during races to make split-second strategy decisions worth millions of dollars!</p>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  return (
    <div className="welcome-guide-overlay">
      <div className="welcome-guide">
        <div className="guide-header">
          <h2>{steps[currentStep].title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="guide-content">
          {steps[currentStep].content}
        </div>

        <div className="guide-navigation">
          <div className="step-indicators">
            {steps.map((_, index) => (
              <button
                key={index}
                className={`step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => goToStep(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="nav-buttons">
            <button 
              className="nav-btn prev" 
              onClick={prevStep} 
              disabled={currentStep === 0}
            >
              ← Previous
            </button>
            
            {currentStep === steps.length - 1 ? (
              <button className="nav-btn finish" onClick={onClose}>
                🏁 Start Using F1 AI Pitwall!
              </button>
            ) : (
              <button className="nav-btn next" onClick={nextStep}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .welcome-guide-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .welcome-guide {
          background: white;
          border-radius: 15px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .guide-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 25px 30px;
          border-bottom: 2px solid #e74c3c;
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          border-radius: 15px 15px 0 0;
        }

        .guide-header h2 {
          margin: 0;
          font-size: 24px;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .close-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .guide-content {
          padding: 30px;
          min-height: 400px;
          line-height: 1.6;
        }

        .guide-content p {
          margin-bottom: 15px;
          color: #333;
        }

        .guide-content ul, .guide-content ol {
          margin: 15px 0;
          padding-left: 25px;
        }

        .guide-content li {
          margin-bottom: 8px;
          color: #555;
        }

        .highlight {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
          padding: 15px;
          border-radius: 8px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
        }

        .feature-demo {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 4px solid #e74c3c;
        }

        .demo-scenario {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 2px solid #e74c3c;
        }

        .demo-scenario h4 {
          color: #e74c3c;
          margin: 0 0 10px 0;
        }

        .demo-steps ol {
          margin: 0;
        }

        .demo-steps ul {
          margin: 10px 0;
        }

        .tip {
          background: #2ecc71;
          color: white;
          padding: 12px 15px;
          border-radius: 8px;
          margin: 15px 0;
          font-weight: bold;
        }

        .results-guide {
          display: grid;
          gap: 20px;
          margin: 20px 0;
        }

        .metric-explanation {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #3498db;
        }

        .metric-explanation h4 {
          color: #2c3e50;
          margin: 0 0 10px 0;
        }

        .soft-tire {
          background: #e74c3c;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: bold;
        }

        .medium-tire {
          background: #f39c12;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: bold;
        }

        .hard-tire {
          background: #95a5a6;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: bold;
        }

        .page-guide {
          display: grid;
          gap: 20px;
          margin: 20px 0;
        }

        .page-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #9b59b6;
        }

        .page-section h4 {
          color: #8e44ad;
          margin: 0 0 10px 0;
        }

        .quick-start {
          background: #2ecc71;
          color: white;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }

        .quick-start h4 {
          margin: 0 0 15px 0;
        }

        .start-steps {
          margin: 0;
        }

        .start-steps li {
          margin-bottom: 15px;
        }

        .start-steps strong {
          display: block;
          margin-bottom: 5px;
        }

        .pro-tips {
          background: #3498db;
          color: white;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }

        .pro-tips h4 {
          margin: 0 0 15px 0;
        }

        .real-world {
          background: #e74c3c;
          color: white;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: center;
        }

        .real-world h4 {
          margin: 0 0 10px 0;
        }

        .guide-navigation {
          padding: 25px 30px;
          border-top: 1px solid #ecf0f1;
          background: #f8f9fa;
          border-radius: 0 0 15px 15px;
        }

        .step-indicators {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #bdc3c7;
          background: white;
          color: #7f8c8d;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }

        .step-indicator.active {
          border-color: #e74c3c;
          background: #e74c3c;
          color: white;
          transform: scale(1.1);
        }

        .step-indicator.completed {
          border-color: #27ae60;
          background: #27ae60;
          color: white;
        }

        .nav-buttons {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .nav-btn {
          padding: 12px 25px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 120px;
        }

        .nav-btn.prev {
          background: #95a5a6;
          color: white;
        }

        .nav-btn.prev:hover:not(:disabled) {
          background: #7f8c8d;
          transform: translateY(-2px);
        }

        .nav-btn.prev:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-btn.next {
          background: #3498db;
          color: white;
        }

        .nav-btn.next:hover {
          background: #2980b9;
          transform: translateY(-2px);
        }

        .nav-btn.finish {
          background: linear-gradient(135deg, #27ae60, #2ecc71);
          color: white;
          font-size: 18px;
          padding: 15px 30px;
        }

        .nav-btn.finish:hover {
          background: linear-gradient(135deg, #229954, #27ae60);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .welcome-guide {
            margin: 10px;
            max-height: 95vh;
          }

          .guide-header {
            padding: 20px;
          }

          .guide-header h2 {
            font-size: 20px;
          }

          .guide-content {
            padding: 20px;
            min-height: 300px;
          }

          .results-guide {
            grid-template-columns: 1fr;
          }

          .nav-buttons {
            flex-direction: column;
          }

          .nav-btn {
            width: 100%;
            margin-bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeGuide;