const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock the server setup without WebSocket for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mock cache
const cache = new Map();
const CACHE_DURATION = 30000;

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Test routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test-cache', (req, res) => {
  const cachedData = getCachedData('test');
  if (cachedData) {
    return res.json({ cached: true, data: cachedData });
  }
  
  const newData = { message: 'Fresh data', timestamp: Date.now() };
  setCachedData('test', newData);
  res.json({ cached: false, data: newData });
});

describe('Node.js Backend API', () => {
  describe('Health Check', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Cache Functionality', () => {
    beforeEach(() => {
      cache.clear();
    });

    test('should return fresh data on first request', async () => {
      const response = await request(app)
        .get('/api/test-cache')
        .expect(200);
      
      expect(response.body.cached).toBe(false);
      expect(response.body.data).toHaveProperty('message', 'Fresh data');
    });

    test('should return cached data on subsequent request', async () => {
      // First request
      await request(app).get('/api/test-cache');
      
      // Second request should return cached data
      const response = await request(app)
        .get('/api/test-cache')
        .expect(200);
      
      expect(response.body.cached).toBe(true);
    });

    test('cache utility functions work correctly', () => {
      const testKey = 'test-key';
      const testData = { value: 'test-value' };
      
      // Initially no cached data
      expect(getCachedData(testKey)).toBeNull();
      
      // Set cached data
      setCachedData(testKey, testData);
      
      // Should return cached data
      expect(getCachedData(testKey)).toEqual(testData);
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});