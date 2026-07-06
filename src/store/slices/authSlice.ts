import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';

interface AuthState {
  user: any;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null, accessToken: null,
  isLoading: true, isAuthenticated: false, error: null,
};

export const loginUser = createAsyncThunk('auth/login', async (
  { email, password }: { email: string; password: string }, { rejectWithValue }
) => {
  try {
    const res = await apiService.login(email, password);
    await AsyncStorage.setItem('accessToken', res.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
    return res;
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.error || e?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (
  { fullName, email, password, phoneNumber }: { fullName: string; email: string; password: string; phoneNumber?: string }, { rejectWithValue }
) => {
  try {
    const res = await apiService.register({ fullName, email, password, phoneNumber });
    await AsyncStorage.setItem('accessToken', res.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
    return res;
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Registration failed');
  }
});

export const checkAuth = createAsyncThunk('auth/check', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const user = await AsyncStorage.getItem('user');
    if (token && user) return { accessToken: token, user: JSON.parse(user) };
    return rejectWithValue('No session');
  } catch { return rejectWithValue('Error'); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null; state.accessToken = null;
      state.isAuthenticated = false; state.isLoading = false;
      AsyncStorage.multiRemove(['accessToken', 'user']);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.accessToken = a.payload.accessToken; s.user = a.payload.user;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.isLoading = false; s.error = a.payload as string;
      })
      .addCase(registerUser.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.accessToken = a.payload.accessToken; s.user = a.payload.user;
      })
      .addCase(registerUser.rejected, (s, a) => {
        s.isLoading = false; s.error = a.payload as string;
      })
      .addCase(checkAuth.pending, (s) => { s.isLoading = true; })
      .addCase(checkAuth.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.accessToken = a.payload.accessToken; s.user = a.payload.user;
      })
      .addCase(checkAuth.rejected, (s) => { s.isLoading = false; s.isAuthenticated = false; });
  },
});

export const { logoutUser } = authSlice.actions;
export default authSlice.reducer;
