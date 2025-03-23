import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://cogniwebsocket.centralindia.cloudapp.azure.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// User API functions
export const getUsers = async () => {
  try {
    const response = await api.get('/api/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUserById = async (userId: string) => {
  try {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

// Server health check
export const checkServerStatus = async () => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Error checking server status:', error);
    throw error;
  }
};

export default api; 