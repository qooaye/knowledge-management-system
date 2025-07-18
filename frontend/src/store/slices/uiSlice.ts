import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotificationItem } from '../../types';

interface UIState {
  sidebarCollapsed: boolean;
  currentTheme: 'light' | 'dark';
  notifications: NotificationItem[];
  loading: {
    [key: string]: boolean;
  };
}

const initialState: UIState = {
  sidebarCollapsed: false,
  currentTheme: 'light',
  notifications: [],
  loading: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: state => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.currentTheme = action.payload;
    },
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        n => n.id !== action.payload
      );
    },
    clearNotifications: state => {
      state.notifications = [];
    },
    setLoading: (
      state,
      action: PayloadAction<{ key: string; loading: boolean }>
    ) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;