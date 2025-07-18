import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthTokens } from '../../types';
import { authService } from '../../services/authService';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// 異步 thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await authService.login(credentials);
    return response.data;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; password: string; username: string }) => {
    const response = await authService.register(userData);
    return response.data;
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (refreshToken: string) => {
    const response = await authService.refreshToken(refreshToken);
    return response.data;
  }
);

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No token found');
  }
  
  const response = await authService.getCurrentUser();
  return response.data;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
  },
  extraReducers: builder => {
    builder
      // Login
      .addCase(login.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.tokens.accessToken);
        localStorage.setItem('refreshToken', action.payload.tokens.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.tokens.accessToken);
        localStorage.setItem('refreshToken', action.payload.tokens.refreshToken);
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Check Auth
      .addCase(checkAuth.pending, state => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(checkAuth.rejected, state => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(refreshToken.rejected, state => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      // Logout
      .addCase(logout.fulfilled, state => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;