import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── API Configuration ───────────────────────────────────────────────────────
const RAILWAY_API_URL = 'https://villa-manager-backend-production.up.railway.app/api';

const getBaseUrl = (): string => {
  // EAS APK build: reads from app.config.js extra (baked at build time)
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) return configUrl;

  // Expo Go / web dev: reads from .env
  const envUrl = (process.env as any).EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // Final fallback — always Railway
  return RAILWAY_API_URL;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    // Only logout on 401 (token expired/invalid) — NOT on 403 (permission denied)
    if (error?.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'user', 'activeVillaId']);
      // Only reload on web — not on mobile (window doesn't exist)
      if (typeof window !== 'undefined' && window?.location?.reload) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

const unwrap = (data: any) => data?.data ?? data;

const getCsv = async (url: string) => {
  const { data } = await api.get(url, {
    responseType: 'text',
    headers: { Accept: 'text/csv' },
    transformResponse: [(value) => value],
  });
  return data;
};

export const apiService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/v1/auth/login', { email, password });
    return unwrap(data);
  },
  register: async (body: { fullName: string; email: string; password: string; phoneNumber?: string }) => {
    const { data } = await api.post('/v1/auth/register', body);
    return unwrap(data);
  },
  acceptInvite: async (body: { token: string; fullName: string; password: string; phoneNumber?: string }) => {
    const { data } = await api.post('/v1/auth/accept-invite', body);
    return unwrap(data);
  },
  getUsers: async () => {
    const { data } = await api.get('/v1/users');
    return unwrap(data);
  },
  getVillas: async () => {
    const { data } = await api.get('/v1/villas');
    return unwrap(data);
  },
  createVilla: async (body: any) => {
    const { data } = await api.post('/v1/villas', body);
    return unwrap(data);
  },
  deleteVilla: async (villaId: number) => {
    const { data } = await api.delete('/v1/villas/' + villaId);
    return unwrap(data);
  },
  inviteUser: async (body: { email: string; fullName?: string; phoneNumber?: string; role: string; villaId?: number }) => {
    const { data } = await api.post('/v1/users/invite', body);
    return unwrap(data);
  },
  updateUser: async (userId: number, body: any) => {
    const { data } = await api.put('/v1/users/' + userId, body);
    return unwrap(data);
  },
  deleteUser: async (userId: number) => {
    const { data } = await api.delete('/v1/users/' + userId);
    return unwrap(data);
  },
  getApartments: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/apartments');
    return unwrap(data);
  },
  createApartment: async (villaId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/apartments', body);
    return unwrap(data);
  },
  updateApartment: async (villaId: number, apartmentId: number, body: any) => {
    const { data } = await api.put('/v1/villas/' + villaId + '/apartments/' + apartmentId, body);
    return unwrap(data);
  },
  deleteApartment: async (villaId: number, apartmentId: number) => {
    const { data } = await api.delete('/v1/villas/' + villaId + '/apartments/' + apartmentId);
    return unwrap(data);
  },
  exportApartmentsCsv: async (villaId: number) => getCsv('/v1/villas/' + villaId + '/apartments/export'),
  getPayments: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/payments');
    return unwrap(data);
  },
  createPayment: async (villaId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/payments', body);
    return unwrap(data);
  },
  updatePayment: async (villaId: number, paymentId: number, body: any) => {
    const { data } = await api.put('/v1/villas/' + villaId + '/payments/' + paymentId, body);
    return unwrap(data);
  },
  deletePayment: async (villaId: number, paymentId: number) => {
    const { data } = await api.delete('/v1/villas/' + villaId + '/payments/' + paymentId);
    return unwrap(data);
  },
  exportPaymentsCsv: async (villaId: number) => getCsv('/v1/villas/' + villaId + '/payments/export'),
  getExpenses: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/expenses');
    return unwrap(data);
  },
  createExpense: async (villaId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/expenses', body);
    return unwrap(data);
  },
  updateExpense: async (villaId: number, expenseId: number, body: any) => {
    const { data } = await api.put('/v1/villas/' + villaId + '/expenses/' + expenseId, body);
    return unwrap(data);
  },
  deleteExpense: async (villaId: number, expenseId: number) => {
    const { data } = await api.delete('/v1/villas/' + villaId + '/expenses/' + expenseId);
    return unwrap(data);
  },
  exportExpensesCsv: async (villaId: number) => getCsv('/v1/villas/' + villaId + '/expenses/export'),
  getExpenseTemplates: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/expense-templates');
    return unwrap(data);
  },
  createExpenseTemplate: async (villaId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/expense-templates', body);
    return unwrap(data);
  },
  updateExpenseTemplate: async (villaId: number, templateId: number, body: any) => {
    const { data } = await api.put('/v1/villas/' + villaId + '/expense-templates/' + templateId, body);
    return unwrap(data);
  },
  deleteExpenseTemplate: async (villaId: number, templateId: number) => {
    const { data } = await api.delete('/v1/villas/' + villaId + '/expense-templates/' + templateId);
    return unwrap(data);
  },
  runDueExpenseTemplates: async (villaId: number) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/expense-templates/run-due');
    return unwrap(data);
  },
  getServiceRequests: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/service-requests');
    return unwrap(data);
  },
  createServiceRequest: async (villaId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/service-requests', body);
    return unwrap(data);
  },
  updateServiceRequest: async (villaId: number, requestId: number, body: any) => {
    const { data } = await api.put('/v1/villas/' + villaId + '/service-requests/' + requestId, body);
    return unwrap(data);
  },
  deleteServiceRequest: async (villaId: number, requestId: number) => {
    const { data } = await api.delete('/v1/villas/' + villaId + '/service-requests/' + requestId);
    return unwrap(data);
  },
  getVendors: async () => {
    const { data } = await api.get('/v1/vendors');
    return unwrap(data);
  },
  createVendor: async (body: any) => {
    const { data } = await api.post('/v1/vendors', body);
    return unwrap(data);
  },
  updateVendor: async (vendorId: number, body: any) => {
    const { data } = await api.put('/v1/vendors/' + vendorId, body);
    return unwrap(data);
  },
  deleteVendor: async (vendorId: number) => {
    const { data } = await api.delete('/v1/vendors/' + vendorId);
    return unwrap(data);
  },
  getVilla: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId);
    return unwrap(data);
  },
  updateVilla: async (villaId: number, body: any) => {
    const { data } = await api.put('/v1/villas/' + villaId, body);
    return unwrap(data);
  },
  resetVillaData: async (villaId: number) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/reset-data');
    return unwrap(data);
  },
  savePushToken: async (token: string) => {
    const { data } = await api.post('/v1/users/push-token', { token });
    return unwrap(data);
  },
  updateUserSubscription: async (userId: number, body: { subscriptionExpiresAt: string; maxViewers: number }) => {
    const { data } = await api.put(`/v1/users/${userId}/subscription`, body);
    return unwrap(data);
  },
  revokeUserSubscription: async (userId: number) => {
    const { data } = await api.delete(`/v1/users/${userId}/subscription`);
    return unwrap(data);
  },
  getNotifications: async () => {
    const { data } = await api.get('/v1/notifications');
    return unwrap(data);
  },
  getUnreadCount: async () => {
    const { data } = await api.get('/v1/notifications/unread-count');
    return unwrap(data);
  },
  markAllNotificationsRead: async () => {
    const { data } = await api.post('/v1/notifications/mark-all-read');
    return unwrap(data);
  },
  markNotificationRead: async (id: number) => {
    const { data } = await api.post('/v1/notifications/' + id + '/read');
    return unwrap(data);
  },
};
