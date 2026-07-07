import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

export interface NotificationItem {
  id: number;
  villaId: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  // Legacy per-villa badge counts (kept for badge display)
  villaNotifications: { [villaId: string]: number };
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  villaNotifications: {},
};

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async () => {
  const data = await apiService.getNotifications();
  return Array.isArray(data) ? data : [];
});

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async () => {
  const data = await apiService.getUnreadCount();
  return typeof data === 'number' ? data : 0;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await apiService.markAllNotificationsRead();
});

export const markOneRead = createAsyncThunk('notifications/markOneRead', async (id: number) => {
  await apiService.markNotificationRead(id);
  return id;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    incrementVillaNotification: (state, action: PayloadAction<string>) => {
      const villaId = action.payload;
      state.villaNotifications[villaId] = (state.villaNotifications[villaId] || 0) + 1;
      state.unreadCount += 1;
    },
    resetVillaNotification: (state, action: PayloadAction<string>) => {
      state.villaNotifications[action.payload] = 0;
    },
    clearAllNotifications: (state) => {
      state.villaNotifications = {};
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.unreadCount = action.payload.filter((n: NotificationItem) => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.items = state.items.map(n => ({ ...n, isRead: true }));
        state.unreadCount = 0;
        state.villaNotifications = {};
      })
      .addCase(markOneRead.fulfilled, (state, action) => {
        const item = state.items.find(n => n.id === action.payload);
        if (item && !item.isRead) {
          item.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const { incrementVillaNotification, resetVillaNotification, clearAllNotifications } =
  notificationsSlice.actions;
export default notificationsSlice.reducer;
