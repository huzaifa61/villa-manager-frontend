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
  getPayments: async (villaId: number) => {
    const { data } = await api.get('/v1/villas/' + villaId + '/payments');
    return unwrap(data);
  },
  createPayment: async (villaId: number, apartmentId: number, body: any) => {
    const { data } = await api.post('/v1/villas/' + villaId + '/payments/apartment/' + apartmentId, body);
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
};
