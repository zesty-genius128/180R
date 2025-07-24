"""
Intelligent Strategy Training API Endpoints
==========================================

Additional endpoints for the intelligent training system.
These are added separately to avoid conflicts with the main strategy_engine.py file.
"""

from flask import Blueprint, request, jsonify
from .intelligent_strategy_trainer import IntelligentF1StrategyTrainer
from .pit_strategy_rl import PitStrategyQLearning, F1RaceEnvironment
import os
import json
from datetime import datetime

# Create Blueprint for intelligent training endpoints
intelligent_blueprint = Blueprint('intelligent', __name__, url_prefix='/api/ml')

@intelligent_blueprint.route('/train-intelligent-strategy', methods=['POST'])
def train_intelligent_strategy():
    """
    Train RL strategy using real F1 team methodology.
    
    This approach mimics how teams like Mercedes and Red Bull prepare:
    1. Use historical track-specific data as baseline
    2. Adjust for current season car performance trends  
    3. Account for championship pressure and race number
    4. Train multiple scenarios (conservative/aggressive/balanced)
    
    POST /api/ml/train-intelligent-strategy
    {
        "track": "Spa",
        "race_number": 13,
        "episodes_per_scenario": 30,
        "focus_drivers": ["HAM", "VER", "LEC", "NOR"]
    }
    """
    try:
        data = request.get_json() or {}
        
        track = data.get('track', 'Spa')
        race_number = data.get('race_number', 13)  # Spa is typically race 13
        episodes_per_scenario = data.get('episodes_per_scenario', 30)
        focus_drivers = data.get('focus_drivers', ['HAM', 'VER', 'LEC', 'NOR', 'RUS'])
        
        print(f"🧠 Starting intelligent strategy training for {track} (Race #{race_number})")
        
        # Initialize intelligent trainer
        trainer = IntelligentF1StrategyTrainer()
        
        # Train the model with intelligent scenarios
        agent, training_results = trainer.train_intelligent_strategy_model(
            track=track,
            race_number=race_number,
            episodes_per_scenario=episodes_per_scenario
        )
        
        # Save the intelligently trained model
        os.makedirs('ml_models/models', exist_ok=True)
        model_path = f'ml_models/models/intelligent_strategy_{track.lower()}_race{race_number}.pkl'
        agent.save_model(model_path)
        
        # Also update the main RL model for general use
        agent.save_model('ml_models/models/pit_strategy_rl.pkl')
        
        # Save training insights
        insights_path = f'ml_models/models/training_insights_{track.lower()}_race{race_number}.json'
        with open(insights_path, 'w') as f:
            json.dump(training_results, f, indent=2, default=str)
        
        return jsonify({
            'status': 'success',
            'message': f'Intelligent strategy model trained for {track} (Race #{race_number})',
            'training_methodology': 'Real F1 Team Approach',
            'scenarios_trained': training_results['scenarios_trained'],
            'total_episodes': training_results['overall_performance']['total_episodes'],
            'track_insights': {
                'optimal_pit_window': training_results['track_specific_insights']['optimal_pit_window'],
                'average_pit_stops': round(training_results['track_specific_insights']['average_pit_stops'], 1),
                'fastest_strategy_time': round(training_results['track_specific_insights']['fastest_strategy_time'], 1),
                'compound_preferences': training_results['track_specific_insights']['most_common_compounds']
            },
            'season_context': {
                'race_number': race_number,
                'championship_pressure': round(race_number / 24.0, 2),
                'development_phase': trainer.get_current_season_context(race_number)['development_phase']
            },
            'model_paths': {
                'intelligent_model': model_path,
                'general_model': 'ml_models/models/pit_strategy_rl.pkl',
                'insights': insights_path
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error in intelligent training: {e}")
        return jsonify({'error': str(e)}), 500

@intelligent_blueprint.route('/intelligent-strategy-prediction', methods=['POST'])
def predict_intelligent_strategy():
    """
    Get strategy prediction using intelligent training approach.
    
    This considers:
    - Historical track performance
    - Current season car development
    - Driver-specific adaptations
    - Championship context
    
    POST /api/ml/intelligent-strategy-prediction
    {
        "driver": "HAM",
        "track": "Spa", 
        "race_number": 13,
        "strategy_type": "balanced",
        "race_conditions": {
            "starting_position": 3,
            "weather": "dry",
            "championship_position": 2
        }
    }
    """
    try:
        data = request.get_json()
        
        driver = data.get('driver', 'HAM')
        track = data.get('track', 'Spa')
        race_number = data.get('race_number', 13)
        strategy_type = data.get('strategy_type', 'balanced')  # conservative, aggressive, balanced
        race_conditions = data.get('race_conditions', {})
        
        # Initialize trainer to get season context and adjustments
        trainer = IntelligentF1StrategyTrainer()
        
        # Get current season context
        season_context = trainer.get_current_season_context(race_number)
        driver_performance = trainer.adjust_driver_performance_for_season(driver, race_number)
        
        # Try to load track-specific intelligent model first
        intelligent_model_path = f'ml_models/models/intelligent_strategy_{track.lower()}_race{race_number}.pkl'
        
        # Initialize RL agent and environment
        from .tire_degradation import TireDegradationPredictor
        tire_predictor = TireDegradationPredictor()
        env = F1RaceEnvironment(tire_predictor)
        agent = PitStrategyQLearning()
        
        # Try to load intelligent model first, fall back to general
        if os.path.exists(intelligent_model_path):
            try:
                agent.load_model(intelligent_model_path)
                model_type = f"Intelligent ({track} Race #{race_number})"
                print(f"📊 Using intelligent model for {track}")
            except:
                # Fall back to general model
                general_model_path = 'ml_models/models/pit_strategy_rl.pkl'
                if os.path.exists(general_model_path):
                    agent.load_model(general_model_path)
                model_type = "General RL Model"
                print(f"⚠️ Fell back to general RL model")
        else:
            # Try general model
            general_model_path = 'ml_models/models/pit_strategy_rl.pkl'
            if os.path.exists(general_model_path):
                agent.load_model(general_model_path)
                model_type = "General RL Model"
                print(f"ℹ️ No intelligent model found for {track}, using general model")
        
        if agent.episode_count == 0:
            return jsonify({
                'error': 'No trained model available. Use /api/ml/train-intelligent-strategy first.'
            }), 400
        
        # Reset environment with intelligent parameters
        env.reset(driver, track)
        
        # Apply race conditions
        if 'starting_position' in race_conditions:
            env.track_position = race_conditions['starting_position']
        
        # Adjust strategy based on type and championship context
        if strategy_type == 'aggressive' or season_context['championship_pressure'] > 0.8:
            # More aggressive when championship is on the line
            env.track_position = max(env.track_position, 6)  # Assume need to make up positions
        elif strategy_type == 'conservative' and season_context['championship_pressure'] < 0.3:
            # Conservative early season
            env.track_position = min(env.track_position, 5)  # Assume good starting position
        
        # Get strategy prediction
        strategy, race_summary = agent.predict_strategy(env, driver, track, verbose=False)
        
        # Enhanced analysis based on intelligent training
        strategy_analysis = {
            'strategy_rationale': f"Based on {track} historical data and Race #{race_number} context",
            'driver_adaptation': f"Driver performance adjusted for season trend: {driver_performance['season_adaptation']:.2f}",
            'championship_factor': f"Championship pressure: {season_context['championship_pressure']:.1%}",
            'development_impact': f"Car development phase: {season_context['development_phase']}"
        }
        
        # Load track-specific insights if available
        insights_path = f'ml_models/models/training_insights_{track.lower()}_race{race_number}.json'
        track_insights = {}
        if os.path.exists(insights_path):
            try:
                with open(insights_path, 'r') as f:
                    training_data = json.load(f)
                    track_insights = training_data.get('track_specific_insights', {})
            except:
                pass
        
        return jsonify({
            'driver': driver,
            'track': track,
            'race_number': race_number,
            'strategy_type': strategy_type,
            'model_type': model_type,
            'season_context': season_context,
            'driver_performance': driver_performance,
            'predicted_strategy': strategy,
            'race_summary': {
                'total_race_time': round(race_summary['total_time'], 1),
                'total_pit_stops': race_summary['pit_stops'],
                'final_position': race_summary['final_position'],
                'average_lap_time': round(race_summary['average_lap_time'], 2),
                'strategy_quality': 'Excellent' if race_summary['total_time'] < 5000 else 
                                  'Good' if race_summary['total_time'] < 5400 else
                                  'Average' if race_summary['total_time'] < 5800 else 'Poor'
            },
            'strategy_analysis': strategy_analysis,
            'track_insights': track_insights,
            'pit_recommendations': [
                {
                    'lap': pit['lap'],
                    'recommendation': f"Pit for {pit['compound']} tires",
                    'reasoning': f"Optimal for {strategy_type} strategy at {track} based on historical data",
                    'championship_context': f"Race #{race_number}/24 - {season_context['development_phase']}"
                } for pit in strategy
            ],
            'confidence_factors': {
                'model_training': 'High' if agent.episode_count > 300 else 'Medium',
                'track_specific': 'High' if os.path.exists(intelligent_model_path) else 'General',
                'season_context': 'Applied' if race_number > 1 else 'Limited'
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error in intelligent prediction: {e}")
        return jsonify({'error': str(e)}), 500