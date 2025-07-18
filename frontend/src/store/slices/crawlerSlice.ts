import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CrawlerTask, CrawlerResult, CrawlerStatus } from '../../types';
import { crawlerService } from '../../services/crawlerService';

interface CrawlerState {
  tasks: CrawlerTask[];
  currentTask: CrawlerTask | null;
  results: CrawlerResult[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

const initialState: CrawlerState = {
  tasks: [],
  currentTask: null,
  results: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false,
  },
};

// 異步 thunks
export const fetchTasks = createAsyncThunk(
  'crawler/fetchTasks',
  async (params: { page?: number; limit?: number; status?: CrawlerStatus }) => {
    const response = await crawlerService.getTasks(params);
    return response.data;
  }
);

export const fetchTask = createAsyncThunk(
  'crawler/fetchTask',
  async (id: string) => {
    const response = await crawlerService.getTask(id);
    return response.data;
  }
);

export const createTask = createAsyncThunk(
  'crawler/createTask',
  async (taskData: Omit<CrawlerTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const response = await crawlerService.createTask(taskData);
    return response.data;
  }
);

export const startTask = createAsyncThunk(
  'crawler/startTask',
  async (id: string) => {
    const response = await crawlerService.startTask(id);
    return response.data;
  }
);

export const stopTask = createAsyncThunk(
  'crawler/stopTask',
  async (id: string) => {
    const response = await crawlerService.stopTask(id);
    return response.data;
  }
);

export const fetchTaskResults = createAsyncThunk(
  'crawler/fetchTaskResults',
  async (params: { taskId: string; page?: number; limit?: number }) => {
    const response = await crawlerService.getTaskResults(params);
    return response.data;
  }
);

const crawlerSlice = createSlice({
  name: 'crawler',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setCurrentTask: (state, action: PayloadAction<CrawlerTask | null>) => {
      state.currentTask = action.payload;
    },
    updateTaskStatus: (
      state,
      action: PayloadAction<{ id: string; status: CrawlerStatus; progress?: number }>
    ) => {
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
        if (action.payload.progress !== undefined) {
          task.progress = action.payload.progress;
        }
      }
      
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask.status = action.payload.status;
        if (action.payload.progress !== undefined) {
          state.currentTask.progress = action.payload.progress;
        }
      }
    },
    addResult: (state, action: PayloadAction<CrawlerResult>) => {
      state.results.unshift(action.payload);
    },
  },
  extraReducers: builder => {
    builder
      // Fetch Tasks
      .addCase(fetchTasks.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        const { data, total, page, limit, hasMore } = action.payload;
        
        if (page === 1) {
          state.tasks = data;
        } else {
          state.tasks = [...state.tasks, ...data];
        }
        
        state.pagination = { total, page, limit, hasMore };
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      })
      // Fetch Task
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.currentTask = action.payload;
      })
      // Create Task
      .addCase(createTask.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.unshift(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create task';
      })
      // Start Task
      .addCase(startTask.fulfilled, (state, action) => {
        const task = state.tasks.find(t => t.id === action.payload.id);
        if (task) {
          task.status = action.payload.status;
          task.progress = action.payload.progress;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      // Stop Task
      .addCase(stopTask.fulfilled, (state, action) => {
        const task = state.tasks.find(t => t.id === action.payload.id);
        if (task) {
          task.status = action.payload.status;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      // Fetch Task Results
      .addCase(fetchTaskResults.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskResults.fulfilled, (state, action) => {
        state.loading = false;
        const { data, page } = action.payload;
        
        if (page === 1) {
          state.results = data;
        } else {
          state.results = [...state.results, ...data];
        }
      })
      .addCase(fetchTaskResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch results';
      });
  },
});

export const { clearError, setCurrentTask, updateTaskStatus, addResult } = crawlerSlice.actions;
export default crawlerSlice.reducer;