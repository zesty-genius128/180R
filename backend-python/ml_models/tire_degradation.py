"""
F1 Tire Degradation Prediction Model
====================================

This module implements ML models to predict tire performance degradation
based on historical F1 data, track conditions, and driver characteristics.

Key Features:
- Tire compound performance curves (Soft/Medium/Hard)
- Driver-specific tire management modeling
- Track surface and temperature impact analysis
- Real-time degradation prediction during sessions
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import fastf1 as ff1
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')


class TireDegradationPredictor:
    """
    ML model to predict tire performance degradation in F1 races.
    
    Predicts lap time delta (seconds slower than fresh tires) based on:
    - Tire age (laps completed)
    - Tire compound (SOFT/MEDIUM/HARD)
    - Track temperature and conditions
    - Driver tire management skill
    - Track characteristics
    """
    
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.compound_encoder = LabelEncoder()
        self.driver_encoder = LabelEncoder()
        self.track_encoder = LabelEncoder()
        
        # Tire compound base degradation rates (seconds per lap)
        self.compound_base_degradation = {
            'SOFT': 0.08,      # Fastest but degrades quickly
            'MEDIUM': 0.04,    # Balanced performance
            'HARD': 0.02,      # Slowest but most durable
            'INTERMEDIATE': 0.15,  # Wet weather
            'WET': 0.20        # Full wet
        }
        
        # Driver skill ratings (tire management, 0-1 scale)
        self.driver_tire_skills = {
            'HAM': 0.95,  'VER': 0.92,  'LEC': 0.88,  'SAI': 0.85,
            'RUS': 0.82,  'NOR': 0.87,  'PIA': 0.80,  'ALO': 0.93,
            'STR': 0.84,  'PER': 0.89,  'ALB': 0.81,  'SAR': 0.78,
            'TSU': 0.79,  'LAW': 0.76,  'HUL': 0.83,  'MAG': 0.80,
            'GAS': 0.85,  'OCO': 0.82,  'BOT': 0.86,  'ZHO': 0.77
        }
        
        self.is_trained = False
        
    def collect_historical_data(self, years=[2022, 2023, 2024], max_events_per_year=10):
        """
        Collect historical F1 data for tire degradation analysis.
        
        Args:
            years: List of F1 seasons to analyze
            max_events_per_year: Limit events per season for faster processing
            
        Returns:
            DataFrame with tire performance data
        """
        print("🏎️ Collecting F1 tire degradation data...")
        all_data = []
        
        for year in years:
            print(f"📅 Processing {year} season...")
            
            try:
                # Get season schedule
                schedule = ff1.get_event_schedule(year)
                events = schedule.head(max_events_per_year)  # Limit for demo
                
                for _, event in events.iterrows():
                    event_name = event['EventName']
                    print(f"  🏁 {event_name}...")
                    
                    try:
                        # Analyze race session
                        session = ff1.get_session(year, event_name, 'R')
                        session.load()
                        
                        if session.laps.empty:
                            continue
                            
                        # Extract tire data for each driver
                        event_data = self._extract_tire_data(session, event_name, year)
                        all_data.extend(event_data)
                        
                    except Exception as e:
                        print(f"    ⚠️ Error processing {event_name}: {e}")
                        continue
                        
            except Exception as e:
                print(f"❌ Error processing {year} season: {e}")
                continue
        
        df = pd.DataFrame(all_data)
        print(f"✅ Collected {len(df)} tire performance data points")
        return df
    
    def _extract_tire_data(self, session, event_name, year):
        """Extract tire performance data from a race session."""
        tire_data = []
        
        # Get unique drivers
        drivers = session.laps['Driver'].unique()
        
        for driver in drivers:
            if pd.isna(driver):
                continue
                
            # Get driver's laps
            driver_laps = session.laps.pick_driver(driver)
            
            if driver_laps.empty:
                continue
            
            # Group by stint (consecutive laps on same tire)
            stints = []
            current_compound = None
            stint_start = 0
            
            for i, (_, lap) in enumerate(driver_laps.iterrows()):
                compound = lap.get('Compound', 'UNKNOWN')
                
                if compound != current_compound:
                    if current_compound is not None:
                        stints.append({
                            'compound': current_compound,
                            'start_lap': stint_start,
                            'end_lap': i - 1,
                            'laps': driver_laps.iloc[stint_start:i]
                        })
                    current_compound = compound
                    stint_start = i
            
            # Add final stint
            if current_compound is not None:
                stints.append({
                    'compound': current_compound,
                    'start_lap': stint_start,
                    'end_lap': len(driver_laps) - 1,
                    'laps': driver_laps.iloc[stint_start:]
                })
            
            # Analyze each stint for degradation
            for stint in stints:
                if len(stint['laps']) < 3:  # Need minimum laps for analysis
                    continue
                    
                stint_data = self._analyze_stint_degradation(
                    stint, driver, event_name, year, session
                )
                tire_data.extend(stint_data)
        
        return tire_data
    
    def _analyze_stint_degradation(self, stint, driver, event_name, year, session):
        """Analyze tire degradation within a single stint."""
        stint_data = []
        laps = stint['laps']
        compound = stint['compound']
        
        if compound not in self.compound_base_degradation:
            return []
        
        # Find fastest lap in first 3 laps of stint (baseline)
        first_laps = laps.head(3)
        valid_times = first_laps['LapTime'].dropna()
        
        if valid_times.empty:
            return []
            
        baseline_time = valid_times.min()
        
        # Analyze each lap in the stint
        for tire_age, (_, lap) in enumerate(laps.iterrows()):
            lap_time = lap.get('LapTime')
            track_temp = lap.get('TrackTemp', 35)  # Default if missing
            
            if pd.isna(lap_time) or lap_time == 0:
                continue
            
            # Calculate degradation (time delta from baseline)
            degradation = (lap_time - baseline_time).total_seconds()
            
            # Skip outliers (pit laps, incidents, etc.)
            if degradation < 0 or degradation > 10:
                continue
            
            # Extract features
            features = {
                # Target variable
                'degradation_seconds': degradation,
                
                # Core features
                'tire_age': tire_age,
                'compound': compound,
                'driver': driver,
                'track': event_name,
                'year': year,
                
                # Conditions
                'track_temp': track_temp,
                'lap_number': lap.get('LapNumber', 0),
                
                # Driver skill
                'driver_tire_skill': self.driver_tire_skills.get(driver, 0.8),
                
                # Track characteristics (simplified)
                'track_severity': self._get_track_severity(event_name),
                'track_length': self._get_track_length(event_name),
                
                # Session context
                'fuel_load_est': max(0, 110 - (lap.get('LapNumber', 0) * 1.8)),  # Estimated fuel
                'stint_position': tire_age + 1
            }
            
            stint_data.append(features)
        
        return stint_data
    
    def _get_track_severity(self, track_name):
        """Get track severity rating for tire wear (0-1 scale)."""
        severity_map = {
            'Monaco': 0.3,      'Hungary': 0.4,     'Singapore': 0.5,
            'Spain': 0.6,       'Austria': 0.6,     'Netherlands': 0.6,
            'Belgium': 0.7,     'Italy': 0.7,       'Brazil': 0.7,
            'Britain': 0.8,     'Turkey': 0.8,      'Abu Dhabi': 0.8,
            'Bahrain': 0.9,     'Saudi Arabia': 0.9, 'Australia': 0.9
        }
        return severity_map.get(track_name, 0.7)  # Default medium severity
    
    def _get_track_length(self, track_name):
        """Get track length in km."""
        length_map = {
            'Monaco': 3.337,    'Netherlands': 4.259,   'Hungary': 4.381,
            'Austria': 4.318,   'Singapore': 5.063,     'Spain': 4.655,
            'Belgium': 7.004,   'Italy': 5.793,         'Brazil': 4.309,
            'Britain': 5.891,   'Turkey': 5.338,        'Abu Dhabi': 5.554,
            'Bahrain': 5.412,   'Saudi Arabia': 6.174,  'Australia': 5.278
        }
        return length_map.get(track_name, 5.0)  # Default 5km
    
    def prepare_features(self, df):
        """Prepare features for ML training."""
        # Encode categorical variables
        df_encoded = df.copy()
        
        # Encode compounds, drivers, tracks
        df_encoded['compound_encoded'] = self.compound_encoder.fit_transform(df['compound'])
        df_encoded['driver_encoded'] = self.driver_encoder.fit_transform(df['driver'])
        df_encoded['track_encoded'] = self.track_encoder.fit_transform(df['track'])
        
        # Select features for training
        feature_columns = [
            'tire_age', 'compound_encoded', 'driver_encoded', 'track_encoded',
            'track_temp', 'lap_number', 'driver_tire_skill', 'track_severity',
            'track_length', 'fuel_load_est', 'stint_position'
        ]
        
        X = df_encoded[feature_columns]
        y = df_encoded['degradation_seconds']
        
        return X, y
    
    def train(self, df=None):
        """Train the tire degradation model."""
        print("🧠 Training tire degradation model...")
        
        if df is None:
            print("📊 No data provided, collecting historical data...")
            df = self.collect_historical_data(years=[2023, 2024], max_events_per_year=5)
        
        if df.empty:
            print("❌ No training data available")
            return False
        
        # Prepare features
        X, y = self.prepare_features(df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"✅ Model trained successfully!")
        print(f"📈 R² Score: {r2:.3f}")
        print(f"📉 RMSE: {np.sqrt(mse):.3f} seconds")
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
        print(f"🔄 Cross-validation R²: {cv_scores.mean():.3f} (±{cv_scores.std()*2:.3f})")
        
        self.is_trained = True
        return True
    
    def predict_degradation(self, tire_age, compound, driver, track, 
                          track_temp=35, lap_number=10, fuel_load=50):
        """
        Predict tire degradation for given conditions.
        
        Args:
            tire_age: Number of laps on current tires
            compound: Tire compound ('SOFT', 'MEDIUM', 'HARD')
            driver: Driver code ('HAM', 'VER', etc.)
            track: Track name
            track_temp: Track temperature in Celsius
            lap_number: Current lap number in race
            fuel_load: Estimated fuel load in kg
            
        Returns:
            Predicted degradation in seconds
        """
        if not self.is_trained:
            print("⚠️ Model not trained yet!")
            return self._fallback_prediction(tire_age, compound)
        
        # Prepare features
        features = np.array([[
            tire_age,
            self.compound_encoder.transform([compound])[0] if compound in self.compound_encoder.classes_ else 0,
            self.driver_encoder.transform([driver])[0] if driver in self.driver_encoder.classes_ else 0,
            self.track_encoder.transform([track])[0] if track in self.track_encoder.classes_ else 0,
            track_temp,
            lap_number,
            self.driver_tire_skills.get(driver, 0.8),
            self._get_track_severity(track),
            self._get_track_length(track),
            fuel_load,
            tire_age + 1  # stint_position
        ]])
        
        # Scale and predict
        features_scaled = self.scaler.transform(features)
        prediction = self.model.predict(features_scaled)[0]
        
        return max(0, prediction)  # Ensure non-negative degradation
    
    def _fallback_prediction(self, tire_age, compound):
        """Simple fallback prediction when model isn't trained."""
        base_rate = self.compound_base_degradation.get(compound, 0.05)
        # Quadratic degradation curve
        return base_rate * tire_age * (1 + tire_age * 0.02)
    
    def save_model(self, filepath='models/tire_degradation_model.pkl'):
        """Save trained model to disk."""
        if not self.is_trained:
            print("⚠️ No trained model to save")
            return False
            
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'compound_encoder': self.compound_encoder,
            'driver_encoder': self.driver_encoder,
            'track_encoder': self.track_encoder,
            'driver_tire_skills': self.driver_tire_skills,
            'compound_base_degradation': self.compound_base_degradation
        }
        
        joblib.dump(model_data, filepath)
        print(f"💾 Model saved to {filepath}")
        return True
    
    def load_model(self, filepath='models/tire_degradation_model.pkl'):
        """Load trained model from disk."""
        try:
            model_data = joblib.load(filepath)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.compound_encoder = model_data['compound_encoder']
            self.driver_encoder = model_data['driver_encoder']
            self.track_encoder = model_data['track_encoder']
            self.driver_tire_skills = model_data['driver_tire_skills']
            self.compound_base_degradation = model_data['compound_base_degradation']
            
            self.is_trained = True
            print(f"📂 Model loaded from {filepath}")
            return True
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False


# Demo usage
if __name__ == "__main__":
    # Initialize predictor
    predictor = TireDegradationPredictor()
    
    # Train model (this will take a few minutes)
    success = predictor.train()
    
    if success:
        # Example predictions
        print("\n🔮 Example Predictions:")
        
        # Hamilton on mediums after 20 laps at Silverstone
        degradation = predictor.predict_degradation(
            tire_age=20,
            compound='MEDIUM',
            driver='HAM',
            track='Britain',
            track_temp=42
        )
        print(f"HAM on 20-lap MEDIUM tires at Silverstone (42°C): +{degradation:.2f}s")
        
        # Verstappen on softs after 15 laps at Monaco
        degradation = predictor.predict_degradation(
            tire_age=15,
            compound='SOFT',
            driver='VER',
            track='Monaco',
            track_temp=38
        )
        print(f"VER on 15-lap SOFT tires at Monaco (38°C): +{degradation:.2f}s")
        
        # Save model
        predictor.save_model()