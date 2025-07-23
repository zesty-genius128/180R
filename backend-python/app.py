# app.py - Main Flask backend
from flask import Flask, jsonify, request
from flask_cors import CORS
import fastf1 as ff1
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Enable FastF1 caching
ff1.Cache.enable_cache('./cache')

class F1DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.driver_mapping = {
            'VER': 1, 'PER': 11, 'LEC': 16, 'SAI': 55, 'HAM': 44, 'RUS': 63,
            'NOR': 4, 'PIA': 81, 'ALO': 14, 'STR': 18, 'ALB': 23, 'SAR': 2,
            'TSU': 22, 'LAW': 30, 'HUL': 27, 'MAG': 20, 'GAS': 10, 'OCO': 31,
            'BOT': 77, 'ZHO': 24
        }
        
    def get_current_season_schedule(self, year=2025):
        """Get F1 calendar for the year"""
        try:
            schedule = ff1.get_event_schedule(year)
            events = []
            
            for _, event in schedule.iterrows():
                events.append({
                    'round': event.get('RoundNumber', 0),
                    'name': event.get('EventName', 'Unknown'),
                    'location': event.get('Location', 'Unknown'),
                    'country': event.get('Country', 'Unknown'),
                    'date': event.get('EventDate', '').strftime('%Y-%m-%d') if pd.notna(event.get('EventDate')) else '',
                    'sessions': {
                        'fp1': event.get('Session1Date', '').strftime('%Y-%m-%d %H:%M') if pd.notna(event.get('Session1Date')) else '',
                        'fp2': event.get('Session2Date', '').strftime('%Y-%m-%d %H:%M') if pd.notna(event.get('Session2Date')) else '',
                        'fp3': event.get('Session3Date', '').strftime('%Y-%m-%d %H:%M') if pd.notna(event.get('Session3Date')) else '',
                        'qualifying': event.get('Session4Date', '').strftime('%Y-%m-%d %H:%M') if pd.notna(event.get('Session4Date')) else '',
                        'race': event.get('Session5Date', '').strftime('%Y-%m-%d %H:%M') if pd.notna(event.get('Session5Date')) else ''
                    }
                })
            
            return events
        except Exception as e:
            print(f"Error getting schedule: {e}")
            return []
    
    def get_session_data(self, year, event, session_type):
        """Load session data from FastF1"""
        try:
            session = ff1.get_session(year, event, session_type)
            session.load()
            
            return {
                'session': session,
                'laps': session.laps,
                'results': session.results,
                'weather': session.weather_data if hasattr(session, 'weather_data') else pd.DataFrame()
            }
        except Exception as e:
            print(f"Error loading session data: {e}")
            return None
    
    def extract_driver_features(self, session_data, driver_code):
        """Extract features for a specific driver"""
        try:
            session = session_data['session']
            laps = session_data['laps']
            
            # Get driver laps
            driver_laps = laps.pick_driver(driver_code)
            if driver_laps.empty:
                return None
            
            # Basic stats
            fastest_lap = driver_laps['LapTime'].min()
            avg_lap = driver_laps['LapTime'].mean()
            consistency = driver_laps['LapTime'].std()
            
            # Grid position (from qualifying)
            grid_pos = 20  # Default if not found
            if hasattr(session, 'results') and not session.results.empty:
                driver_result = session.results[session.results['Abbreviation'] == driver_code]
                if not driver_result.empty:
                    grid_pos = driver_result['GridPosition'].iloc[0] if pd.notna(driver_result['GridPosition'].iloc[0]) else 20
            
            # Convert lap times to seconds
            fastest_seconds = fastest_lap.total_seconds() if pd.notna(fastest_lap) else 120.0
            avg_seconds = avg_lap.total_seconds() if pd.notna(avg_lap) else 120.0
            consistency_seconds = consistency.total_seconds() if pd.notna(consistency) else 2.0
            
            return {
                'driver': driver_code,
                'fastest_lap': fastest_seconds,
                'average_lap': avg_seconds,
                'consistency': consistency_seconds,
                'grid_position': float(grid_pos),
                'total_laps': len(driver_laps)
            }
            
        except Exception as e:
            print(f"Error extracting features for {driver_code}: {e}")
            return None
    
    def get_weather_data(self, session_data):
        """Extract weather information"""
        try:
            weather = session_data['weather']
            if weather.empty:
                return {
                    'temperature': 25.0,
                    'humidity': 60.0,
                    'pressure': 1013.0,
                    'wind_speed': 5.0,
                    'rain_chance': 15.0
                }
            
            # Get latest weather data
            latest_weather = weather.iloc[-1]
            
            return {
                'temperature': float(latest_weather.get('AirTemp', 25.0)),
                'humidity': float(latest_weather.get('Humidity', 60.0)),
                'pressure': float(latest_weather.get('Pressure', 1013.0)),
                'wind_speed': float(latest_weather.get('WindSpeed', 5.0)),
                'rain_chance': 15.0  # FastF1 doesn't provide rain probability
            }
            
        except Exception as e:
            print(f"Error extracting weather: {e}")
            return {
                'temperature': 25.0,
                'humidity': 60.0,
                'pressure': 1013.0,
                'wind_speed': 5.0,
                'rain_chance': 15.0
            }
    
    def generate_predictions(self, features_list, weather_data):
        """Generate race predictions using simplified model"""
        try:
            predictions = []
            
            # Sort by fastest lap time and apply adjustments
            features_list.sort(key=lambda x: x['fastest_lap'])
            
            for i, driver_features in enumerate(features_list):
                # Base position from qualifying performance
                base_position = i + 1
                
                # Adjustments based on various factors
                grid_penalty = max(0, driver_features['grid_position'] - base_position) * 0.1
                consistency_bonus = max(0, 2.0 - driver_features['consistency']) * 0.2
                weather_adjustment = (weather_data['rain_chance'] / 100) * np.random.uniform(-0.3, 0.3)
                
                # Calculate predicted race time (base + adjustments)
                predicted_time = driver_features['fastest_lap'] + grid_penalty + weather_adjustment
                
                # Confidence based on consistency and grid position
                confidence = max(70, 95 - driver_features['consistency'] * 5 - abs(driver_features['grid_position'] - base_position) * 2)
                
                predictions.append({
                    'driver': driver_features['driver'],
                    'predicted_time': predicted_time,
                    'confidence': min(confidence, 98),
                    'grid_position': int(driver_features['grid_position']),
                    'fastest_lap': driver_features['fastest_lap']
                })
            
            # Sort by predicted time
            predictions.sort(key=lambda x: x['predicted_time'])
            
            # Add final positions
            for i, pred in enumerate(predictions):
                pred['predicted_position'] = i + 1
            
            return predictions
            
        except Exception as e:
            print(f"Error generating predictions: {e}")
            return []

# Initialize processor
processor = F1DataProcessor()

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'service': 'F1 Predictor Python Backend'
    })

@app.route('/api/schedule')
def get_schedule():
    """Get F1 calendar"""
    year = request.args.get('year', 2025, type=int)
    schedule = processor.get_current_season_schedule(year)
    return jsonify(schedule)

@app.route('/api/session-data')
def get_session_data():
    """Get session data and generate predictions"""
    year = request.args.get('year', 2025, type=int)
    event = request.args.get('event', 'Austria')
    session_type = request.args.get('session', 'Q')
    
    # Load session data
    session_data = processor.get_session_data(year, event, session_type)
    if not session_data:
        return jsonify({'error': 'Could not load session data'}), 400
    
    # Extract features for all drivers
    features_list = []
    driver_codes = ['VER', 'PER', 'LEC', 'SAI', 'HAM', 'RUS', 'NOR', 'PIA', 
                   'ALO', 'STR', 'ALB', 'SAR', 'TSU', 'LAW', 'HUL', 'MAG', 
                   'GAS', 'OCO', 'BOT', 'ZHO']
    
    for driver in driver_codes:
        features = processor.extract_driver_features(session_data, driver)
        if features:
            features_list.append(features)
    
    # Get weather data
    weather_data = processor.get_weather_data(session_data)
    
    # Generate predictions
    predictions = processor.generate_predictions(features_list, weather_data)
    
    return jsonify({
        'predictions': predictions,
        'weather': weather_data,
        'session_info': {
            'year': year,
            'event': event,
            'session': session_type,
            'date': datetime.now().isoformat()
        }
    })

@app.route('/api/live-timing')
def get_live_timing():
    """Get live timing data during sessions"""
    # This would integrate with OpenF1 API for real-time data
    # For now, return sample data
    return jsonify({
        'session_status': 'SessionStarted',
        'remaining_time': '45:30',
        'current_leader': 'VER',
        'last_update': datetime.now().isoformat()
    })

@app.route('/api/driver-comparison')
def compare_drivers():
    """Compare two drivers' performance"""
    year = request.args.get('year', 2025, type=int)
    event = request.args.get('event', 'Austria')
    session_type = request.args.get('session', 'Q')
    driver1 = request.args.get('driver1', 'VER')
    driver2 = request.args.get('driver2', 'LEC')
    
    session_data = processor.get_session_data(year, event, session_type)
    if not session_data:
        return jsonify({'error': 'Could not load session data'}), 400
    
    comparison = {
        'driver1': processor.extract_driver_features(session_data, driver1),
        'driver2': processor.extract_driver_features(session_data, driver2),
        'session_info': {
            'year': year,
            'event': event,
            'session': session_type
        }
    }
    
    return jsonify(comparison)

if __name__ == '__main__':
    print("🏁 F1 Predictor Backend Starting...")
    print("📊 FastF1 Cache enabled")
    print("🌐 API available at: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)