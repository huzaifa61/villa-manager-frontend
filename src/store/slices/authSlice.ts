import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';

interface AuthState {
  user: any;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  activeVillaId: number | null;
}

const initialState: AuthState = {
  user: null, accessToken: null,
  isLoading: true, isAuthenticated: false, error: null,
  activeVillaId: null,
};

// Helper: resolve villaId after login — GM fetches first villa if none assigned
const resolveActiveVillaId = async (user: any): Promise<number> => {
  // Non-GM users use their assigned villaId directly
  if (user?.role !== 'GENERAL_MANAGER') {
    return user?.villaId || 1;
  }
  // GM: use assigned villaId or fetch first villa
  if (user?.villaId) return user.villaId;
  try {
    const villas = await apiService.getVillas();
    const list = Array.isArray(villas) ? villas : [];
    if (list.length > 0) {
      const id = list[0].id;
      await AsyncStorage.setItem('activeVillaId', String(id));
      return id;
    }
  } catch {}
  return 1; // fallback — GM always lands on dashboard, can switch later
};

export const loginUser = createAsyncThunk('auth/login', async (
  { email, password }: { email: string; password: string }, { rejectWithValue }
) => {
  try {
    const res = await apiService.login(email, password);
    await AsyncStorage.setItem('accessToken', res.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
    const activeVillaId = await resolveActiveVillaId(res.user);
    if (activeVillaId) await AsyncStorage.setItem('activeVillaId', String(activeVillaId));
    return { ...res, activeVillaId };
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
    const activeVillaId = await resolveActiveVillaId(res.user);
    if (activeVillaId) await AsyncStorage.setItem('activeVillaId', String(activeVillaId));
    return { ...res, activeVillaId };
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Registration failed');
  }
});

export const checkAuth = createAsyncThunk('auth/check', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const user = await AsyncStorage.getItem('user');
    const savedVillaId = await AsyncStorage.getItem('activeVillaId');
    if (token && user) {
      const parsedUser = JSON.parse(user);
      const activeVillaId = savedVillaId ? Number(savedVillaId) : (parsedUser?.villaId || null);
      return { accessToken: token, user: parsedUser, activeVillaId };
    }
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
      state.activeVillaId = null;
      AsyncStorage.multiRemove(['accessToken', 'user', 'activeVillaId']);
    },
    setActiveVillaId: (state, action: PayloadAction<number>) => {
      state.activeVillaId = action.payload;
      AsyncStorage.setItem('activeVillaId', String(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.accessToken = a.payload.accessToken;
        s.user = a.payload.user;
        s.activeVillaId = a.payload.activeVillaId;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.isLoading = false; s.error = a.payload as string;
      })
      .addCase(registerUser.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.accessToken = a.payload.accessToken;
        s.user = a.payload.user;
        s.activeVillaId = a.payload.activeVillaId;
      })
      .addCase(registerUser.rejected, (s, a) => {
        s.isLoading = false; s.error = a.payload as string;
      })
      .addCase(checkAuth.pending, (s) => { s.isLoading = true; })
      .addCase(checkAuth.fulfilled, (s, a) => {
        s.isLoading = false; s.isAuthenticated = true;
        s.accessToken = a.payload.accessToken;
        s.user = a.payload.user;
        s.activeVillaId = a.payload.activeVillaId;
      })
      .addCase(checkAuth.rejected, (s) => { s.isLoading = false; s.isAuthenticated = false; });
  },
});

export const { logoutUser, setActiveVillaId } = authSlice.actions;
export default authSlice.reducer;
