import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api';
  return 'http://localhost:8080/api';
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
  (error) => Promise.reject(error)
);

const unwrap = (data: any) => data?.data ?? data;

export const apiService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/v1/auth/login', { email, password });
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
  getPayments: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/payments');
    return unwrap(data);
  },
  createPayment: async (villaId: number, apartmentId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/payments/apartment/' + apartmentId, body);
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
};
