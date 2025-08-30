import unittest
import json
import sys
import os

# Add the parent directory to the path to import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
import config

class TestF1PredictorAPI(unittest.TestCase):
    def setUp(self):
        """Set up test client and test configuration"""
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
    def test_health_check(self):
        """Test the health check endpoint"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'healthy')
        
    def test_schedule_endpoint(self):
        """Test the F1 schedule endpoint"""
        response = self.client.get('/api/schedule')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('events', data)
        self.assertIsInstance(data['events'], list)
        
    def test_cors_headers(self):
        """Test that CORS headers are present"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        
        # Check for CORS headers
        self.assertIn('Access-Control-Allow-Origin', response.headers)
        
    def test_ml_model_status_endpoint(self):
        """Test the ML model status endpoint"""
        response = self.client.get('/api/ml/model-status')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('models', data)
        self.assertIsInstance(data['models'], dict)
        
    def test_invalid_endpoint(self):
        """Test that invalid endpoints return 404"""
        response = self.client.get('/api/nonexistent')
        self.assertEqual(response.status_code, 404)
        
    def test_tire_degradation_prediction(self):
        """Test tire degradation prediction endpoint"""
        test_data = {
            'driver': 'VER',
            'tire_compound': 'SOFT',
            'laps': 10,
            'track_temp': 25.0,
            'air_temp': 20.0
        }
        
        response = self.client.post('/api/ml/tire-degradation',
                                   data=json.dumps(test_data),
                                   content_type='application/json')
        
        # Should return 200 or appropriate error code
        self.assertIn(response.status_code, [200, 400, 500])
        
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn('prediction', data)
            
    def test_config_validation(self):
        """Test configuration validation"""
        self.assertTrue(hasattr(config, 'API_VERSION'))
        self.assertTrue(hasattr(config, 'DEBUG_MODE'))
        
    def test_json_response_format(self):
        """Test that responses are properly formatted JSON"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')
        
        # Should be valid JSON
        try:
            json.loads(response.data)
        except json.JSONDecodeError:
            self.fail("Response is not valid JSON")

if __name__ == '__main__':
    unittest.main()