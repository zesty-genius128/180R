# app.py - Main Flask backend
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Import ML strategy engine
from ml_models.strategy_engine import ml_blueprint

app = Flask(__name__)
CORS(app)

# Register ML Blueprint
app.register_blueprint(ml_blueprint)

# OpenF1 API configuration
OPENF1_BASE_URL = "https://api.openf1.org/v1"

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
        
        # Driver tire management skills (0-1 scale)
        self.driver_tire_skills = {
            'HAM': 0.95, 'VER': 0.92, 'LEC': 0.88, 'SAI': 0.85,
            'RUS': 0.82, 'NOR': 0.87, 'PIA': 0.80, 'ALO': 0.93,
            'STR': 0.84, 'PER': 0.89, 'ALB': 0.81, 'SAR': 0.78,
            'TSU': 0.79, 'LAW': 0.76, 'HUL': 0.83, 'MAG': 0.80,
            'GAS': 0.85, 'OCO': 0.82, 'BOT': 0.86, 'ZHO': 0.77
        }
        
    def _get_grand_prix_name(self, location, country):
        """Map track locations to proper Grand Prix names"""
        # Comprehensive mapping of locations to Grand Prix names
        grand_prix_map = {
            # Major European tracks
            'Silverstone': 'British Grand Prix',
            'Monza': 'Italian Grand Prix',
            'Spa-Francorchamps': 'Belgian Grand Prix',
            'Imola': 'Emilia Romagna Grand Prix',
            'Barcelona': 'Spanish Grand Prix',
            'Zandvoort': 'Dutch Grand Prix',
            'Monaco': 'Monaco Grand Prix',
            'Paul Ricard': 'French Grand Prix',
            'Hungaroring': 'Hungarian Grand Prix',
            'Red Bull Ring': 'Austrian Grand Prix',
            'Nürburgring': 'Eifel Grand Prix',
            
            # Middle East & Asia
            'Bahrain': 'Bahrain Grand Prix',
            'Sakhir': 'Bahrain Grand Prix',
            'Jeddah': 'Saudi Arabian Grand Prix',
            'Yas Marina': 'Abu Dhabi Grand Prix',
            'Abu Dhabi': 'Abu Dhabi Grand Prix',
            'Losail': 'Qatar Grand Prix',
            'Qatar': 'Qatar Grand Prix',
            'Shanghai': 'Chinese Grand Prix',
            'Suzuka': 'Japanese Grand Prix',
            'Singapore': 'Singapore Grand Prix',
            'Sepang': 'Malaysian Grand Prix',
            
            # Americas
            'Circuit of the Americas': 'United States Grand Prix',
            'Austin': 'United States Grand Prix',
            'Miami': 'Miami Grand Prix',
            'Las Vegas': 'Las Vegas Grand Prix',
            'Interlagos': 'São Paulo Grand Prix',
            'São Paulo': 'São Paulo Grand Prix',
            'Brazil': 'São Paulo Grand Prix',
            'Mexico City': 'Mexico City Grand Prix',
            'Montreal': 'Canadian Grand Prix',
            
            # Other tracks
            'Albert Park': 'Australian Grand Prix',
            'Melbourne': 'Australian Grand Prix',
            'Baku': 'Azerbaijan Grand Prix',
            'Istanbul': 'Turkish Grand Prix',
            'Portimão': 'Portuguese Grand Prix',
            'Mugello': 'Tuscan Grand Prix'
        }
        
        # Try exact location match first
        if location in grand_prix_map:
            return grand_prix_map[location]
        
        # Try country-based mapping if location doesn't match
        country_map = {
            'United Kingdom': 'British Grand Prix',
            'Great Britain': 'British Grand Prix',
            'UK': 'British Grand Prix',
            'Italy': 'Italian Grand Prix',
            'Belgium': 'Belgian Grand Prix',
            'Spain': 'Spanish Grand Prix',
            'Netherlands': 'Dutch Grand Prix',
            'Monaco': 'Monaco Grand Prix',
            'France': 'French Grand Prix',
            'Hungary': 'Hungarian Grand Prix',
            'Austria': 'Austrian Grand Prix',
            'Germany': 'German Grand Prix',
            'Bahrain': 'Bahrain Grand Prix',
            'Saudi Arabia': 'Saudi Arabian Grand Prix',
            'United Arab Emirates': 'Abu Dhabi Grand Prix',
            'UAE': 'Abu Dhabi Grand Prix',
            'Qatar': 'Qatar Grand Prix',
            'China': 'Chinese Grand Prix',
            'Japan': 'Japanese Grand Prix',
            'Singapore': 'Singapore Grand Prix',
            'Malaysia': 'Malaysian Grand Prix',
            'United States': 'United States Grand Prix',
            'USA': 'United States Grand Prix',
            'Brazil': 'São Paulo Grand Prix',
            'Mexico': 'Mexico City Grand Prix',
            'Canada': 'Canadian Grand Prix',
            'Australia': 'Australian Grand Prix',
            'Azerbaijan': 'Azerbaijan Grand Prix',
            'Turkey': 'Turkish Grand Prix',
            'Portugal': 'Portuguese Grand Prix'
        }
        
        if country in country_map:
            return country_map[country]
        
        # Fallback: create a sensible name
        if location and location != 'Unknown':
            return f"{location} Grand Prix"
        elif country and country != 'Unknown':
            return f"{country} Grand Prix"
        else:
            return "Unknown Grand Prix"

    def _is_current_weekend(self, date_start):
        """Check if this session is part of the current race weekend"""
        if not date_start:
            return False
            
        try:
            from datetime import datetime, timedelta
            session_date = datetime.fromisoformat(date_start.replace('Z', '+00:00')).date()
            today = datetime.now().date()
            
            # Consider it current weekend if session is within 3 days of today
            time_diff = abs((session_date - today).days)
            return time_diff <= 3
        except:
            return False

    def get_current_session_info(self):
        """Get information about the current/next F1 session"""
        try:
            from datetime import datetime, timedelta
            now = datetime.now()
            
            # Get sessions from OpenF1 API for current period
            response = requests.get(
                f"{OPENF1_BASE_URL}/sessions", 
                params={
                    "year": 2025,
                    "date_start": (now - timedelta(days=2)).strftime("%Y-%m-%d")
                }, 
                timeout=10
            )
            
            if response.status_code != 200:
                return {"status": "no_live_session", "message": "Unable to fetch session data"}
            
            sessions = response.json()
            if not sessions:
                return {"status": "no_live_session", "message": "No sessions found"}
            
            # Find current or next session
            current_session = None
            next_session = None
            
            for session in sessions:
                session_start = session.get('date_start')
                session_end = session.get('date_end')
                
                if not session_start:
                    continue
                    
                try:
                    start_time = datetime.fromisoformat(session_start.replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(session_end.replace('Z', '+00:00')) if session_end else start_time + timedelta(hours=2)
                    
                    # Check if session is currently live
                    if start_time <= now <= end_time:
                        current_session = session
                        break
                    
                    # Track next upcoming session
                    if start_time > now and (not next_session or start_time < datetime.fromisoformat(next_session['date_start'].replace('Z', '+00:00'))):
                        next_session = session
                        
                except:
                    continue
            
            if current_session:
                location = current_session.get('location', 'Unknown')
                country = current_session.get('country_name', 'Unknown')
                race_name = self._get_grand_prix_name(location, country)
                
                return {
                    "status": "live_session",
                    "session_name": current_session.get('session_name', 'Unknown Session'),
                    "race_name": race_name,
                    "location": location,
                    "country": country,
                    "session_key": current_session.get('session_key'),
                    "start_time": current_session.get('date_start'),
                    "end_time": current_session.get('date_end'),
                    "message": f"Live: {current_session.get('session_name')} at {race_name}"
                }
            
            elif next_session:
                location = next_session.get('location', 'Unknown')
                country = next_session.get('country_name', 'Unknown')
                race_name = self._get_grand_prix_name(location, country)
                
                start_time = datetime.fromisoformat(next_session['date_start'].replace('Z', '+00:00'))
                time_until = start_time - now
                
                if time_until.days > 0:
                    time_str = f"{time_until.days} days"
                else:
                    hours = time_until.seconds // 3600
                    minutes = (time_until.seconds % 3600) // 60
                    time_str = f"{hours}h {minutes}m"
                
                return {
                    "status": "upcoming_session",
                    "session_name": next_session.get('session_name', 'Unknown Session'),
                    "race_name": race_name,
                    "location": location,
                    "country": country,
                    "session_key": next_session.get('session_key'),
                    "start_time": next_session.get('date_start'),
                    "time_until": time_str,
                    "message": f"Next: {next_session.get('session_name')} at {race_name} in {time_str}"
                }
            
            else:
                return {
                    "status": "no_live_session", 
                    "message": "No current or upcoming sessions this weekend"
                }
                
        except Exception as e:
            print(f"Error getting current session info: {e}")
            return {"status": "error", "message": f"Error: {e}"}

    def get_current_season_schedule(self, year=2025):
        """Get F1 calendar for the year using OpenF1 API"""
        try:
            # Get sessions from OpenF1 API
            response = requests.get(f"{OPENF1_BASE_URL}/sessions", params={"year": year}, timeout=10)
            
            if response.status_code != 200:
                print(f"OpenF1 API error: {response.status_code}")
                return self._get_fallback_schedule(year)
            
            sessions_data = response.json()
            
            if not sessions_data:
                print("No sessions data from OpenF1")
                return self._get_fallback_schedule(year)
            
            # Group sessions by meeting (event)
            events_map = {}
            for session in sessions_data:
                meeting_key = session.get('meeting_key')
                if not meeting_key:
                    continue
                    
                if meeting_key not in events_map:
                    location = session.get('location', 'Unknown')
                    country = session.get('country_name', 'Unknown')
                    
                    # Map locations to proper Grand Prix names
                    race_name = self._get_grand_prix_name(location, country)
                    print(f"🏎️ Mapping: {location}, {country} -> {race_name}")
                    
                    events_map[meeting_key] = {
                        'round': len(events_map) + 1,
                        'name': race_name,
                        'location': location,
                        'country': country,
                        'date': session.get('date_start', '')[:10] if session.get('date_start') else '',
                        'sessions': {},
                        'is_current_weekend': self._is_current_weekend(session.get('date_start', ''))
                    }
                
                # Map session types
                session_type = session.get('session_name', '').lower()
                session_date = session.get('date_start', '')
                
                if 'practice 1' in session_type or 'fp1' in session_type:
                    events_map[meeting_key]['sessions']['fp1'] = session_date
                elif 'practice 2' in session_type or 'fp2' in session_type:
                    events_map[meeting_key]['sessions']['fp2'] = session_date
                elif 'practice 3' in session_type or 'fp3' in session_type:
                    events_map[meeting_key]['sessions']['fp3'] = session_date
                elif 'qualifying' in session_type:
                    events_map[meeting_key]['sessions']['qualifying'] = session_date
                elif 'race' in session_type and 'sprint' not in session_type:
                    events_map[meeting_key]['sessions']['race'] = session_date
                    # Use race date as event date
                    events_map[meeting_key]['date'] = session_date[:10] if session_date else ''
            
            # Convert to list and sort by date
            events = list(events_map.values())
            events.sort(key=lambda x: x['date'] if x['date'] else '9999-12-31')
            
            # Update round numbers
            for i, event in enumerate(events):
                event['round'] = i + 1
            
            print(f"✅ Retrieved {len(events)} events from OpenF1 API")
            return events
            
        except Exception as e:
            print(f"Error getting schedule from OpenF1: {e}")
            return self._get_fallback_schedule(year)
    
    def _get_fallback_schedule(self, year):
        """Fallback schedule when API is unavailable"""
        if year == 2025:
            return [
                {
                    'round': 1,
                    'name': 'Australian Grand Prix',
                    'location': 'Melbourne',
                    'country': 'Australia',
                    'date': '2025-03-16',
                    'sessions': {
                        'fp1': '2025-03-14T11:30:00',
                        'fp2': '2025-03-14T15:00:00',
                        'fp3': '2025-03-15T11:30:00',
                        'qualifying': '2025-03-15T15:00:00',
                        'race': '2025-03-16T15:00:00'
                    }
                },
                {
                    'round': 2,
                    'name': 'Chinese Grand Prix',
                    'location': 'Shanghai',
                    'country': 'China',
                    'date': '2025-03-23',
                    'sessions': {
                        'fp1': '2025-03-21T11:30:00',
                        'fp2': '2025-03-21T15:00:00',
                        'fp3': '2025-03-22T11:30:00',
                        'qualifying': '2025-03-22T15:00:00',
                        'race': '2025-03-23T15:00:00'
                    }
                },
                {
                    'round': 3,
                    'name': 'Bahrain Grand Prix',
                    'location': 'Sakhir',
                    'country': 'Bahrain',
                    'date': '2025-04-13',
                    'sessions': {
                        'fp1': '2025-04-11T14:30:00',
                        'fp2': '2025-04-11T18:00:00',
                        'fp3': '2025-04-12T14:30:00',
                        'qualifying': '2025-04-12T18:00:00',
                        'race': '2025-04-13T18:00:00'
                    }
                },
                {
                    'round': 4,
                    'name': 'Saudi Arabian Grand Prix',
                    'location': 'Jeddah',
                    'country': 'Saudi Arabia',
                    'date': '2025-04-20',
                    'sessions': {
                        'fp1': '2025-04-18T16:30:00',
                        'fp2': '2025-04-18T20:00:00',
                        'fp3': '2025-04-19T16:30:00',
                        'qualifying': '2025-04-19T20:00:00',
                        'race': '2025-04-20T20:00:00'
                    }
                },
                {
                    'round': 5,
                    'name': 'British Grand Prix',
                    'location': 'Silverstone',
                    'country': 'United Kingdom',
                    'date': '2025-07-06',
                    'sessions': {
                        'fp1': '2025-07-04T13:30:00',
                        'fp2': '2025-07-04T17:00:00',
                        'fp3': '2025-07-05T12:30:00',
                        'qualifying': '2025-07-05T16:00:00',
                        'race': '2025-07-06T15:00:00'
                    }
                },
                {
                    'round': 6,
                    'name': 'Hungarian Grand Prix',
                    'location': 'Budapest',
                    'country': 'Hungary',
                    'date': '2025-07-27',
                    'sessions': {
                        'fp1': '2025-07-25T13:30:00',
                        'fp2': '2025-07-25T17:00:00',
                        'fp3': '2025-07-26T12:30:00',
                        'qualifying': '2025-07-26T16:00:00',
                        'race': '2025-07-27T15:00:00'
                    }
                }
            ]
        else:
            return []
    
    def get_session_data(self, year, event, session_type):
        """Load session data from OpenF1 API"""
        try:
            # Get sessions for the event
            sessions_response = requests.get(
                f"{OPENF1_BASE_URL}/sessions", 
                params={"year": year, "location": event},
                timeout=10
            )
            
            if sessions_response.status_code != 200:
                print(f"Error getting sessions: {sessions_response.status_code}")
                return self._get_mock_session_data(event, session_type)
            
            sessions = sessions_response.json()
            if not sessions:
                print(f"No sessions found for {event}")
                return self._get_mock_session_data(event, session_type)
            
            # Find the specific session
            target_session = None
            session_map = {
                'FP1': 'Practice 1', 'FP2': 'Practice 2', 'FP3': 'Practice 3',
                'Q': 'Qualifying', 'R': 'Race', 'S': 'Sprint'
            }
            
            target_session_name = session_map.get(session_type, session_type)
            
            for session in sessions:
                if target_session_name.lower() in session.get('session_name', '').lower():
                    target_session = session
                    break
            
            if not target_session:
                print(f"Session {session_type} not found for {event}")
                return self._get_mock_session_data(event, session_type)
            
            session_key = target_session.get('session_key')
            
            # Get drivers for this session
            drivers_response = requests.get(
                f"{OPENF1_BASE_URL}/drivers",
                params={"session_key": session_key},
                timeout=10
            )
            
            drivers_data = drivers_response.json() if drivers_response.status_code == 200 else []
            
            # Get weather data
            weather_response = requests.get(
                f"{OPENF1_BASE_URL}/weather",
                params={"session_key": session_key},
                timeout=10
            )
            
            weather_data = weather_response.json() if weather_response.status_code == 200 else []
            
            return {
                'session': target_session,
                'drivers': drivers_data,
                'weather': weather_data,
                'session_key': session_key
            }
            
        except Exception as e:
            print(f"Error loading session data: {e}")
            return self._get_mock_session_data(event, session_type)
    
    def _get_mock_session_data(self, event, session_type):
        """Generate mock session data for demonstration"""
        drivers = [
            {'driver_number': 1, 'name_acronym': 'VER', 'full_name': 'Max VERSTAPPEN', 'team_name': 'Red Bull Racing'},
            {'driver_number': 11, 'name_acronym': 'PER', 'full_name': 'Sergio PEREZ', 'team_name': 'Red Bull Racing'},
            {'driver_number': 44, 'name_acronym': 'HAM', 'full_name': 'Lewis HAMILTON', 'team_name': 'Mercedes'},
            {'driver_number': 63, 'name_acronym': 'RUS', 'full_name': 'George RUSSELL', 'team_name': 'Mercedes'},
            {'driver_number': 16, 'name_acronym': 'LEC', 'full_name': 'Charles LECLERC', 'team_name': 'Ferrari'},
            {'driver_number': 55, 'name_acronym': 'SAI', 'full_name': 'Carlos SAINZ', 'team_name': 'Ferrari'},
            {'driver_number': 4, 'name_acronym': 'NOR', 'full_name': 'Lando NORRIS', 'team_name': 'McLaren'},
            {'driver_number': 81, 'name_acronym': 'PIA', 'full_name': 'Oscar PIASTRI', 'team_name': 'McLaren'}
        ]
        
        weather = [{
            'air_temperature': 25.0,
            'humidity': 60.0,
            'pressure': 1013.0,
            'rainfall': 0,
            'track_temperature': 35.0,
            'wind_direction': 180,
            'wind_speed': 5.0
        }]
        
        return {
            'session': {
                'session_name': session_type,
                'location': event,
                'date_start': datetime.now().isoformat()
            },
            'drivers': drivers,
            'weather': weather,
            'session_key': f"mock_{event}_{session_type}"
        }
    
    def extract_driver_features(self, session_data, driver_code):
        """Extract features for a specific driver"""
        try:
            drivers = session_data.get('drivers', [])
            
            # Find the driver
            driver_info = None
            for driver in drivers:
                if driver.get('name_acronym') == driver_code:
                    driver_info = driver
                    break
            
            if not driver_info:
                return None
            
            # Generate realistic mock data based on driver skill level
            driver_skill = self.driver_tire_skills.get(driver_code, 0.8)
            
            # Base lap time varies by track and driver
            base_time = 90.0  # Default base lap time
            if 'Monaco' in session_data.get('session', {}).get('location', ''):
                base_time = 75.0
            elif 'Silverstone' in session_data.get('session', {}).get('location', ''):
                base_time = 85.0
            
            # Adjust for driver skill
            fastest_seconds = base_time + (0.95 - driver_skill) * 3.0
            avg_seconds = fastest_seconds + np.random.uniform(0.5, 1.5)
            consistency_seconds = max(0.2, 2.0 - driver_skill * 1.5)
            
            # Random grid position with bias towards better drivers
            grid_pos = max(1, int(np.random.normal(10 - driver_skill * 9, 3)))
            grid_pos = min(20, grid_pos)
            
            return {
                'driver': driver_code,
                'fastest_lap': fastest_seconds,
                'average_lap': avg_seconds,
                'consistency': consistency_seconds,
                'grid_position': float(grid_pos),
                'total_laps': np.random.randint(45, 65),
                'team_name': driver_info.get('team_name', 'Unknown')
            }
            
        except Exception as e:
            print(f"Error extracting features for {driver_code}: {e}")
            return None
    
    def get_weather_data(self, session_data):
        """Extract weather information"""
        try:
            weather = session_data.get('weather', [])
            if not weather:
                return {
                    'temperature': 25.0,
                    'humidity': 60.0,
                    'pressure': 1013.0,
                    'wind_speed': 5.0,
                    'rain_chance': 15.0
                }
            
            # Get latest weather data
            latest_weather = weather[-1] if weather else {}
            
            return {
                'temperature': float(latest_weather.get('air_temperature', 25.0)),
                'humidity': float(latest_weather.get('humidity', 60.0)),
                'pressure': float(latest_weather.get('pressure', 1013.0)),
                'wind_speed': float(latest_weather.get('wind_speed', 5.0)),
                'rain_chance': float(latest_weather.get('rainfall', 0)) * 100  # Convert to percentage
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
                    'fastest_lap': driver_features['fastest_lap'],
                    'team_name': driver_features.get('team_name', 'Unknown'),
                    'total_laps': driver_features.get('total_laps', 50)
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
    print(f"🔍 Getting schedule for year {year}")
    schedule = processor.get_current_season_schedule(year)
    print(f"📅 Schedule has {len(schedule)} events")
    if schedule:
        print(f"🏁 First event: {schedule[0]}")
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
    # Get current session information
    session_info = processor.get_current_session_info()
    
    if session_info['status'] == 'live_session':
        # For live sessions, try to get real timing data
        session_key = session_info.get('session_key')
        if session_key:
            try:
                # Get position data from OpenF1 API
                positions_response = requests.get(
                    f"{OPENF1_BASE_URL}/position",
                    params={"session_key": session_key},
                    timeout=10
                )
                
                positions = positions_response.json() if positions_response.status_code == 200 else []
                
                # Get lap data
                laps_response = requests.get(
                    f"{OPENF1_BASE_URL}/laps",
                    params={"session_key": session_key},
                    timeout=10
                )
                
                laps = laps_response.json() if laps_response.status_code == 200 else []
                
                return jsonify({
                    'session_status': 'Live',
                    'session_info': session_info,
                    'positions': positions[:10],  # Top 10 positions
                    'recent_laps': laps[-20:],    # Last 20 laps
                    'last_update': datetime.now().isoformat()
                })
                
            except Exception as e:
                print(f"Error getting live timing: {e}")
    
    # Default response for non-live sessions
    return jsonify({
        'session_status': session_info['status'],
        'session_info': session_info,
        'message': session_info.get('message', 'No live session'),
        'last_update': datetime.now().isoformat()
    })

@app.route('/api/current-session')
def get_current_session():
    """Get information about current/next F1 session"""
    return jsonify(processor.get_current_session_info())

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
    # Use port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.environ.get('FLASK_PORT', 5001))
    
    print("🏁 F1 Predictor Backend Starting...")
    print("📊 FastF1 Cache enabled")
    print(f"🌐 API available at: http://localhost:{port}")
    
    app.run(debug=True, host='0.0.0.0', port=port)