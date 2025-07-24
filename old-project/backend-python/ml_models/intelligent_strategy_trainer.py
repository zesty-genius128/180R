"""
Intelligent F1 Strategy Training System
=====================================

This module implements a more realistic F1 strategy training approach that mimics
how real F1 teams develop race strategies:

1. Use historical track-specific data as baseline
2. Adjust for current season team performance trends
3. Account for car development trajectory throughout season
4. Consider driver-specific adaptations to car characteristics

Real F1 teams like Mercedes, Red Bull, and Ferrari use exactly this approach:
- Historical tire performance at each track
- Current season car performance relative to competitors
- Driver adaptation patterns throughout the season
- Track-specific setup and strategy adjustments
"""

import numpy as np
import pandas as pd
import pickle
import random
from collections import defaultdict, deque
from datetime import datetime, timedelta
import json
from typing import Dict, List, Tuple, Optional

from .tire_degradation import TireDegradationPredictor
from .pit_strategy_rl import F1RaceEnvironment, PitStrategyQLearning


class IntelligentF1StrategyTrainer:
    """
    Advanced F1 strategy trainer that uses real team methodologies.
    
    Mimics how teams like Mercedes analyze strategy:
    1. Historical baseline from previous seasons at each track
    2. Current season performance adjustments
    3. Car development curve impact
    4. Driver-specific adaptations
    """
    
    def __init__(self):
        self.tire_predictor = TireDegradationPredictor()
        
        # F1 2025 Season - Complete track baselines for all 24 races
        # This represents the "database" that real F1 teams build up over years
        self.track_baselines = {
            # === ROUND 1-6: SEASON OPENING ===
            'Melbourne': {  # Australian GP
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.5,
                'typical_race_time': 5400,
                'weather_risk': 0.2
            },
            'Shanghai': {  # Chinese GP
                'optimal_pit_windows': [32, 40],
                'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.4,
                'typical_race_time': 5500,
                'weather_risk': 0.3
            },
            'Sakhir': {  # Bahrain GP
                'optimal_pit_windows': [28, 36],
                'compound_preference': {'MEDIUM': 0.3, 'HARD': 0.7},
                'track_evolution': 0.2,
                'tire_degradation_severity': 0.9,  # Very harsh on tires
                'overtaking_difficulty': 0.3,
                'typical_race_time': 5200,
                'weather_risk': 0.1
            },
            'Jeddah': {  # Saudi Arabian GP
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.6,  # Tight street circuit
                'typical_race_time': 4900,
                'weather_risk': 0.1
            },
            'Miami': {  # Miami GP
                'optimal_pit_windows': [32, 40],
                'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.5,
                'typical_race_time': 5300,
                'weather_risk': 0.4
            },
            'Imola': {  # Emilia Romagna GP
                'optimal_pit_windows': [35, 42],
                'compound_preference': {'MEDIUM': 0.6, 'HARD': 0.4},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.6,
                'overtaking_difficulty': 0.8,  # Very difficult to overtake
                'typical_race_time': 5400,
                'weather_risk': 0.3
            },
            
            # === ROUND 7-12: EUROPEAN SWING ===
            'Monaco': {  # Monaco GP
                'optimal_pit_windows': [45, 55],  # Very late pits due to low degradation
                'compound_preference': {'HARD': 0.8, 'MEDIUM': 0.2},
                'track_evolution': 0.1, 
                'tire_degradation_severity': 0.3,  # Very easy on tires
                'overtaking_difficulty': 0.95,  # Nearly impossible to overtake
                'typical_race_time': 5100,
                'weather_risk': 0.1
            },
            'Barcelona': {  # Spanish GP
                'optimal_pit_windows': [25, 35],  # Earlier pits, high degradation
                'compound_preference': {'MEDIUM': 0.3, 'HARD': 0.7},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.9,  # Hard on tires
                'overtaking_difficulty': 0.4,  # Reasonable overtaking
                'typical_race_time': 5300,
                'weather_risk': 0.2
            },
            'Montreal': {  # Canadian GP
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.4,
                'typical_race_time': 5200,
                'weather_risk': 0.5
            },
            'Austria': {  # Austrian GP - Red Bull Ring
                'optimal_pit_windows': [30, 40],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.4,
                'typical_race_time': 4200,  # Short track
                'weather_risk': 0.5
            },
            'Silverstone': {  # British GP
                'optimal_pit_windows': [32, 38],  # Historical optimal pit laps
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.3,  # How much track improves during weekend
                'tire_degradation_severity': 0.8,  # Track harshness on tires
                'overtaking_difficulty': 0.6,  # How hard it is to overtake
                'typical_race_time': 5400,  # Seconds for reference
                'weather_risk': 0.4  # Rain probability factor
            },
            'Hungaroring': {  # Hungarian GP
                'optimal_pit_windows': [35, 45],
                'compound_preference': {'MEDIUM': 0.6, 'HARD': 0.4},
                'track_evolution': 0.5,
                'tire_degradation_severity': 0.6,
                'overtaking_difficulty': 0.8,  # Very difficult to overtake
                'typical_race_time': 5500,
                'weather_risk': 0.4
            },
            
            # === ROUND 13-18: SUMMER & SPA ===
            'Spa': {  # Belgian GP - Spa-Francorchamps
                'optimal_pit_windows': [28, 35],  # Early pits due to long straights
                'compound_preference': {'MEDIUM': 0.3, 'HARD': 0.7},  # Long straights favor durability
                'track_evolution': 0.5,  # Track improves significantly
                'tire_degradation_severity': 0.7,  # Moderate tire wear
                'overtaking_difficulty': 0.3,  # Easy overtaking with long straights
                'typical_race_time': 4800,  # Classic long circuit
                'weather_risk': 0.8  # Spa is famous for unpredictable weather!
            },
            'Zandvoort': {  # Dutch GP
                'optimal_pit_windows': [32, 40],
                'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.7,  # Difficult to overtake
                'typical_race_time': 5100,
                'weather_risk': 0.6
            },
            'Monza': {  # Italian GP
                'optimal_pit_windows': [28, 35],  # Monza-style strategy
                'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.3,  # Easy overtaking with DRS
                'typical_race_time': 4800,  # Faster track
                'weather_risk': 0.3
            },
            'Baku': {  # Azerbaijan GP
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.2,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.4,  # Good overtaking opportunities
                'typical_race_time': 5400,
                'weather_risk': 0.2
            },
            'Singapore': {  # Singapore GP
                'optimal_pit_windows': [35, 45],
                'compound_preference': {'MEDIUM': 0.6, 'SOFT': 0.4},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.6,  # Night race, cooler temps
                'overtaking_difficulty': 0.7,
                'typical_race_time': 6200,  # Longest race
                'weather_risk': 0.5
            },
            'Austin': {  # United States GP - COTA
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.4,
                'typical_race_time': 5300,
                'weather_risk': 0.3
            },
            
            # === ROUND 19-24: CHAMPIONSHIP FINALE ===
            'Mexico': {  # Mexico City GP
                'optimal_pit_windows': [28, 36],  # High altitude affects strategy
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.4,
                'typical_race_time': 5400,
                'weather_risk': 0.3
            },
            'Brazil': {  # São Paulo GP - Interlagos
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5},
                'track_evolution': 0.4,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.4,
                'typical_race_time': 5100,
                'weather_risk': 0.7  # Famous for rain
            },
            'Las Vegas': {  # Las Vegas GP
                'optimal_pit_windows': [32, 40],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.5,
                'typical_race_time': 5200,
                'weather_risk': 0.1  # Desert climate
            },
            'Qatar': {  # Qatar GP - Losail
                'optimal_pit_windows': [30, 38],
                'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.8,
                'overtaking_difficulty': 0.5,
                'typical_race_time': 5300,
                'weather_risk': 0.1
            },
            'Abu Dhabi': {  # Abu Dhabi GP - Yas Marina (Season Finale)
                'optimal_pit_windows': [32, 40],
                'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5},
                'track_evolution': 0.3,
                'tire_degradation_severity': 0.7,
                'overtaking_difficulty': 0.5,
                'typical_race_time': 5400,
                'weather_risk': 0.1
            },
            
            # === ALTERNATIVE TRACK NAMES ===
            'Australia': {'optimal_pit_windows': [30, 38], 'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6}, 'track_evolution': 0.4, 'tire_degradation_severity': 0.7, 'overtaking_difficulty': 0.5, 'typical_race_time': 5400, 'weather_risk': 0.2},
            'China': {'optimal_pit_windows': [32, 40], 'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5}, 'track_evolution': 0.3, 'tire_degradation_severity': 0.8, 'overtaking_difficulty': 0.4, 'typical_race_time': 5500, 'weather_risk': 0.3},
            'Bahrain': {'optimal_pit_windows': [28, 36], 'compound_preference': {'MEDIUM': 0.3, 'HARD': 0.7}, 'track_evolution': 0.2, 'tire_degradation_severity': 0.9, 'overtaking_difficulty': 0.3, 'typical_race_time': 5200, 'weather_risk': 0.1},
            'Saudi Arabia': {'optimal_pit_windows': [30, 38], 'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6}, 'track_evolution': 0.3, 'tire_degradation_severity': 0.8, 'overtaking_difficulty': 0.6, 'typical_race_time': 4900, 'weather_risk': 0.1},
            'Spain': {'optimal_pit_windows': [25, 35], 'compound_preference': {'MEDIUM': 0.3, 'HARD': 0.7}, 'track_evolution': 0.4, 'tire_degradation_severity': 0.9, 'overtaking_difficulty': 0.4, 'typical_race_time': 5300, 'weather_risk': 0.2},
            'Canada': {'optimal_pit_windows': [30, 38], 'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6}, 'track_evolution': 0.4, 'tire_degradation_severity': 0.7, 'overtaking_difficulty': 0.4, 'typical_race_time': 5200, 'weather_risk': 0.5},
            'Britain': {'optimal_pit_windows': [32, 38], 'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6}, 'track_evolution': 0.3, 'tire_degradation_severity': 0.8, 'overtaking_difficulty': 0.6, 'typical_race_time': 5400, 'weather_risk': 0.4},
            'Hungary': {'optimal_pit_windows': [35, 45], 'compound_preference': {'MEDIUM': 0.6, 'HARD': 0.4}, 'track_evolution': 0.5, 'tire_degradation_severity': 0.6, 'overtaking_difficulty': 0.8, 'typical_race_time': 5500, 'weather_risk': 0.4},
            'Belgium': {'optimal_pit_windows': [28, 35], 'compound_preference': {'MEDIUM': 0.3, 'HARD': 0.7}, 'track_evolution': 0.5, 'tire_degradation_severity': 0.7, 'overtaking_difficulty': 0.3, 'typical_race_time': 4800, 'weather_risk': 0.8},
            'Netherlands': {'optimal_pit_windows': [32, 40], 'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5}, 'track_evolution': 0.3, 'tire_degradation_severity': 0.8, 'overtaking_difficulty': 0.7, 'typical_race_time': 5100, 'weather_risk': 0.6},
            'Italy': {'optimal_pit_windows': [28, 35], 'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5}, 'track_evolution': 0.3, 'tire_degradation_severity': 0.7, 'overtaking_difficulty': 0.3, 'typical_race_time': 4800, 'weather_risk': 0.3},
            'Azerbaijan': {'optimal_pit_windows': [30, 38], 'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6}, 'track_evolution': 0.2, 'tire_degradation_severity': 0.8, 'overtaking_difficulty': 0.4, 'typical_race_time': 5400, 'weather_risk': 0.2},
            'United States': {'optimal_pit_windows': [30, 38], 'compound_preference': {'MEDIUM': 0.4, 'HARD': 0.6}, 'track_evolution': 0.4, 'tire_degradation_severity': 0.8, 'overtaking_difficulty': 0.4, 'typical_race_time': 5300, 'weather_risk': 0.3},
            'São Paulo': {'optimal_pit_windows': [30, 38], 'compound_preference': {'MEDIUM': 0.5, 'HARD': 0.5}, 'track_evolution': 0.4, 'tire_degradation_severity': 0.7, 'overtaking_difficulty': 0.4, 'typical_race_time': 5100, 'weather_risk': 0.7}
        }
        
        # Current 2025 season team performance trends
        # This would be updated after each race in real implementation
        self.team_performance_2025 = {
            'HAM': {'base_pace': 0.95, 'tire_management': 0.95, 'season_trend': 0.02},  # Improving
            'RUS': {'base_pace': 0.90, 'tire_management': 0.82, 'season_trend': 0.01},
            'VER': {'base_pace': 0.98, 'tire_management': 0.92, 'season_trend': -0.01}, # Slight decline
            'PER': {'base_pace': 0.88, 'tire_management': 0.89, 'season_trend': -0.02}, # Struggling
            'LEC': {'base_pace': 0.93, 'tire_management': 0.88, 'season_trend': 0.03},  # Strong development
            'SAI': {'base_pace': 0.91, 'tire_management': 0.85, 'season_trend': 0.01},
            'NOR': {'base_pace': 0.92, 'tire_management': 0.87, 'season_trend': 0.04},  # McLaren improving
            'PIA': {'base_pace': 0.89, 'tire_management': 0.80, 'season_trend': 0.03},  # Learning curve
            'ALO': {'base_pace': 0.94, 'tire_management': 0.93, 'season_trend': 0.00},  # Consistent veteran
            'STR': {'base_pace': 0.87, 'tire_management': 0.84, 'season_trend': 0.01}
        }
        
        # Car development phases throughout 2025 season
        # Teams bring major updates that affect strategy
        self.car_development_phases = {
            'early_season': {'races': [1, 2, 3, 4, 5], 'development_factor': 1.00},
            'first_updates': {'races': [6, 7, 8, 9], 'development_factor': 1.02},
            'mid_season': {'races': [10, 11, 12, 13, 14], 'development_factor': 1.04},
            'summer_break': {'races': [15, 16, 17], 'development_factor': 1.06},
            'championship_fight': {'races': [18, 19, 20, 21, 22, 23, 24], 'development_factor': 1.08}
        }
    
    def get_current_season_context(self, race_number: int) -> Dict:
        """
        Get current season context like real F1 teams do.
        
        Real teams analyze:
        - Where they are in the championship fight
        - Car development progress
        - Driver adaptation to current car
        """
        # Determine development phase
        development_phase = 'early_season'
        for phase, data in self.car_development_phases.items():
            if race_number in data['races']:
                development_phase = phase
                break
        
        development_factor = self.car_development_phases[development_phase]['development_factor']
        
        # Championship pressure factor (affects risk-taking)
        championship_pressure = min(1.0, race_number / 24.0)  # Increases throughout season
        
        return {
            'race_number': race_number,
            'development_phase': development_phase,
            'development_factor': development_factor,
            'championship_pressure': championship_pressure,
            'races_remaining': 24 - race_number
        }
    
    def adjust_driver_performance_for_season(self, driver: str, race_number: int) -> Dict:
        """
        Adjust driver performance based on current season trends.
        
        Real F1 example: Hamilton struggled early 2022 but improved mid-season
        as Mercedes developed the car and he adapted to it.
        """
        if driver not in self.team_performance_2025:
            # Default values for drivers not in database
            return {'base_pace': 0.85, 'tire_management': 0.80, 'season_adaptation': 1.0}
        
        driver_data = self.team_performance_2025[driver]
        
        # Calculate season adaptation factor
        # Early season: use base performance
        # Mid season: apply trend (positive = improving, negative = declining)
        season_progress = race_number / 24.0
        trend_impact = driver_data['season_trend'] * season_progress
        
        adjusted_performance = {
            'base_pace': driver_data['base_pace'] + trend_impact,
            'tire_management': driver_data['tire_management'] + (trend_impact * 0.5),
            'season_adaptation': 1.0 + trend_impact
        }
        
        # Ensure values stay within realistic bounds
        adjusted_performance['base_pace'] = np.clip(adjusted_performance['base_pace'], 0.7, 1.0)
        adjusted_performance['tire_management'] = np.clip(adjusted_performance['tire_management'], 0.7, 1.0)
        
        return adjusted_performance
    
    def create_intelligent_training_scenarios(self, track: str, race_number: int, 
                                           drivers: List[str]) -> List[Dict]:
        """
        Create training scenarios that reflect real F1 team strategy development.
        
        This is how Mercedes, Red Bull, etc. prepare for each race:
        1. Use historical data from this track
        2. Adjust for current car performance
        3. Consider championship situation
        4. Account for driver adaptations
        """
        if track not in self.track_baselines:
            track = 'Silverstone'  # Default fallback
        
        track_data = self.track_baselines[track]
        season_context = self.get_current_season_context(race_number)
        
        scenarios = []
        
        for driver in drivers:
            driver_performance = self.adjust_driver_performance_for_season(driver, race_number)
            
            # Create multiple scenarios per driver (like teams run multiple simulations)
            for scenario_type in ['conservative', 'aggressive', 'balanced']:
                
                if scenario_type == 'conservative':
                    # Risk-averse strategy (championship leader approach)
                    pit_window_modifier = 0.1  # Slightly later pits
                    compound_bias = 'HARD'     # Favor durable compounds
                    risk_factor = 0.3
                    
                elif scenario_type == 'aggressive':
                    # High-risk strategy (when behind in points)
                    pit_window_modifier = -0.1  # Earlier pits for undercut
                    compound_bias = 'SOFT'      # Favor fast compounds
                    risk_factor = 0.8
                    
                else:  # balanced
                    # Standard optimal strategy
                    pit_window_modifier = 0.0
                    compound_bias = 'MEDIUM'
                    risk_factor = 0.5
                
                # Adjust pit windows based on historical data and current context
                base_pit_windows = track_data['optimal_pit_windows']
                adjusted_pit_windows = [
                    int(window * (1 + pit_window_modifier)) for window in base_pit_windows
                ]
                
                scenario = {
                    'driver': driver,
                    'track': track,
                    'race_number': race_number,
                    'scenario_type': scenario_type,
                    'driver_performance': driver_performance,
                    'track_characteristics': track_data,
                    'season_context': season_context,
                    'optimal_pit_windows': adjusted_pit_windows,
                    'compound_preference': compound_bias,
                    'risk_factor': risk_factor,
                    'championship_pressure': season_context['championship_pressure']
                }
                
                scenarios.append(scenario)
        
        return scenarios
    
    def create_enhanced_race_environment(self, scenario: Dict) -> F1RaceEnvironment:
        """
        Create a race environment tuned to the specific scenario.
        
        This incorporates the intelligence that real F1 teams put into their
        strategy simulations.
        """
        env = F1RaceEnvironment(self.tire_predictor)
        
        # Adjust environment parameters based on scenario
        track_data = scenario['track_characteristics']
        
        # Modify tire degradation based on track and current season car performance
        env.track_data['tire_wear_severity'] = track_data['tire_degradation_severity']
        env.overtake_difficulty = track_data['overtaking_difficulty']
        
        # Adjust pit stop time based on team performance and development
        base_pit_time = 24.0
        development_bonus = (scenario['season_context']['development_factor'] - 1.0) * 10  # Better crews
        env.pit_stop_time = max(22.0, base_pit_time - development_bonus)
        
        # Set race length based on track (some tracks have different lap counts)
        if scenario['track'] == 'Monaco':
            env.total_laps = 78  # Monaco is longer due to slower speeds
        elif scenario['track'] == 'Austria':
            env.total_laps = 71   # Red Bull Ring
        else:
            env.total_laps = 70   # Standard race length
        
        return env
    
    def train_intelligent_strategy_model(self, track: str, race_number: int = 12, 
                                       episodes_per_scenario: int = 50) -> Dict:
        """
        Train RL model using intelligent F1 team methodology.
        
        This is much more realistic than generic training:
        1. Use track-specific historical data
        2. Account for current season performance
        3. Multiple scenario types (conservative/aggressive/balanced)
        4. Driver-specific adaptations
        
        Args:
            track: Target track for training (e.g., 'Silverstone')
            race_number: Current race in season (1-24, affects car development)
            episodes_per_scenario: Training episodes per scenario type
        """
        print(f"🧠 Starting Intelligent Strategy Training for {track}")
        print(f"📊 Race #{race_number}/24 - Season Context Applied")
        
        # Get drivers currently in F1
        current_drivers = ['HAM', 'VER', 'LEC', 'NOR', 'RUS', 'SAI', 'PER', 'PIA', 'ALO', 'STR']
        
        # Create training scenarios
        scenarios = self.create_intelligent_training_scenarios(track, race_number, current_drivers)
        print(f"🎯 Created {len(scenarios)} training scenarios")
        
        # Initialize RL agent
        agent = PitStrategyQLearning(
            learning_rate=0.15,    # Slightly higher for faster learning
            epsilon=0.8,           # Start with more exploration
            epsilon_decay=0.995,   # Slower decay for better exploration
            epsilon_min=0.05       # Always keep some exploration
        )
        
        training_results = {
            'scenarios_trained': [],
            'best_strategies_by_scenario': {},
            'overall_performance': {},
            'track_specific_insights': {}
        }
        
        total_episodes = 0
        
        # Train on each scenario
        for scenario in scenarios:
            scenario_name = f"{scenario['driver']}_{scenario['scenario_type']}"
            print(f"\n🏋️ Training scenario: {scenario_name}")
            
            # Create environment tuned to this scenario
            env = self.create_enhanced_race_environment(scenario)
            
            # Train for specified episodes
            scenario_results = []
            
            for episode in range(episodes_per_scenario):
                # Reset environment with scenario-specific parameters
                state = env.reset(scenario['driver'], scenario['track'])
                
                # Modify starting position based on scenario type
                if scenario['scenario_type'] == 'aggressive':
                    env.track_position = random.randint(8, 15)  # Mid-pack, need to attack
                elif scenario['scenario_type'] == 'conservative':
                    env.track_position = random.randint(1, 5)   # Front runners, defend
                else:
                    env.track_position = random.randint(3, 10)  # Balanced starting positions
                
                # Run episode
                episode_reward, race_summary = agent.train_episode(env, scenario['driver'], scenario['track'])
                scenario_results.append(race_summary)
                total_episodes += 1
                
                # Progress update
                if (episode + 1) % 20 == 0:
                    recent_times = [r['total_time'] for r in scenario_results[-10:]]
                    avg_time = np.mean(recent_times)
                    print(f"  Episode {episode + 1}: Avg time {avg_time:.1f}s")
            
            # Analyze scenario results
            best_race = min(scenario_results, key=lambda x: x['total_time'])
            training_results['scenarios_trained'].append(scenario_name)
            training_results['best_strategies_by_scenario'][scenario_name] = best_race
            
            print(f"  ✅ Best {scenario_name}: {best_race['total_time']:.1f}s, {best_race['pit_stops']} stops")
        
        # Overall performance analysis
        training_results['overall_performance'] = {
            'total_episodes': total_episodes,
            'scenarios_count': len(scenarios),
            'track': track,
            'race_number': race_number,
            'agent_final_epsilon': agent.epsilon,
            'q_table_size': len(agent.q_table)
        }
        
        # Extract track-specific insights (like real F1 teams do)
        all_strategies = list(training_results['best_strategies_by_scenario'].values())
        
        # Find common optimal pit windows
        pit_laps = []
        for strategy in all_strategies:
            for pit in strategy['pit_history']:
                pit_laps.append(pit['lap'])
        
        if pit_laps:
            optimal_window = [int(np.percentile(pit_laps, 25)), int(np.percentile(pit_laps, 75))]
        else:
            optimal_window = [30, 40]  # Default
        
        training_results['track_specific_insights'] = {
            'optimal_pit_window': optimal_window,
            'average_pit_stops': np.mean([s['pit_stops'] for s in all_strategies]),
            'fastest_strategy_time': min([s['total_time'] for s in all_strategies]),
            'most_common_compounds': self._analyze_compound_usage(all_strategies)
        }
        
        print(f"\n🏆 Training Complete!")
        print(f"📈 Trained on {total_episodes} episodes across {len(scenarios)} scenarios")
        print(f"🎯 Optimal pit window for {track}: laps {optimal_window[0]}-{optimal_window[1]}")
        print(f"⚡ Fastest strategy: {training_results['track_specific_insights']['fastest_strategy_time']:.1f}s")
        
        return agent, training_results
    
    def _analyze_compound_usage(self, strategies: List[Dict]) -> Dict:
        """Analyze which tire compounds are most successful."""
        compound_usage = defaultdict(int)
        
        for strategy in strategies:
            for pit in strategy.get('pit_history', []):
                compound_usage[pit['compound']] += 1
        
        if not compound_usage:
            return {'MEDIUM': 1}  # Default
        
        # Return as percentages
        total = sum(compound_usage.values())
        return {compound: count/total for compound, count in compound_usage.items()}


# Usage example function
def train_for_upcoming_race(track: str = 'Silverstone', race_number: int = 12):
    """
    Train strategy model for upcoming race weekend.
    
    This is how you would prepare for a real F1 weekend:
    - Analyze historical data from this track
    - Account for current season car development
    - Consider championship situation
    """
    trainer = IntelligentF1StrategyTrainer()
    
    print(f"🏁 Preparing strategy analysis for {track} (Race #{race_number})")
    print("=" * 60)
    
    # Train model with intelligent scenarios
    agent, results = trainer.train_intelligent_strategy_model(
        track=track,
        race_number=race_number,
        episodes_per_scenario=30  # Reasonable training time
    )
    
    # Save the trained model
    import os
    os.makedirs('ml_models/models', exist_ok=True)
    agent.save_model(f'ml_models/models/intelligent_strategy_{track.lower()}_race{race_number}.pkl')
    
    # Save training insights
    with open(f'ml_models/models/training_insights_{track.lower()}_race{race_number}.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Model saved for {track} race #{race_number}")
    print("🎯 Ready for race weekend strategy analysis!")
    
    return agent, results


if __name__ == "__main__":
    # Example: Train for British GP (typically race #10-12 in calendar)
    train_for_upcoming_race('Silverstone', race_number=10)