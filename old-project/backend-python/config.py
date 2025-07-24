# config.py - Configuration settings
import os
from datetime import datetime

class Config:
    # API Settings
    FLASK_PORT = 5000
    FLASK_HOST = '0.0.0.0'
    DEBUG = True
    
    # FastF1 Settings
    CACHE_DIR = './cache'
    ENABLE_CACHE = True
    
    # OpenF1 API Settings (for future real-time integration)
    OPENF1_BASE_URL = 'https://api.openf1.org/v1'
    OPENF1_API_KEY = os.getenv('OPENF1_API_KEY', '')  # Get paid account for real-time
    
    # Default Settings
    DEFAULT_YEAR = 2025
    DEFAULT_EVENT = 'Austria'
    DEFAULT_SESSION = 'Q'
    
    # Update Intervals
    AUTO_REFRESH_INTERVAL = 30  # seconds
    CACHE_EXPIRE_TIME = 3600    # 1 hour
    
    # Model Settings
    MODEL_FEATURES = [
        'fastest_lap',
        'average_lap', 
        'consistency',
        'grid_position',
        'weather_impact'
    ]
    
    # Driver/Team Mapping
    DRIVERS_2025 = {
        'VER': {'team': 'Red Bull Racing', 'number': 1},
        'PER': {'team': 'Red Bull Racing', 'number': 11},
        'LEC': {'team': 'Ferrari', 'number': 16},
        'SAI': {'team': 'Ferrari', 'number': 55},
        'HAM': {'team': 'Mercedes', 'number': 44},
        'RUS': {'team': 'Mercedes', 'number': 63},
        'NOR': {'team': 'McLaren', 'number': 4},
        'PIA': {'team': 'McLaren', 'number': 81},
        'ALO': {'team': 'Aston Martin', 'number': 14},
        'STR': {'team': 'Aston Martin', 'number': 18},
        'ALB': {'team': 'Williams', 'number': 23},
        'SAR': {'team': 'Williams', 'number': 2},
        'TSU': {'team': 'AlphaTauri', 'number': 22},
        'LAW': {'team': 'AlphaTauri', 'number': 30},
        'HUL': {'team': 'Haas', 'number': 27},
        'MAG': {'team': 'Haas', 'number': 20},
        'GAS': {'team': 'Alpine', 'number': 10},
        'OCO': {'team': 'Alpine', 'number': 31},
        'BOT': {'team': 'Kick Sauber', 'number': 77},
        'ZHO': {'team': 'Kick Sauber', 'number': 24}
    }
    
    @staticmethod
    def get_current_f1_weekend():
        """Get the current or next F1 weekend"""
        # This would integrate with the F1 calendar
        # For now, return Austria GP
        return {
            'year': 2025,
            'event': 'Austria',
            'round': 11
        }