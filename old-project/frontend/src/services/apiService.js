// frontend/src/services/apiService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // 60 seconds for data processing
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.data || error.message);
        
        // Handle specific error cases
        if (error.response?.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else if (error.response?.status === 404) {
          throw new Error('Data not found. Check your selection.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The data is taking too long to load.');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error('Network error. Please check your connection.');
        }
      }
    );
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Backend service unavailable');
    }
  }

  // Get F1 schedule
  async getSchedule(year = 2025) {
    try {
      const response = await this.api.get('/schedule', {
        params: { year }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load F1 schedule: ${error.message}`);
    }
  }

  // Get session data with predictions
  async getSessionData(year, event, session) {
    try {
      if (!event || !session) {
        throw new Error('Event and session are required');
      }

      const response = await this.api.get('/session-data', {
        params: { year, event, session },
        timeout: 90000 // Extended timeout for data processing
      });
      
      return response.data;
    } catch (error) {
      if (error.message.includes('timeout')) {
        throw new Error('Data processing is taking longer than expected. Please try again.');
      }
      throw new Error(`Failed to load session data: ${error.message}`);
    }
  }

  // Get driver comparison
  async getDriverComparison(year, event, session, driver1, driver2) {
    try {
      const response = await this.api.get('/driver-comparison', {
        params: { year, event, session, driver1, driver2 }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load driver comparison: ${error.message}`);
    }
  }

  // Get live timing data
  async getLiveTiming() {
    try {
      const response = await this.api.get('/live-timing');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load live timing: ${error.message}`);
    }
  }

  // Get current F1 weekend info
  async getCurrentWeekend() {
    try {
      const response = await this.api.get('/current-weekend');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load current weekend info: ${error.message}`);
    }
  }

  // Generic GET request with caching
  async get(endpoint, params = {}, options = {}) {
    try {
      const response = await this.api.get(endpoint, {
        params,
        ...options
      });
      return response.data;
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Generic POST request
  async post(endpoint, data = {}, options = {}) {
    try {
      const response = await this.api.post(endpoint, data, options);
      return response.data;
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // === ML API Methods ===

  // Get ML model status
  async getMLModelStatus() {
    try {
      const response = await this.api.get('/ml/model-status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ML model status: ${error.message}`);
    }
  }

  // Predict tire degradation
  async predictTireDegradation(params) {
    try {
      const response = await this.api.post('/ml/tire-degradation', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to predict tire degradation: ${error.message}`);
    }
  }

  // Analyze tire strategies
  async analyzeTireStrategy(params) {
    try {
      const response = await this.api.post('/ml/tire-strategy', params, {
        timeout: 30000 // Extended timeout for strategy analysis
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to analyze tire strategy: ${error.message}`);
    }
  }

  // Get tire compound information
  async getTireCompounds() {
    try {
      const response = await this.api.get('/ml/tire-compounds');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get tire compounds: ${error.message}`);
    }
  }

  // Get driver tire management skills
  async getDriverSkills() {
    try {
      const response = await this.api.get('/ml/driver-skills');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get driver skills: ${error.message}`);
    }
  }

  // Train tire degradation model
  async trainTireModel(params = {}) {
    try {
      const response = await this.api.post('/ml/train-tire-model', params, {
        timeout: 300000 // 5 minutes for training
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to train tire model: ${error.message}`);
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export default
export default apiService;