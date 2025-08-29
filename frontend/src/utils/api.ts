import axios, { AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  DocumentsResponse, 
  DocumentResponse,
  Document,
  VersionsResponse
} from '@/types';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Allow self-signed certificates in development
  ...(process.env.NODE_ENV === 'development' && {
    httpsAgent: {
      rejectUnauthorized: false
    }
  })
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Documents API
export const documentsAPI = {
  getDocuments: async (): Promise<DocumentsResponse> => {
    const response: AxiosResponse<DocumentsResponse> = await api.get('/documents');
    return response.data;
  },

  getDocument: async (id: string): Promise<DocumentResponse> => {
    const response: AxiosResponse<DocumentResponse> = await api.get(`/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: { title: string; content?: string; isPublic?: boolean }): Promise<{ document: Document }> => {
    const response = await api.post('/documents', data);
    return response.data;
  },

  updateDocument: async (id: string, data: { title?: string; content?: string; isPublic?: boolean }) => {
    const response = await api.put(`/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  getDocumentVersions: async (id: string): Promise<VersionsResponse> => {
    const response: AxiosResponse<VersionsResponse> = await api.get(`/documents/${id}/versions`);
    return response.data;
  },
};

export default api;
