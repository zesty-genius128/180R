"""
F1 Strategy Engine API
======================

Flask API endpoints for F1 strategy analysis and tire degradation predictions.
"""

from flask import Blueprint, request, jsonify
from .tire_degradation import TireDegradationPredictor
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