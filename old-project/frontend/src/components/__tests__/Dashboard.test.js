import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';

// Mock React Router
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

// Mock API service
jest.mock('../../services/apiService', () => ({
  fetchSchedule: jest.fn(() => 
    Promise.resolve({
      events: [
        {
          event_name: 'Test Grand Prix',
          location: 'Test Circuit',
          event_date: '2024-12-01',
          sessions: [
            { session_name: 'Practice 1', session_type: 'practice', date_start: '2024-12-01T10:00:00Z' },
            { session_name: 'Qualifying', session_type: 'qualifying', date_start: '2024-12-01T14:00:00Z' }
          ]
        }
      ]
    })
  ),
  fetchCurrentSession: jest.fn(() => 
    Promise.resolve({
      current_session: null,
      next_session: {
        event_name: 'Next Grand Prix',
        session_name: 'Practice 1',
        starts_in: '2 days'
      }
    })
  )
}));

// Mock components that might cause issues in testing
jest.mock('../WeatherWidget', () => {
  return function WeatherWidget() {
    return <div data-testid="weather-widget">Weather Widget</div>;
  };
});

jest.mock('../PodiumPreview', () => {
  return function PodiumPreview() {
    return <div data-testid="podium-preview">Podium Preview</div>;
  };
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders dashboard title', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/F1 AI Pitwall/i)).toBeInTheDocument();
    });
  });

  test('renders loading state initially', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  test('displays schedule data when loaded', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Grand Prix')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Circuit')).toBeInTheDocument();
  });

  test('displays session information', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Practice 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Qualifying')).toBeInTheDocument();
  });

  test('renders weather widget', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
    });
  });

  test('renders podium preview', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('podium-preview')).toBeInTheDocument();
    });
  });
});