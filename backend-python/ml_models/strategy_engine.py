"""
F1 Strategy Engine API
======================

Flask API endpoints for F1 strategy analysis and tire degradation predictions.
"""

from flask import Blueprint, request, jsonify
from .tire_degradation import TireDegradationPredictor
from .pit_strategy_rl import PitStrategyQLearning, F1RaceEnvironment
import os
import json
from datetime import datetime

# Create Blueprint for ML endpoints
ml_blueprint = Blueprint('ml', __name__, url_prefix='/api/ml')

# Initialize tire predictor (singleton)
tire_predictor = None

def get_tire_predictor():
    """Get or initialize tire degradation predictor."""
    global tire_predictor
    if tire_predictor is None:
        tire_predictor = TireDegradationPredictor()
        
        # Try to load pre-trained model
        model_path = 'ml_models/models/tire_degradation_model.pkl'
        if os.path.exists(model_path):
            tire_predictor.load_model(model_path)
        else:
            print("📚 No pre-trained model found. Use /api/ml/train-tire-model to train one.")
    
    return tire_predictor

@ml_blueprint.route('/tire-degradation', methods=['POST'])
def predict_tire_degradation():
    """
    Predict tire degradation for given conditions.
    
    POST /api/ml/tire-degradation
    {
        "tire_age": 20,
        "compound": "MEDIUM",
        "driver": "HAM",
        "track": "Britain",
        "track_temp": 42,
        "lap_number": 30,
        "fuel_load": 50
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['tire_age', 'compound', 'driver', 'track']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        predictor = get_tire_predictor()
        
        # Get prediction
        degradation = predictor.predict_degradation(
            tire_age=data['tire_age'],
            compound=data['compound'],
            driver=data['driver'],
            track=data['track'],
            track_temp=data.get('track_temp', 35),
            lap_number=data.get('lap_number', 10),
            fuel_load=data.get('fuel_load', 50)
        )
        
        return jsonify({
            'degradation_seconds': round(degradation, 2),
            'is_ml_prediction': predictor.is_trained,
            'prediction_type': 'ML Model' if predictor.is_trained else 'Fallback Formula',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ml_blueprint.route('/tire-strategy', methods=['POST'])
def analyze_tire_strategy():
    """
    Analyze different tire strategies for a race scenario.
    
    POST /api/ml/tire-strategy
    {
        "driver": "HAM",
        "track": "Britain",
        "current_lap": 25,
        "strategies": [
            {"name": "1-Stop Medium", "pit_lap": 35, "compound": "MEDIUM"},
            {"name": "2-Stop Soft", "pit_laps": [20, 40], "compounds": ["SOFT", "SOFT"]}
        ],
        "conditions": {
            "track_temp": 45,
            "race_laps": 52
        }
    }
    """
    try:
        data = request.get_json()
        predictor = get_tire_predictor()
        
        driver = data.get('driver', 'HAM')
        track = data.get('track', 'Britain')
        current_lap = data.get('current_lap', 1)
        strategies = data.get('strategies', [])
        conditions = data.get('conditions', {})
        
        track_temp = conditions.get('track_temp', 35)
        race_laps = conditions.get('race_laps', 50)
        
        strategy_analysis = []
        
        for strategy in strategies:
            strategy_name = strategy.get('name', 'Unknown Strategy')
            
            # Analyze single pit stop strategy
            if 'pit_lap' in strategy:
                pit_lap = strategy['pit_lap']
                compound = strategy['compound']
                
                # Calculate degradation for each stint
                stint1_laps = pit_lap - current_lap
                stint2_laps = race_laps - pit_lap
                
                # Stint 1 degradation
                stint1_degradation = predictor.predict_degradation(
                    tire_age=stint1_laps,
                    compound=compound,
                    driver=driver,
                    track=track,
                    track_temp=track_temp,
                    lap_number=current_lap + stint1_laps // 2,
                    fuel_load=80 - (current_lap * 1.5)
                )
                
                # Stint 2 degradation
                stint2_degradation = predictor.predict_degradation(
                    tire_age=stint2_laps,
                    compound=compound,
                    driver=driver,
                    track=track,
                    track_temp=track_temp,
                    lap_number=pit_lap + stint2_laps // 2,
                    fuel_load=40 - (stint2_laps * 1.5)
                )
                
                # Estimate total time loss
                pit_stop_time = 24.0  # Average pit stop time
                total_degradation = stint1_degradation + stint2_degradation
                estimated_time_loss = pit_stop_time + total_degradation
                
                strategy_analysis.append({
                    'name': strategy_name,
                    'type': '1-stop',
                    'pit_lap': pit_lap,
                    'compound': compound,
                    'stint1_degradation': round(stint1_degradation, 2),
                    'stint2_degradation': round(stint2_degradation, 2),
                    'total_degradation': round(total_degradation, 2),
                    'pit_stop_time': pit_stop_time,
                    'estimated_time_loss': round(estimated_time_loss, 2),
                    'recommendation': 'Good' if estimated_time_loss < 30 else 'Consider alternatives'
                })
        
        return jsonify({
            'driver': driver,
            'track': track,
            'current_lap': current_lap,
            'conditions': conditions,
            'strategy_analysis': strategy_analysis,
            'best_strategy': min(strategy_analysis, key=lambda x: x['estimated_time_loss']) if strategy_analysis else None,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ml_blueprint.route('/train-tire-model', methods=['POST'])
def train_tire_model():
    """
    Train the tire degradation model with historical data.
    
    POST /api/ml/train-tire-model
    {
        "years": [2023, 2024],
        "max_events_per_year": 5
    }
    """
    try:
        data = request.get_json() or {}
        years = data.get('years', [2023, 2024])
        max_events = data.get('max_events_per_year', 3)  # Reduced for demo
        
        predictor = get_tire_predictor()
        
        # This will take several minutes
        print(f"🏁 Starting tire model training for years {years}...")
        success = predictor.train()
        
        if success:
            # Save the trained model
            os.makedirs('ml_models/models', exist_ok=True)
            predictor.save_model('ml_models/models/tire_degradation_model.pkl')
            
            return jsonify({
                'status': 'success',
                'message': 'Tire degradation model trained successfully',
                'model_trained': True,
                'training_years': years,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to train tire degradation model',
                'model_trained': False
            }), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ml_blueprint.route('/model-status', methods=['GET'])
def get_model_status():
    """Get status of ML models."""
    predictor = get_tire_predictor()
    
    return jsonify({
        'tire_model_trained': predictor.is_trained,
        'available_compounds': list(predictor.compound_base_degradation.keys()),
        'supported_drivers': list(predictor.driver_tire_skills.keys()),
        'model_type': 'Gradient Boosting Regressor',
        'timestamp': datetime.now().isoformat()
    })

@ml_blueprint.route('/tire-compounds', methods=['GET'])
def get_tire_compounds():
    """Get tire compound information and characteristics."""
    predictor = get_tire_predictor()
    
    compound_info = {}
    for compound, base_rate in predictor.compound_base_degradation.items():
        compound_info[compound] = {
            'base_degradation_rate': base_rate,
            'characteristics': {
                'SOFT': 'Fastest lap times, high degradation, 10-25 lap stints',
                'MEDIUM': 'Balanced performance, moderate degradation, 20-35 lap stints',
                'HARD': 'Slowest but most durable, low degradation, 30-50 lap stints',
                'INTERMEDIATE': 'For light wet conditions, high degradation',
                'WET': 'For heavy rain, very high degradation'
            }.get(compound, 'Unknown compound characteristics')
        }
    
    return jsonify({
        'compounds': compound_info,
        'optimal_strategy_guide': {
            'short_race': 'SOFT for speed, accept higher degradation',
            'medium_race': 'MEDIUM for balance of speed and durability',
            'long_race': 'HARD for consistency, plan 1-stop strategy',
            'wet_conditions': 'INTERMEDIATE → WET as conditions worsen'
        }
    })

@ml_blueprint.route('/driver-skills', methods=['GET'])
def get_driver_skills():
    """Get driver tire management skill ratings."""
    predictor = get_tire_predictor()
    
    # Sort drivers by tire skill (best first)
    sorted_drivers = sorted(
        predictor.driver_tire_skills.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    driver_rankings = []
    for i, (driver, skill) in enumerate(sorted_drivers):
        driver_rankings.append({
            'rank': i + 1,
            'driver': driver,
            'tire_management_skill': skill,
            'skill_level': 'Excellent' if skill > 0.9 else 'Good' if skill > 0.85 else 'Average'
        })
    
    return jsonify({
        'driver_rankings': driver_rankings,
        'skill_explanation': 'Tire management skill affects degradation rate. Higher skill = slower tire wear.',
        'top_3_tire_managers': [d['driver'] for d in driver_rankings[:3]]
    })

# ===== REINFORCEMENT LEARNING PIT STRATEGY ENDPOINTS =====

# Initialize RL agent (singleton)
rl_agent = None
rl_environment = None

def get_rl_agent():
    """Get or initialize RL agent."""
    global rl_agent, rl_environment
    if rl_agent is None:
        tire_predictor = get_tire_predictor()
        rl_environment = F1RaceEnvironment(tire_predictor)
        rl_agent = PitStrategyQLearning()
        
        # Try to load pre-trained RL model
        rl_model_path = 'ml_models/models/pit_strategy_rl.pkl'
        if os.path.exists(rl_model_path):
            rl_agent.load_model(rl_model_path)
        else:
            print("🤖 No pre-trained RL model found. Use /api/ml/train-rl-strategy to train one.")
    
    return rl_agent, rl_environment

@ml_blueprint.route('/train-rl-strategy', methods=['POST'])
def train_rl_strategy():
    """
    Train the reinforcement learning agent for pit strategy optimization.
    
    POST /api/ml/train-rl-strategy
    {
        "episodes": 1000,
        "drivers": ["HAM", "VER", "LEC"],
        "tracks": ["Silverstone", "Monaco", "Spa"]
    }
    """
    try:
        data = request.get_json() or {}
        episodes = data.get('episodes', 500)  # Reduced for demo
        drivers = data.get('drivers', ['HAM', 'VER', 'LEC', 'NOR', 'RUS'])
        tracks = data.get('tracks', ['Silverstone', 'Monaco', 'Spain', 'Italy'])
        
        print(f"🚀 Starting RL training for {episodes} episodes...")
        
        # Get agent and environment
        agent, env = get_rl_agent()
        
        # Train the agent
        best_strategy = agent.train(
            episodes=episodes,
            env=env,
            drivers=drivers,
            tracks=tracks
        )
        
        # Save the trained model
        os.makedirs('ml_models/models', exist_ok=True)
        agent.save_model('ml_models/models/pit_strategy_rl.pkl')
        
        return jsonify({
            'status': 'success',
            'message': f'RL agent trained successfully for {episodes} episodes',
            'episodes_completed': agent.episode_count,
            'best_race_time': round(best_strategy['total_time'], 1),
            'best_pit_stops': best_strategy['pit_stops'],
            'training_drivers': drivers,
            'training_tracks': tracks,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ml_blueprint.route('/rl-strategy-prediction', methods=['POST'])
def predict_rl_strategy():
    """
    Predict optimal pit strategy using trained RL agent.
    
    POST /api/ml/rl-strategy-prediction
    {
        "driver": "HAM",
        "track": "Silverstone",
        "race_conditions": {
            "weather": "dry",
            "track_temp": 42,
            "starting_position": 3
        }
    }
    """
    try:
        data = request.get_json()
        driver = data.get('driver', 'HAM')
        track = data.get('track', 'Silverstone')
        conditions = data.get('race_conditions', {})
        
        # Get trained agent and environment
        agent, env = get_rl_agent()
        
        if agent.episode_count == 0:
            return jsonify({
                'error': 'RL agent not trained yet. Use /api/ml/train-rl-strategy first.'
            }), 400
        
        # Reset environment with specified conditions
        env.reset(driver, track)
        if 'starting_position' in conditions:
            env.track_position = conditions['starting_position']
        
        # Get strategy prediction
        strategy, race_summary = agent.predict_strategy(env, driver, track, verbose=False)
        
        # Analyze strategy quality
        strategy_quality = 'Excellent'
        if race_summary['total_time'] > 6000:  # > 100 minutes
            strategy_quality = 'Poor'
        elif race_summary['total_time'] > 5400:  # > 90 minutes
            strategy_quality = 'Average'
        elif race_summary['total_time'] > 5000:  # > 83 minutes
            strategy_quality = 'Good'
        
        return jsonify({
            'driver': driver,
            'track': track,
            'conditions': conditions,
            'predicted_strategy': strategy,
            'race_summary': {
                'total_race_time': round(race_summary['total_time'], 1),
                'total_pit_stops': race_summary['pit_stops'],
                'final_position': race_summary['final_position'],
                'average_lap_time': round(race_summary['average_lap_time'], 2),
                'strategy_quality': strategy_quality
            },
            'pit_recommendations': [
                {
                    'lap': pit['lap'],
                    'recommendation': f"Pit for {pit['compound']} tires",
                    'reasoning': f"Optimal timing based on tire degradation and track position"
                } for pit in strategy
            ],
            'model_confidence': 'High' if agent.episode_count > 500 else 'Medium',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ml_blueprint.route('/rl-model-status', methods=['GET'])
def get_rl_model_status():
    """Get status of RL model training."""
    try:
        agent, env = get_rl_agent()
        
        # Calculate training statistics
        if agent.training_rewards:
            avg_reward = sum(agent.training_rewards[-100:]) / min(len(agent.training_rewards), 100)
            best_time = min(agent.training_times) if agent.training_times else None
            avg_time = sum(agent.training_times[-100:]) / min(len(agent.training_times), 100) if agent.training_times else None
        else:
            avg_reward = 0
            best_time = None
            avg_time = None
        
        return jsonify({
            'rl_model_trained': agent.episode_count > 0,
            'episodes_completed': agent.episode_count,
            'current_epsilon': round(agent.epsilon, 3),
            'training_progress': {
                'recent_avg_reward': round(avg_reward, 2) if avg_reward else 0,
                'best_race_time': round(best_time, 1) if best_time else None,
                'recent_avg_time': round(avg_time, 1) if avg_time else None
            },
            'agent_parameters': {
                'learning_rate': agent.learning_rate,
                'discount_factor': agent.discount_factor,
                'exploration_rate': round(agent.epsilon, 3)
            },
            'environment_info': {
                'race_length': env.total_laps,
                'pit_stop_time': env.pit_stop_time,
                'tire_compounds': list(env.tire_compounds.values())
            },
            'model_type': 'Q-Learning with Experience Replay',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ml_blueprint.route('/strategy-comparison', methods=['POST'])
def compare_strategies():
    """
    Compare traditional strategy analysis with RL-optimized strategy.
    
    POST /api/ml/strategy-comparison
    {
        "driver": "HAM",
        "track": "Silverstone",
        "traditional_strategies": [
            {"name": "1-Stop Medium", "pit_lap": 35, "compound": "MEDIUM"}
        ]
    }
    """
    try:
        data = request.get_json()
        driver = data.get('driver', 'HAM')
        track = data.get('track', 'Silverstone')
        traditional_strategies = data.get('traditional_strategies', [])
        
        # Get RL prediction
        agent, env = get_rl_agent()
        
        if agent.episode_count == 0:
            return jsonify({
                'error': 'RL agent not trained yet. Use /api/ml/train-rl-strategy first.'
            }), 400
        
        # Get RL strategy
        rl_strategy, rl_summary = agent.predict_strategy(env, driver, track, verbose=False)
        
        # Analyze traditional strategies using existing tire model
        predictor = get_tire_predictor()
        traditional_analysis = []
        
        for strategy in traditional_strategies:
            if 'pit_lap' in strategy:
                pit_lap = strategy['pit_lap']
                compound = strategy['compound']
                
                # Simple traditional analysis
                stint1_degradation = predictor.predict_degradation(
                    tire_age=pit_lap,
                    compound=compound,
                    driver=driver,
                    track=track,
                    track_temp=35,
                    lap_number=pit_lap // 2,
                    fuel_load=80
                )
                
                stint2_degradation = predictor.predict_degradation(
                    tire_age=70 - pit_lap,
                    compound=compound,
                    driver=driver,
                    track=track,
                    track_temp=35,
                    lap_number=pit_lap + (70 - pit_lap) // 2,
                    fuel_load=40
                )
                
                estimated_time = (85.0 * 70) + stint1_degradation + stint2_degradation + 24.0
                
                traditional_analysis.append({
                    'name': strategy['name'],
                    'estimated_total_time': round(estimated_time, 1),
                    'pit_lap': pit_lap,
                    'compound': compound,
                    'methodology': 'Traditional tire degradation model'
                })
        
        return jsonify({
            'comparison_summary': {
                'driver': driver,
                'track': track,
                'rl_strategy': {
                    'total_time': round(rl_summary['total_time'], 1),
                    'pit_stops': rl_summary['pit_stops'],
                    'pit_schedule': rl_strategy,
                    'methodology': 'Reinforcement Learning (Q-Learning)'
                },
                'traditional_strategies': traditional_analysis,
                'winner': 'RL Strategy' if not traditional_analysis or 
                         rl_summary['total_time'] < min(s['estimated_total_time'] for s in traditional_analysis)
                         else 'Traditional Strategy',
                'time_difference': round(
                    min(s['estimated_total_time'] for s in traditional_analysis) - rl_summary['total_time'], 1
                ) if traditional_analysis else 0
            },
            'analysis': {
                'rl_advantages': [
                    'Learns from thousands of race simulations',
                    'Adapts to dynamic race conditions',
                    'Considers track position and traffic',
                    'Optimizes for total race time, not just tire life'
                ],
                'traditional_advantages': [
                    'Based on proven tire degradation models',
                    'More predictable and interpretable',
                    'Doesn\'t require extensive training',
                    'Easier to understand reasoning'
                ]
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500