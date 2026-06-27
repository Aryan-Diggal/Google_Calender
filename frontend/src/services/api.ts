import axios from 'axios';
import { Event } from '../types/Event';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — force logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const eventService = {
  getAllEvents: async (): Promise<Event[]> => {
    const response = await api.get('/events');
    return response.data;
  },

  getEventsByDateRange: async (startDate: string, endDate: string): Promise<Event[]> => {
    const response = await api.get('/events/range', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getEventById: async (id: number): Promise<Event> => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  getOverlappingEvents: async (startTime: string, endTime: string, excludeId?: number): Promise<Event[]> => {
    const response = await api.get('/events/overlapping', {
      params: { startTime, endTime, ...(excludeId ? { excludeId } : {}) },
    });
    return response.data;
  },

  createEvent: async (event: Omit<Event, 'id'>): Promise<Event> => {
    const response = await api.post('/events', event);
    return response.data;
  },

  updateEvent: async (id: number, event: Partial<Event>): Promise<Event> => {
    const response = await api.put(`/events/${id}`, event);
    return response.data;
  },

  deleteEvent: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};

export const authService = {
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default api;
