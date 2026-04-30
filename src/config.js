// API Configuration Center
// All API-related URLs should be configured here

export const API_CONFIG = {
  // Base URL for all API requests
  BASE_URL: 'http://192.168.2.117:8000',
  
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout'
  },
  
  // Chat endpoints
  CHAT: {
    HISTORY: '/chat_history',
    ASK: '/ask'
  }
}

// Helper function to get full URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}
