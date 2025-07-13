import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5001') + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Match API
export const matchAPI = {
  // Get potential matches for the current user
  getPotentialMatches: async () => {
    try {
      const response = await api.get('/matches/potential');
      return {
        ...response,
        data: Array.isArray(response.data) ? response.data : []
      };
    } catch (error) {
      console.error('Error getting potential matches:', error);
      return { 
        data: [],
        error: error.response?.data?.error || 'Failed to load potential matches'
      };
    }
  },
  
  // Send or respond to a match request
  respondToMatch: async (userId, status) => {
    try {
      const response = await api.put(`/matches/${userId}/respond`, { status });
      return {
        success: true,
        data: response.data,
        message: response.data?.message || 'Request processed successfully'
      };
    } catch (error) {
      console.error('Error responding to match:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to process your request'
      };
    }
  },
  
  // Get current match status including connections and pending requests
  getMatchStatus: async () => {
    try {
      const response = await api.get('/matches/status');
      return {
        success: true,
        data: {
          connections: Array.isArray(response.data?.connections) ? response.data.connections : [],
          pending: {
            sent: Array.isArray(response.data?.pending?.sent) ? response.data.pending.sent : [],
            received: Array.isArray(response.data?.pending?.received) ? response.data.pending.received : []
          }
        }
      };
    } catch (error) {
      console.error('Error getting match status:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load match status',
        data: {
          connections: [],
          pending: {
            sent: [],
            received: []
          }
        }
      };
    }
  },
  
  // Get all connections for the current user
  getConnections: async () => {
    try {
      const response = await api.get('/matches/connections');
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : []
      };
    } catch (error) {
      console.error('Error getting connections:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load connections',
        data: []
      };
    }
  },
  
  likeUser: async (userId) => {
    try {
      const response = await api.post(`/matches/like/${userId}`);
      return response;
    } catch (error) {
      console.error('Error liking user:', error);
      throw error;
    }
  }
};

// Connection related API calls
export const connectionAPI = {
  getConnections: async () => {
    try {
      const response = await api.get('/matches/connections');
      return response.data?.connections || [];
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  },

  removeConnection: async (userId) => {
    try {
      const response = await api.delete(`/matches/connections/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
  }
};

export default api;
